"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import { useAdaptiveSpatialQuality } from "@/spatial/performance/useAdaptiveSpatialQuality";
import { homeJourneyHref } from "@/spatial/navigation/homeSkyInteraction";
import { withLifeMapSelectionIdentity } from "@/spatial/memory/lifeMapSelectionJourney";
import { forwardPrivateMovieRouteSelection } from "@/spatial/life-movie/privateLifeMovieRouteSelection";
import { useLifeMapEvents, type LifeMapSourceMode } from "./useLifeMapEvents";
import type { LifeMapNode } from "./lifeMapData";
import { LifeMapProductionWorld, type LifeMapJourneyPhase } from "./LifeMapProductionWorld";
import { artifactFamilyLabel, resolveArtifactFamily } from "./lifeMapVisualSystem";
import AdamLauncherSlot from "@/spatial/adam/AdamLauncherSlot";
import { advanceLifeMapFlight, lifeMapFlightLookTarget, type LifeMapFlightInput, type LifeMapFlightPose } from "./lifeMapFlight.mjs";

const OVERVIEW_POSITION: [number, number, number] = [0, 1.55, 13.4];
const OVERVIEW_TARGET: [number, number, number] = [0, 0.12, -4.5];
const SELECTED_MEMORY_STANDOFF = 5.8;
const PHASE_DURATION_MS = { departure: 280, travel: 720, approach: 820 } as const;

type JourneyPhase = "overview" | "departure" | "travel" | "approach" | "arrival";
type WebGLState = "ready" | "lost" | "recovering" | "failed";
type CameraGoal = { position: [number, number, number]; target: [number, number, number] };

function safeToken(value: string | null, fallback = "") {
  return (value || fallback).replace(/[^a-zA-Z0-9:_-]/g, "").slice(0, 120);
}

function tuple(vector: THREE.Vector3): [number, number, number] {
  return [vector.x, vector.y, vector.z];
}

function selectedStagePoint(node: LifeMapNode, portrait: boolean) {
  const scale = portrait ? new THREE.Vector3(0.92, 0.96, 0.92) : new THREE.Vector3(1.12, 1.12, 1.08);
  const position = portrait ? new THREE.Vector3(0, -0.08, 0.9) : new THREE.Vector3(0, -0.16, 0.62);
  return new THREE.Vector3(...node.position).multiply(scale).add(position);
}

function goalForNode(node: LifeMapNode, phase: JourneyPhase, portrait: boolean, departureFrom?: THREE.Vector3): CameraGoal {
  const target = selectedStagePoint(node, portrait);
  const overview = departureFrom?.clone() ?? new THREE.Vector3(...OVERVIEW_POSITION);
  const direction = overview.clone().sub(target);
  if (direction.lengthSq() < 0.01) direction.set(0, 0.1, 1);
  direction.normalize();
  const arrival = target.clone().addScaledVector(direction, SELECTED_MEMORY_STANDOFF);
  arrival.y += 0.34;
  if (phase === "departure") return { position: tuple(overview), target: tuple(target) };
  if (phase === "travel") {
    const travel = overview.clone().lerp(arrival, 0.5);
    travel.x += (Math.sign(target.x) || 1) * 1.25;
    travel.y += 1.2;
    return { position: tuple(travel), target: tuple(target) };
  }
  if (phase === "approach") {
    const approach = target.clone().addScaledVector(direction, SELECTED_MEMORY_STANDOFF + 2.1);
    approach.y += 0.7;
    return { position: tuple(approach), target: tuple(target) };
  }
  return { position: tuple(arrival), target: tuple(target) };
}

function CameraRig({ selected, phase, reducedMotion, shellRef }: { selected: LifeMapNode | null; phase: JourneyPhase; reducedMotion: boolean; shellRef: RefObject<HTMLElement | null> }) {
  const { camera, size, gl } = useThree();
  const initialized = useRef(false);
  const positionGoal = useRef(new THREE.Vector3());
  const targetGoal = useRef(new THREE.Vector3());
  const lookTarget = useRef(new THREE.Vector3(...OVERVIEW_TARGET));
  const flight = useRef<LifeMapFlightPose>({
    position: [...OVERVIEW_POSITION], velocity: [0, 0, 0], yaw: 0, pitch: -0.075,
  });
  const keys = useRef(new Set<string>());
  const pointer = useRef<{ id: number; x: number; y: number; startX: number; startY: number; dragged: boolean } | null>(null);
  const lookDelta = useRef({ x: 0, y: 0 });
  const wasOverview = useRef(true);
  const departureOrigin = useRef(new THREE.Vector3(...OVERVIEW_POSITION));
  const selectedJourneyId = useRef<string | null>(null);

  const resolve = useCallback(() => {
    const portrait = size.height > size.width;
    const goal = selected ? goalForNode(selected, phase, portrait, departureOrigin.current) : { position: OVERVIEW_POSITION, target: OVERVIEW_TARGET };
    positionGoal.current.set(...goal.position);
    targetGoal.current.set(...goal.target);
    if (portrait) {
      if (phase === "overview") {
        positionGoal.current.set(0, 2.15, 16.6);
        targetGoal.current.set(0, 0.2, -4.6);
      } else if (phase !== "departure") {
        // Departure must begin at the precise explored camera location even in portrait.
        const offset = positionGoal.current.clone().sub(targetGoal.current).multiplyScalar(1.34);
        positionGoal.current.copy(targetGoal.current).add(offset);
        positionGoal.current.y += 0.42;
      }
    }
    return portrait;
  }, [phase, selected, size.height, size.width]);

  useLayoutEffect(() => {
    if (initialized.current) return;
    const portrait = resolve();
    camera.position.copy(positionGoal.current);
    lookTarget.current.copy(targetGoal.current);
    camera.lookAt(lookTarget.current);
    flight.current.position = camera.position.toArray();
    const bearing = lookTarget.current.clone().sub(camera.position).normalize();
    flight.current.yaw = Math.atan2(bearing.x, -bearing.z);
    flight.current.pitch = Math.asin(THREE.MathUtils.clamp(bearing.y, -1, 1));
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = portrait ? (phase === "overview" ? 55 : 57) : (phase === "arrival" ? 44 : 46);
      camera.updateProjectionMatrix();
    }
    initialized.current = true;
  }, [camera, phase, resolve]);

  useEffect(() => {
    const canvas = gl.domElement;
    const editable = (target: EventTarget | null) => target instanceof HTMLElement &&
      Boolean(target.closest("input, textarea, select, button, a, [contenteditable='true'], [role='dialog']"));
    const keyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || editable(event.target) || event.altKey || event.ctrlKey || event.metaKey) return;
      // Do not hijack keyboard navigation when search, dialogs or other controls own focus.
      if (document.activeElement !== canvas && document.activeElement !== document.body) return;
      if (/^(Key[WASDQE]|Arrow(Up|Down|Left|Right)|ShiftLeft|ShiftRight)$/.test(event.code)) {
        keys.current.add(event.code);
        if (document.activeElement === canvas || document.activeElement === document.body) event.preventDefault();
      }
    };
    const keyUp = (event: KeyboardEvent) => keys.current.delete(event.code);
    const clear = () => {
      keys.current.clear(); pointer.current = null; lookDelta.current = { x: 0, y: 0 };
      if (shellRef.current) shellRef.current.dataset.lifeMapFlightControl = "";
    };
    const clearWhenHidden = () => { if (document.hidden) clear(); };
    const down = (event: PointerEvent) => {
      if (event.button !== 0 || event.target !== canvas || selected) return;
      // Do not capture on pointer-down: R3F memory stars must receive normal clicks.
      // Capture only an intentional look drag after crossing the movement threshold.
      pointer.current = {
        id: event.pointerId, x: event.clientX, y: event.clientY,
        startX: event.clientX, startY: event.clientY, dragged: false,
      };
    };
    const move = (event: PointerEvent) => {
      const last = pointer.current;
      if (!last || last.id !== event.pointerId || selected) return;
      if (!last.dragged && Math.hypot(event.clientX - last.startX, event.clientY - last.startY) < 6) return;
      if (!last.dragged) {
        // A normal tap/click still selects the exact star; deliberate drag owns look.
        canvas.setPointerCapture(event.pointerId);
      }
      const dx = event.clientX - last.x, dy = event.clientY - last.y;
      lookDelta.current.x += THREE.MathUtils.clamp(dx * 0.0025, -0.15, 0.15);
      lookDelta.current.y -= THREE.MathUtils.clamp(dy * 0.0025, -0.15, 0.15);
      pointer.current = { ...last, x: event.clientX, y: event.clientY, dragged: true };
    };
    const end = (event: PointerEvent) => {
      if (pointer.current?.id === event.pointerId) pointer.current = null;
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    };
    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
    window.addEventListener("blur", clear);
    document.addEventListener("visibilitychange", clearWhenHidden);
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", end);
    canvas.addEventListener("pointercancel", end);
    return () => {
      clear();
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
      window.removeEventListener("blur", clear);
      document.removeEventListener("visibilitychange", clearWhenHidden);
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", end);
      canvas.removeEventListener("pointercancel", end);
    };
  }, [gl, selected]);

  useFrame((_, delta) => {
    // Capture each selected journey once, at the camera position actually explored.
    // Do not retarget later phases to the static first-mount overview origin.
    if (selected?.id !== selectedJourneyId.current) {
      if (selected) departureOrigin.current.copy(camera.position);
      selectedJourneyId.current = selected?.id ?? null;
    }
    const portrait = resolve();
    const shell = shellRef.current;
    if (phase === "overview" && !selected) {
      if (!wasOverview.current) {
        // Re-enter explorer mode at the actual camera location, not an overview snap.
        const direction = lookTarget.current.clone().sub(camera.position).normalize();
        flight.current = {
          position: camera.position.toArray(), velocity: [0, 0, 0],
          yaw: Math.atan2(direction.x, -direction.z),
          pitch: Math.asin(THREE.MathUtils.clamp(direction.y, -1, 1)),
        };
      }
      const held = keys.current;
      const virtual = shell?.dataset.lifeMapFlightControl || "";
      const active = (name: string) => held.has(name) || virtual === name;
      const input: LifeMapFlightInput = {
        forward: Number(active("KeyW") || active("ArrowUp")) - Number(active("KeyS") || active("ArrowDown")),
        strafe: Number(active("KeyD")) - Number(active("KeyA")),
        vertical: Number(active("KeyE")) - Number(active("KeyQ")),
        turn: Number(active("ArrowRight")) - Number(active("ArrowLeft")),
        sprint: held.has("ShiftLeft") || held.has("ShiftRight"),
        // Reduced motion still permits deliberate looking and accessible navigation;
        // the kernel avoids easing when that preference is enabled.
        lookX: lookDelta.current.x,
        lookY: lookDelta.current.y,
        reducedMotion,
      };
      lookDelta.current = { x: 0, y: 0 };
      flight.current = advanceLifeMapFlight(flight.current, input, delta);
      const position = flight.current.position;
      const target = lifeMapFlightLookTarget(flight.current);
      camera.position.set(position[0], position[1], position[2]);
      lookTarget.current.set(target[0], target[1], target[2]);
      if (shell) shell.dataset.lifeMapExplorerActive = "true";
    } else {
      const rate = phase === "travel" ? 1.9 : phase === "approach" ? 2.9 : phase === "arrival" ? 5.2 : 4.1;
      if (reducedMotion) {
        camera.position.copy(positionGoal.current);
        lookTarget.current.copy(targetGoal.current);
      } else {
        camera.position.x = THREE.MathUtils.damp(camera.position.x, positionGoal.current.x, rate, delta);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, positionGoal.current.y, rate, delta);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, positionGoal.current.z, rate, delta);
        lookTarget.current.x = THREE.MathUtils.damp(lookTarget.current.x, targetGoal.current.x, 5.6, delta);
        lookTarget.current.y = THREE.MathUtils.damp(lookTarget.current.y, targetGoal.current.y, 5.6, delta);
        lookTarget.current.z = THREE.MathUtils.damp(lookTarget.current.z, targetGoal.current.z, 5.6, delta);
      }
      if (shell) shell.dataset.lifeMapExplorerActive = "false";
    }
    wasOverview.current = phase === "overview" && !selected;
    camera.lookAt(lookTarget.current);
    if (camera instanceof THREE.PerspectiveCamera) {
      const fov = portrait ? (phase === "overview" ? 55 : 57) : (phase === "arrival" ? 44 : 46);
      camera.fov = reducedMotion ? fov : THREE.MathUtils.damp(camera.fov, fov, 4.6, delta);
      camera.updateProjectionMatrix();
    }
    if (shell) {
      shell.dataset.lifeMapCameraX = camera.position.x.toFixed(4);
      shell.dataset.lifeMapCameraY = camera.position.y.toFixed(4);
      shell.dataset.lifeMapCameraZ = camera.position.z.toFixed(4);
      shell.dataset.lifeMapTargetX = lookTarget.current.x.toFixed(4);
      shell.dataset.lifeMapTargetY = lookTarget.current.y.toFixed(4);
      shell.dataset.lifeMapTargetZ = lookTarget.current.z.toFixed(4);
      shell.dataset.lifeMapFov = camera instanceof THREE.PerspectiveCamera ? camera.fov.toFixed(3) : "46";
    }
  });
  return null;
}

function WebGLRecoveryBridge({ onStateChange }: { onStateChange: (state: WebGLState) => void }) {
  const { gl } = useThree();
  useEffect(() => {
    const canvas = gl.domElement;
    let timer: number | null = null;
    let frameProofObserver: MutationObserver | null = null;
    const clearFrameProofObserver = () => {
      frameProofObserver?.disconnect();
      frameProofObserver = null;
    };
    const clearRecoveryTimer = () => {
      if (timer === null) return;
      window.clearTimeout(timer);
      timer = null;
    };
    const lost = (event: Event) => {
      event.preventDefault();
      clearRecoveryTimer();
      clearFrameProofObserver();
      onStateChange("lost");
      timer = window.setTimeout(() => {
        timer = null;
        onStateChange("recovering");
      }, 250);
    };
    const watchForWorldFrame = (invalidatePreviousProof: boolean) => {
      clearRecoveryTimer();
      clearFrameProofObserver();
      // Even a newly mounted canvas has not necessarily drawn the galaxy.
      // Context restoration also needs a new frame, not old counters.
      onStateChange("recovering");
      const owner = canvas.closest<HTMLElement>('[data-testid="urai-true-3d-life-map"]');
      if (!owner) return;
      if (invalidatePreviousProof) owner.dataset.lifeMapRenderReady = "false";
      const acceptFreshFrame = () => {
        if (gl.getContext().isContextLost() || owner.dataset.lifeMapRenderReady !== "true") return;
        clearFrameProofObserver();
        onStateChange("ready");
      };
      frameProofObserver = new MutationObserver(acceptFreshFrame);
      frameProofObserver.observe(owner, { attributes: true, attributeFilter: ["data-life-map-render-ready"] });
      // On first mount, the source-owned proof may already have published.
      // Recheck after subscribing to avoid missing that publication.
      acceptFreshFrame();
    };
    const restored = () => watchForWorldFrame(true);
    canvas.addEventListener("webglcontextlost", lost, false);
    canvas.addEventListener("webglcontextrestored", restored, false);
    // A newly mounted canvas must not inherit a prior canvas's ready flag.
    watchForWorldFrame(true);
    return () => {
      clearRecoveryTimer();
      clearFrameProofObserver();
      canvas.removeEventListener("webglcontextlost", lost, false);
      canvas.removeEventListener("webglcontextrestored", restored, false);
    };
  }, [gl, onStateChange]);
  return null;
}

function isSoftwareWebGLRenderer(gl: THREE.WebGLRenderer) {
  const context = gl.getContext();
  const debugInfo = context.getExtension("WEBGL_debug_renderer_info") as { UNMASKED_RENDERER_WEBGL?: number } | null;
  const renderer = debugInfo?.UNMASKED_RENDERER_WEBGL
    ? context.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
    : context.getParameter(context.RENDERER);
  return /swiftshader|llvmpipe|lavapipe|software/i.test(String(renderer || ""));
}

function SoftwareRendererCadence({ active, documentVisible }: { active: boolean; documentVisible: boolean }) {
  const { invalidate, setFrameloop } = useThree();
  useEffect(() => {
    if (!active) {
      setFrameloop(documentVisible ? "always" : "never");
      return;
    }
    if (!documentVisible) {
      setFrameloop("never");
      return;
    }

    // SwiftShader/software WebGL must remain truly 3D without monopolizing the main thread.
    // Bootstrap enough real frames for render proof, then sustain a bounded ten-FPS cadence.
    setFrameloop("demand");
    let disposed = false;
    const bootstrap = [0, 40, 80, 120, 180, 260].map((delay) => window.setTimeout(() => {
      if (!disposed) invalidate();
    }, delay));
    const interval = window.setInterval(() => {
      if (!disposed) invalidate();
    }, 100);
    return () => {
      disposed = true;
      bootstrap.forEach((timer) => window.clearTimeout(timer));
      window.clearInterval(interval);
    };
  }, [active, documentVisible, invalidate, setFrameloop]);
  return null;
}

function truthLabel(sourceMode: LifeMapSourceMode) {
  if (sourceMode === "explicit-demo") return "Disclosed sample universe · not your memories";
  if (sourceMode === "signed-out") return "Signed out · no personal data displayed";
  if (sourceMode === "empty") return "Private universe ready for its first memory";
  if (sourceMode === "unavailable") return "Private memory service resting safely";
  if (sourceMode === "error") return "Private memory data could not be opened";
  return "Private universe";
}

function phaseLabel(phase: JourneyPhase) {
  if (phase === "overview") return "Cosmic overview";
  if (phase === "departure") return "Leaving overview";
  if (phase === "travel") return "Traveling the memory field";
  if (phase === "approach") return "Entering the chapter";
  return "At the selected Memory Star";
}

export default function ComposedLifeMapScene({ authenticatedUserId }: { authenticatedUserId: string | null }) {
  const router = useRouter();
  const params = useSearchParams();
  const adaptiveProfile = useAdaptiveSpatialQuality();
  const [softwareRenderer, setSoftwareRenderer] = useState(false);
  const profile = useMemo(() => ({
    ...adaptiveProfile,
    tier: softwareRenderer ? "low" as const : adaptiveProfile.tier === "high" ? "medium" as const : adaptiveProfile.tier,
    pixelRatioMax: softwareRenderer ? 1 : Math.min(adaptiveProfile.pixelRatioMax, 1.25),
    shadows: false,
    postprocessing: false,
    antialias: false,
  }), [adaptiveProfile, softwareRenderer]);
  const explicitDemoRequested = params.get("demo") === "1";
  const overviewRequested = params.get("overview") === "1";
  const { nodes, loading, sourceMode } = useLifeMapEvents(explicitDemoRequested ? "demo-user" : authenticatedUserId ?? undefined);
  const queryNode = safeToken(params.get("node") || params.get("memoryId"));
  const [selectedId, setSelectedId] = useState<string | null>(overviewRequested ? null : queryNode || null);
  const [phase, setPhase] = useState<JourneyPhase>("overview");
  const [webglState, setWebglState] = useState<WebGLState>("recovering");
  const journeyToken = useRef(0);
  const shellRef = useRef<HTMLElement | null>(null);
  const localSelectionId = useRef<string | null>(null);
  const overviewPending = useRef(overviewRequested);
  const restoredRoutePending = useRef(Boolean(!overviewRequested && queryNode));
  const selected = useMemo(() => nodes.find((node) => node.id === selectedId) || null, [nodes, selectedId]);

  const withIdentity = useCallback((next: URLSearchParams, memoryId?: string) => withLifeMapSelectionIdentity(params, next, memoryId), [params]);

  const returnHome = useCallback(() => {
    router.push(homeJourneyHref("/home", params.toString()));
  }, [params, router]);

  useEffect(() => {
    if (!selected || phase === "overview" || phase === "arrival") return;
    if (profile.reducedMotion) {
      journeyToken.current += 1;
      setPhase("arrival");
      return;
    }
    const token = journeyToken.current;
    const timeout = window.setTimeout(() => {
      if (token !== journeyToken.current) return;
      if (phase === "departure") setPhase("travel");
      if (phase === "travel") setPhase("approach");
      if (phase === "approach") setPhase("arrival");
    }, PHASE_DURATION_MS[phase]);
    return () => window.clearTimeout(timeout);
  }, [phase, profile.reducedMotion, selected]);

  const selectNode = useCallback((node: LifeMapNode) => {
    restoredRoutePending.current = false;
    overviewPending.current = false;
    localSelectionId.current = node.id;
    journeyToken.current += 1;
    setSelectedId(node.id);
    if (profile.reducedMotion) setPhase("arrival");
    else setPhase("departure");
    const next = withIdentity(new URLSearchParams(), node.id);
    next.set("node", node.id);
    if (explicitDemoRequested) next.set("memoryId", node.id);
    else if (node.authorizedMemory && node.memoryId) next.set("memoryId", node.memoryId);
    else next.delete("memoryId");
    // Route metadata is not access authority. Never carry an unrelated private
    // manifest forward, even if a star ID happens to match an older memory ID.
    if (!explicitDemoRequested) {
      next.delete("manifestId");
      if (node.authorizedMemory && node.replayManifestId) next.set("manifestId", node.replayManifestId);
    }
    // Forward only this already-selected owner's exact movie and plan pair.
    // Neither route metadata nor this source-side flag grants Studio authority.
    if (!explicitDemoRequested && node.authorizedMemory && !node.locked && node.memoryId && node.replayManifestId) {
      forwardPrivateMovieRouteSelection(next, params, {
        memoryId: node.memoryId, manifestId: node.replayManifestId,
        authorizedOwner: true, demo: false,
      });
    }
    if (node.eraId) next.set("era", node.eraId);
    router.replace(`/life-map?${next.toString()}`, { scroll: false });
  }, [explicitDemoRequested, params, profile.reducedMotion, router, withIdentity]);

  const overview = useCallback(() => {
    const retainedId = selectedId || queryNode;
    restoredRoutePending.current = false;
    overviewPending.current = true;
    localSelectionId.current = null;
    journeyToken.current += 1;
    setSelectedId(null);
    setPhase("overview");
    const next = withIdentity(new URLSearchParams(), retainedId || undefined);
    if (retainedId) {
      const retainedNode = nodes.find((node) => node.id === retainedId);
      next.set("node", retainedId);
      if (explicitDemoRequested) next.set("memoryId", retainedId);
      else if (retainedNode?.authorizedMemory && retainedNode.memoryId) next.set("memoryId", retainedNode.memoryId);
      else next.delete("memoryId");
    }
    if (!explicitDemoRequested) {
      next.delete("manifestId");
      const retainedNode = nodes.find((node) => node.id === retainedId);
      if (retainedNode?.authorizedMemory && retainedNode.replayManifestId) next.set("manifestId", retainedNode.replayManifestId);
    }
    next.set("overview", "1");
    router.replace(`/life-map?${next.toString()}`, { scroll: false });
  }, [explicitDemoRequested, nodes, queryNode, router, selectedId, withIdentity]);

  const destinationHref = useCallback((route: "focus" | "replay") => {
    if (!selected) return "/life-map";
    const next = withIdentity(new URLSearchParams(), selected.id);
    next.set("node", selected.id);
    if (explicitDemoRequested) next.set("memoryId", selected.id);
    else if (selected.authorizedMemory && selected.memoryId) next.set("memoryId", selected.memoryId);
    else next.delete("memoryId");
    if (!explicitDemoRequested) {
      next.delete("manifestId");
      if (selected.authorizedMemory && selected.replayManifestId) next.set("manifestId", selected.replayManifestId);
    }
    if (!explicitDemoRequested && selected.authorizedMemory && !selected.locked &&
        selected.memoryId && selected.replayManifestId) {
      forwardPrivateMovieRouteSelection(next, params, {
        memoryId: selected.memoryId, manifestId: selected.replayManifestId,
        authorizedOwner: true, demo: false,
      });
    }
    next.set("returnNode", selected.id);
    next.set("artifactFamily", resolveArtifactFamily(selected));
    next.set("from", "life-map");
    if (route === "focus" && phase === "arrival") {
      const shell = shellRef.current;
      const values = shell?.dataset;
      const camera = values ? [values.lifeMapCameraX, values.lifeMapCameraY, values.lifeMapCameraZ] : [];
      const target = values ? [values.lifeMapTargetX, values.lifeMapTargetY, values.lifeMapTargetZ] : [];
      if (camera.every(Boolean) && target.every(Boolean)) {
        next.set("entryCamera", camera.join(","));
        next.set("entryTarget", target.join(","));
        if (values?.lifeMapFov) next.set("entryFov", values.lifeMapFov);
        next.set("cameraCheckpoint", `life-map-arrival:${selected.id}`);
      }
    }
    return `/${route}?${next.toString()}`;
  }, [explicitDemoRequested, params, phase, selected, withIdentity]);

  useEffect(() => {
    if (!overviewRequested) return;
    restoredRoutePending.current = false;
    overviewPending.current = false;
    journeyToken.current += 1;
    setSelectedId((current) => current === null ? current : null);
    setPhase((current) => current === "overview" ? current : "overview");
  }, [overviewRequested]);

  useEffect(() => {
    if (overviewRequested || overviewPending.current || !queryNode || !nodes.length) return;
    const node = nodes.find((candidate) => candidate.id === queryNode);
    if (!node) return;
    if (localSelectionId.current === node.id) {
      // Same-route URL synchronization for a locally initiated selection must not
      // collapse departure/travel/approach into restored-route arrival.
      return;
    }
    if (selectedId === node.id) {
      if (phase === "overview") {
        journeyToken.current += 1;
        setPhase("arrival");
      }
      restoredRoutePending.current = false;
      return;
    }
    restoredRoutePending.current = false;
    journeyToken.current += 1;
    setSelectedId(node.id);
    setPhase("arrival");
  }, [nodes, overviewRequested, phase, queryNode, selectedId]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.key !== "Escape" || (event.target instanceof HTMLElement && event.target.matches("input,textarea,select,[role='textbox']"))) return;
      if (document.querySelector('#life-map-navigator, [role="dialog"][aria-modal="true"], [data-urai-adam-presence]')) return;
      event.preventDefault();
      if (selectedId) overview(); else returnHome();
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [overview, returnHome, selectedId]);

  useEffect(() => () => { document.body.style.cursor = ""; }, []);

  const recovery = webglState !== "ready";
  const thresholdsVisible = Boolean(selected);
  return <main
    ref={shellRef}
    aria-label="URAI Life Map"
    className="life-map-root"
    style={{ position: "fixed", inset: 0, width: "100vw", height: "100svh", minWidth: "100vw", minHeight: "100svh", overflow: "hidden", opacity: 1, visibility: "visible", background: "#02050b" }}
    data-testid="urai-true-3d-life-map"
    data-spatial-visible="true"
    data-life-map-source={sourceMode}
    data-life-map-phase={phase}
    data-life-map-mode={selected ? "selected" : "overview"}
    data-life-map-scale={selected ? phase === "arrival" ? "intimate" : "regional" : "cosmic"}
    data-life-map-production-world="true"
    data-webgl-state={webglState}
    data-software-renderer={softwareRenderer ? "true" : "false"}
    data-software-render-cadence={softwareRenderer ? "bounded-demand-10fps" : "continuous"}
    data-home-companion-owned="false"
  >
    <h1 className="sr-only">URAI Life Map private universe</h1>
    <span className="life-map-depth-contract" data-depth-band="near" aria-hidden="true" />
    <span className="life-map-depth-contract" data-depth-band="middle" aria-hidden="true" />
    <span className="life-map-depth-contract" data-depth-band="far" aria-hidden="true" />
    <Canvas
      camera={{ position: OVERVIEW_POSITION, fov: 46, near: 0.08, far: 140 }}
      dpr={[1, profile.pixelRatioMax]}
      shadows={profile.shadows}
      frameloop={profile.documentVisible ? "always" : "never"}
      gl={{ antialias: profile.antialias, powerPreference: "high-performance", alpha: false }}
      onCreated={({ gl }) => {
        setSoftwareRenderer(isSoftwareWebGLRenderer(gl));
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.15;
        gl.outputColorSpace = THREE.SRGBColorSpace;
        gl.setClearColor("#02050b", 1);
      }}
    >
      <SoftwareRendererCadence active={softwareRenderer} documentVisible={profile.documentVisible} />
      <WebGLRecoveryBridge onStateChange={setWebglState} />
      <Suspense fallback={null}>
        <LifeMapProductionWorld
          nodes={nodes}
          selected={selected}
          phase={phase as LifeMapJourneyPhase}
          profile={profile}
          onSelect={selectNode}
          cameraRig={<CameraRig selected={selected} phase={phase} reducedMotion={profile.reducedMotion} shellRef={shellRef} />}
          webglRecovery={null}
        />
      </Suspense>
    </Canvas>

    <header className="life-map-title">
      <span>URAI · LIFE MAP</span>
      <strong>{selected ? selected.locked ? "Protected memory" : selected.title : "Your living universe"}</strong>
      <em>{truthLabel(sourceMode)}</em>
    </header>

    <div className="life-map-status" role="status" aria-live="polite">
      <span>{loading ? "Opening universe" : phaseLabel(phase)}</span>
      <small>{selected ? `${artifactFamilyLabel(selected)} · ${selected.dateLabel}` : "Identity · chapters · relationships · future"}</small>
    </div>

    {thresholdsVisible ? <nav className="life-map-thresholds" aria-label="Selected memory actions" data-family={resolveArtifactFamily(selected!)}>
      <button className="focus-threshold" data-destination-href={destinationHref("focus")} disabled={(!explicitDemoRequested && !selected!.authorizedMemory) || Boolean(selected!.locked)} onClick={() => router.push(destinationHref("focus"))}>
        <span>Inspect</span><strong>Enter Focus</strong>
      </button>
      <button className="replay-threshold" data-destination-href={destinationHref("replay")} disabled={!selected!.replayAvailable || selected!.locked || (!explicitDemoRequested && !selected!.authorizedMemory)} onClick={() => router.push(destinationHref("replay"))}>
        <span>Cross threshold</span><strong>Replay</strong>
      </button>
      <button className="overview-return" onClick={overview} aria-label="Return to Life Map overview">Overview</button>
    </nav> : null}

    {!thresholdsVisible && !recovery && sourceMode !== "signed-out" ? <nav className="life-map-flight-controls" aria-label="Explore the Life Map">
      {([
        ["KeyW", "Forward"], ["KeyS", "Back"], ["KeyA", "Left"], ["KeyD", "Right"],
        ["KeyE", "Rise"], ["KeyQ", "Descend"], ["ArrowLeft", "Turn left"], ["ArrowRight", "Turn right"],
      ] as const).map(([control, label]) =>
        <button key={control} type="button" aria-label={label}
          onPointerDown={(event) => {
            if (event.pointerType === "mouse" && event.button !== 0) return;
            if (shellRef.current) shellRef.current.dataset.lifeMapFlightControl = control;
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerUp={() => { if (shellRef.current) shellRef.current.dataset.lifeMapFlightControl = ""; }}
          onPointerCancel={() => { if (shellRef.current) shellRef.current.dataset.lifeMapFlightControl = ""; }}
          onBlur={() => { if (shellRef.current) shellRef.current.dataset.lifeMapFlightControl = ""; }}
          onKeyDown={(event) => {
            if ((event.key === "Enter" || event.key === " ") && shellRef.current) {
              shellRef.current.dataset.lifeMapFlightControl = control;
              event.preventDefault();
            }
          }}
          onKeyUp={() => { if (shellRef.current) shellRef.current.dataset.lifeMapFlightControl = ""; }}>
          {label}
        </button>)}
    </nav> : null}
    {!thresholdsVisible && sourceMode !== "signed-out" ? <nav className="life-map-overview-controls" aria-label="Life Map overview controls">
      <button type="button" className="overview-home-return" data-life-map-overview-home-return="true" onClick={returnHome}>Return Home</button>
      {!recovery ? <AdamLauncherSlot name="life-map-overview-controls" as="div" /> : null}
    </nav> : null}

    {recovery ? <section className="life-map-recovery" role="status" aria-live="assertive">
      <h2>{webglState === "lost" ? "Visual field paused safely" : "Restoring visual field"}</h2>
      <p>Your selected memory, privacy state, and return position remain preserved.</p>
      <button onClick={overview}>Open semantic overview</button>
      <button onClick={returnHome}>Return Home</button>
    </section> : null}

    <style jsx>{`
      .life-map-root{position:fixed;inset:0;z-index:100;overflow:hidden;background:#02050b;color:#f8fbff;font-family:Inter,system-ui;isolation:isolate}.life-map-root :global(canvas){position:absolute!important;inset:0;width:100%!important;height:100%!important;opacity:1!important;visibility:visible!important}.life-map-depth-contract{display:none}.life-map-title{position:absolute;z-index:12;top:max(22px,env(safe-area-inset-top));left:max(22px,env(safe-area-inset-left));display:grid;gap:5px;max-width:min(520px,calc(100vw - 44px));pointer-events:none;text-shadow:0 10px 34px #000}.life-map-title span,.life-map-title em{font:800 10px/1.2 Inter,system-ui;letter-spacing:.22em;text-transform:uppercase;color:rgba(211,243,255,.76);font-style:normal}.life-map-title strong{font:750 clamp(25px,4vw,48px)/.96 Inter,system-ui;letter-spacing:-.05em;max-width:12ch}.life-map-status{position:absolute;z-index:12;right:max(20px,env(safe-area-inset-right));top:max(20px,env(safe-area-inset-top));display:grid;justify-items:end;gap:4px;padding:10px 13px;border-right:1px solid rgba(225,243,255,.34);text-shadow:0 6px 20px #000;pointer-events:none}.life-map-status span{font:800 9px/1 Inter,system-ui;letter-spacing:.17em;text-transform:uppercase;color:#e9f8ff}.life-map-status small{font-size:10px;color:rgba(220,240,251,.62)}.life-map-thresholds{position:absolute;z-index:16;left:50%;bottom:max(24px,calc(env(safe-area-inset-bottom) + 14px));transform:translateX(-50%);display:grid;grid-template-columns:minmax(148px,1fr) minmax(148px,1fr) auto;gap:10px;width:min(560px,calc(100vw - 40px));align-items:stretch}.life-map-overview-controls{position:absolute;z-index:16;left:50%;bottom:max(24px,calc(env(safe-area-inset-bottom) + 14px));transform:translateX(-50%);display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:12px;max-width:calc(100vw - 24px)}.overview-home-return{min-width:108px;min-height:48px;padding:0 16px;border:1px solid rgba(220,248,255,.24);border-radius:999px;background:rgba(2,8,16,.78);color:#f8fbff;font:700 12px Inter,system-ui;cursor:pointer}.overview-home-return:focus-visible{outline:2px solid #f8fbff;outline-offset:4px}.life-map-thresholds button,.life-map-recovery button{min-height:58px;border:1px solid rgba(220,248,255,.24);border-radius:18px;background:linear-gradient(145deg,rgba(8,22,35,.86),rgba(2,8,16,.78));color:#f8fbff;padding:9px 16px;font-weight:800;cursor:pointer;box-shadow:0 18px 50px rgba(0,0,0,.38),inset 0 1px rgba(255,255,255,.05)}.life-map-thresholds button span{display:block;font-size:8px;letter-spacing:.16em;text-transform:uppercase;color:rgba(211,239,251,.62)}.life-map-thresholds button strong{display:block;margin-top:3px;font-size:14px}.life-map-thresholds .focus-threshold{border-color:rgba(159,231,255,.48)}.life-map-thresholds .replay-threshold{border-color:rgba(244,214,152,.48)}.life-map-thresholds .overview-return{min-width:58px;padding:0 12px;border-radius:999px;font-size:10px;letter-spacing:.08em;text-transform:uppercase}.life-map-thresholds button:disabled{opacity:.36;cursor:not-allowed}.life-map-recovery{position:absolute;z-index:30;inset:0;left:0;top:0;width:auto;max-width:none;transform:none;box-sizing:border-box;overflow:auto;border-radius:0;display:grid;place-content:center;justify-items:center;gap:12px;padding:24px;text-align:center;background:rgba(1,3,10,.92)}.life-map-recovery h2,.life-map-recovery p{margin:0}.life-map-recovery p{max-width:42ch;color:rgba(231,244,252,.74)}:global(.life-map-world-label){display:grid;gap:3px;min-width:142px;padding:9px 11px;border:1px solid rgba(205,244,255,.18);border-radius:14px;background:rgba(2,7,18,.64);backdrop-filter:blur(12px);color:#fff;text-align:left;cursor:pointer;box-shadow:0 12px 34px rgba(0,0,0,.32)}:global(.life-map-world-label[data-active='true']){border-color:rgba(245,226,174,.74);background:rgba(14,30,43,.86)}:global(.life-map-world-label strong){font-size:12px}:global(.life-map-world-label span){font-size:9px;color:rgba(221,241,255,.68)}:global(.life-map-chapter-label){display:block;padding:5px 8px;border-left:1px solid rgba(210,240,255,.3);font:800 9px/1 Inter,system-ui;letter-spacing:.18em;text-transform:uppercase;color:rgba(222,244,255,.72);text-shadow:0 8px 28px #000}:global(.life-map-chapter-label[data-muted='true']){opacity:.42}@media(max-width:700px){.life-map-title{top:max(14px,env(safe-area-inset-top));left:14px;max-width:calc(100vw - 28px)}.life-map-title strong{font-size:28px;max-width:10ch}.life-map-status{top:max(15px,env(safe-area-inset-top));right:12px;max-width:44vw}.life-map-status small{display:none}.life-map-thresholds{bottom:max(12px,env(safe-area-inset-bottom));grid-template-columns:1fr 1fr;width:calc(100vw - 24px);gap:8px}.life-map-thresholds .overview-return{grid-column:1/-1;justify-self:center;min-height:48px;width:108px}.life-map-thresholds button{min-height:56px;padding:8px 10px}:global(.life-map-world-label){min-width:118px;padding:7px 8px}:global(.life-map-chapter-label){font-size:8px;letter-spacing:.14em}}@media(prefers-reduced-motion:reduce){.life-map-root *{transition:none!important;animation:none!important}}@media(forced-colors:active){.life-map-title,.life-map-status,.life-map-thresholds,.life-map-recovery,.overview-home-return{forced-color-adjust:auto}.life-map-thresholds button,.life-map-recovery button,.overview-home-return,:global(.life-map-world-label){border:2px solid CanvasText;background:Canvas;color:CanvasText}}

      .life-map-title{gap:8px;max-width:min(600px,46vw)}
      .life-map-title span,.life-map-title em{font-size:11px;line-height:1.5;letter-spacing:.12em;color:#ceeaf6}
      .life-map-title strong{font-size:clamp(32px,4.2vw,60px);line-height:1.04;letter-spacing:-.035em;max-width:14ch}
      .life-map-status{gap:7px;padding:14px 16px;background:linear-gradient(90deg,transparent,#02071499);border-radius:12px 0 0 12px}
      .life-map-status span{font-size:12px;line-height:1.4;letter-spacing:.1em}
      .life-map-status small{font-size:13px;line-height:1.5;color:#c3dce9}
      .life-map-thresholds button span{font-size:10px;letter-spacing:.08em;color:#c5dce8}
      .life-map-thresholds button strong{font-size:16px}
      .life-map-thresholds .overview-return,.overview-home-return{font-size:13px;letter-spacing:0;text-transform:none}
      @media(max-width:700px){.life-map-title{max-width:calc(100vw - 28px);gap:6px}.life-map-title strong{font-size:30px;max-width:16ch}.life-map-title span,.life-map-title em{font-size:10px;letter-spacing:.08em}.life-map-status{top:auto;right:14px;bottom:max(152px,calc(env(safe-area-inset-bottom) + 146px));max-width:calc(100vw - 28px);padding:8px 10px}.life-map-status span{font-size:11px}.life-map-status small{display:block;font-size:12px;max-width:32ch;text-align:right}:global(.life-map-world-label){max-width:130px;padding:7px 9px}:global(.life-map-world-label strong){font-size:12px}:global(.life-map-world-label span){font-size:10px}}
      @media(max-height:500px) and (min-width:501px){.life-map-title{max-width:46vw}.life-map-title strong{font-size:30px}.life-map-status{top:16px;bottom:auto;max-width:42vw}.life-map-thresholds{left:auto;right:16px;bottom:16px;transform:none;width:48vw;grid-template-columns:1fr 1fr auto}.life-map-thresholds .overview-return{grid-column:auto;min-width:64px;width:auto}.life-map-thresholds button span{display:none}}
      .life-map-flight-controls{position:absolute;left:max(12px,env(safe-area-inset-left));bottom:max(84px,calc(env(safe-area-inset-bottom) + 76px));z-index:17;display:grid;grid-template-columns:repeat(4,minmax(58px,1fr));gap:6px;max-width:min(360px,calc(100vw - 24px))}
      .life-map-flight-controls button{min-width:58px;min-height:48px;border:1px solid rgba(213,239,251,.3);border-radius:12px;background:rgba(2,9,21,.77);color:#e2f5ff;font:700 11px Inter,system-ui;touch-action:none;cursor:pointer}
      .life-map-flight-controls button:focus-visible{outline:2px solid #fff;outline-offset:2px}
      @media(max-width:700px){.life-map-flight-controls{bottom:max(88px,calc(env(safe-area-inset-bottom) + 76px));grid-template-columns:repeat(4,1fr);max-width:280px}.life-map-flight-controls button{min-width:54px;font-size:10px}}
      .life-map-root .life-map-title::after{content:none!important;display:none!important}
      /* The adopted scene owns the route hierarchy. Memory identity and search
         remain with the existing semantic navigator, outside the 3D world. */
      .life-map-root[data-life-map-production-world='true'] .life-map-title strong{font-size:clamp(32px,4.2vw,60px)!important;line-height:1.04!important;max-width:14ch!important}
      @media(max-width:700px){
        .life-map-root[data-life-map-production-world='true'] .life-map-title{max-width:calc(100vw - 100px)!important}
        .life-map-root[data-life-map-production-world='true'] .life-map-title strong{font-size:30px!important;max-width:16ch!important}
        .life-map-root[data-life-map-production-world='true'] .life-map-status{width:auto!important;height:auto!important;padding:8px 10px!important;margin:0!important;overflow:visible!important;clip:auto!important;clip-path:none!important;white-space:normal!important}
      }
      @media(max-height:500px) and (min-width:501px){.life-map-root[data-life-map-production-world='true'] .life-map-title strong{font-size:30px!important}}
    `}</style>
  </main>;
}
