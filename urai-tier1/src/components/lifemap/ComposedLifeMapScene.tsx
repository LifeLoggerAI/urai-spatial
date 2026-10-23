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
import { shouldHandleRealmEscape } from "@/spatial/world/realmEscapeEligibility.mjs";
import { lifeMapPhysicalStarAction, lifeMapPhysicalReplayAllowed } from "./lifeMapPhysicalStarAction.mjs";
import { lifeMapRotateFlightAxes, advanceLifeMapViewOrientation, lifeMapRotatedLookTarget } from "./lifeMapFlightOrientation.mjs";
import { lifeMapApplyPointerLook } from "./lifeMapPointerLook.mjs";
import { lifeMapStagePoint } from "./lifeMapStageContinuity.mjs";

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
  return new THREE.Vector3(...lifeMapStagePoint(node.position, portrait));
}

function goalForNode(node: LifeMapNode, phase: JourneyPhase, portrait: boolean, origin?: THREE.Vector3): CameraGoal {
  const target = selectedStagePoint(node, portrait);
  const overview = origin?.clone() ?? new THREE.Vector3(...OVERVIEW_POSITION);
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

// Keyboard exploration is deliberately world-relative rather than head-locked:
// it must not conflict with authored star-approach and Replay camera authority.
type LifeMapFlightVector = { x: number; y: number; z: number };
function stepLifeMapFlight(
  offset: LifeMapFlightVector, velocity: LifeMapFlightVector,
  held: ReadonlySet<string>, delta: number, reducedMotion: boolean, yaw = 0,
) {
  const dt = Math.max(0, Math.min(0.05, Number.isFinite(delta) ? delta : 0));
  const axis = (positive: string, negative: string) => Number(held.has(positive)) - Number(held.has(negative));
  const input = lifeMapRotateFlightAxes({ x: axis('KeyD', 'KeyA'), y: axis('KeyE', 'KeyQ'), z: axis('KeyS', 'KeyW') }, yaw);
  const magnitude = Math.hypot(input.x, input.y, input.z);
  const speed = held.has('ShiftLeft') || held.has('ShiftRight') ? 9 : 5.5;
  const smoothing = reducedMotion ? 1 : 1 - Math.exp(-12 * dt);
  const clamp = (value: number, bound: number) => Math.max(-bound, Math.min(bound, value));
  const nextVelocity = {
    x: velocity.x + ((magnitude ? input.x / magnitude * speed : 0) - velocity.x) * smoothing,
    y: velocity.y + ((magnitude ? input.y / magnitude * speed : 0) - velocity.y) * smoothing,
    z: velocity.z + ((magnitude ? input.z / magnitude * speed : 0) - velocity.z) * smoothing,
  };
  return {
    offset: {
      x: clamp(offset.x + nextVelocity.x * dt, 28),
      y: clamp(offset.y + nextVelocity.y * dt, 11),
      z: clamp(offset.z + nextVelocity.z * dt, 28),
    },
    velocity: nextVelocity,
  };
}

function CameraRig({ selected, phase, reducedMotion, shellRef }: { selected: LifeMapNode | null; phase: JourneyPhase; reducedMotion: boolean; shellRef: RefObject<HTMLElement | null> }) {
  const { camera, size } = useThree();
  const initialized = useRef(false);
  const positionGoal = useRef(new THREE.Vector3());
  const targetGoal = useRef(new THREE.Vector3());
  const lookTarget = useRef(new THREE.Vector3(...OVERVIEW_TARGET));
  const flightOffset = useRef(new THREE.Vector3());
  const flightVelocity = useRef(new THREE.Vector3());
  const heldFlightKeys = useRef(new Set<string>());
  const flightOrientation = useRef({ yaw: 0, pitch: 0 });
  const departureOrigin = useRef<THREE.Vector3 | null>(null);
  const departureNodeId = useRef<string | null>(null);
  const previousCameraPhase = useRef<JourneyPhase>("overview");
  useEffect(() => {
    // Selection, unloading and blur must never leave a motion key stuck.
    heldFlightKeys.current.clear();
    if (phase !== "overview") return;
    const controls = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']);
    const keyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable
        || target.closest('input,textarea,select,[role="textbox"],[role="dialog"],[data-urai-adam-presence]'))) {
        release();
        return;
      }
      if (document.querySelector('[role="dialog"][aria-modal="true"],#life-map-navigator[aria-modal="true"]')) {
        release();
        return;
      }
      if (event.code === 'KeyR') {
        event.preventDefault();
        flightOffset.current.set(0, 0, 0);
        flightOrientation.current = { yaw: 0, pitch: 0 };
        flightVelocity.current.set(0, 0, 0);
        heldFlightKeys.current.clear();
        return;
      }
      if (controls.has(event.code)) event.preventDefault();
      if (controls.has(event.code) || event.code === 'ShiftLeft' || event.code === 'ShiftRight') {
        heldFlightKeys.current.add(event.code);
      }
    };
    const keyUp = (event: KeyboardEvent) => { heldFlightKeys.current.delete(event.code); };
    const release = () => { heldFlightKeys.current.clear(); flightVelocity.current.set(0, 0, 0); };
    const focusIn = (event: FocusEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable
        || target.closest('input,textarea,select,[role="textbox"],[role="dialog"],[data-urai-adam-presence]'))) release();
    };
    window.addEventListener('focusin', focusIn);
    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);
    window.addEventListener('blur', release);
    return () => {
      window.removeEventListener('focusin', focusIn);
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
      window.removeEventListener('blur', release);
      release();
    };
  }, [phase]);

  // Drag on the actual WebGL canvas to look around while exploring. The
  // existing world-space star click handler remains authoritative.
  const { gl } = useThree();
  useEffect(() => {
    if (phase !== "overview") return;
    const canvas = gl.domElement;
    const previousTouchAction = canvas.style.touchAction;
    canvas.style.touchAction = "none";
    let active: { id: number; startX: number; startY: number; lastX: number; lastY: number; dragging: boolean } | null = null;
    const blocked = () => Boolean(document.querySelector('[role="dialog"][aria-modal="true"],#life-map-navigator[aria-modal="true"],[data-urai-adam-presence]'));
    const release = () => { active = null; };
    const pointerDown = (event: PointerEvent) => {
      if (active || event.isPrimary === false || (event.pointerType === "mouse" && event.button !== 0) || blocked()) return;
      active = { id: event.pointerId, startX: event.clientX, startY: event.clientY, lastX: event.clientX, lastY: event.clientY, dragging: false };
      try { canvas.setPointerCapture(event.pointerId); } catch { /* capture can be declined */ }
    };
    const pointerMove = (event: PointerEvent) => {
      if (!active || active.id !== event.pointerId) return;
      if (blocked()) { release(); return; }
      if (!active.dragging && Math.hypot(event.clientX - active.startX, event.clientY - active.startY) < 8) return;
      const dx = event.clientX - active.lastX;
      const dy = event.clientY - active.lastY;
      active.lastX = event.clientX;
      active.lastY = event.clientY;
      active.dragging = true;
      flightOrientation.current = lifeMapApplyPointerLook(flightOrientation.current, dx, dy);
      if (event.cancelable) event.preventDefault();
    };
    const pointerEnd = (event: PointerEvent) => { if (active?.id === event.pointerId) release(); };
    canvas.addEventListener("pointerdown", pointerDown);
    canvas.addEventListener("pointermove", pointerMove);
    canvas.addEventListener("pointerup", pointerEnd);
    canvas.addEventListener("pointercancel", pointerEnd);
    canvas.addEventListener("lostpointercapture", pointerEnd);
    window.addEventListener("pointerup", pointerEnd);
    window.addEventListener("pointercancel", pointerEnd);
    window.addEventListener("blur", release);
    return () => {
      canvas.removeEventListener("pointerdown", pointerDown);
      canvas.removeEventListener("pointermove", pointerMove);
      canvas.removeEventListener("pointerup", pointerEnd);
      canvas.removeEventListener("pointercancel", pointerEnd);
      canvas.removeEventListener("lostpointercapture", pointerEnd);
      window.removeEventListener("pointerup", pointerEnd);
      window.removeEventListener("pointercancel", pointerEnd);
      window.removeEventListener("blur", release);
      canvas.style.touchAction = previousTouchAction;
      release();
    };
  }, [gl, phase]);

  const resolve = useCallback(() => {
    const portrait = size.height > size.width;
    const goal = selected ? goalForNode(selected, phase, portrait, departureOrigin.current ?? undefined) : { position: OVERVIEW_POSITION, target: OVERVIEW_TARGET };
    positionGoal.current.set(...goal.position);
    targetGoal.current.set(...goal.target);
    if (portrait) {
      if (phase === "overview") {
        positionGoal.current.set(0, 2.15, 16.6);
        targetGoal.current.set(0, 0.2, -4.6);
      } else if (!(phase === "departure" && departureOrigin.current)) {
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
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = portrait ? (phase === "overview" ? 55 : 57) : (phase === "arrival" ? 44 : 46);
      camera.updateProjectionMatrix();
    }
    initialized.current = true;
  }, [camera, phase, resolve]);

  useFrame(({ pointer }, delta) => {
    // Capture before resolving this frame's camera goal, never one effect later.
    // The first departure frame must originate at the camera's explored pose.
    if (phase === "overview") {
      departureOrigin.current = null;
      departureNodeId.current = null;
    } else if (phase === "departure" && selected &&
      (departureNodeId.current !== selected.id || previousCameraPhase.current !== "departure")) {
      // Re-selecting the same star after arrival is a new journey, not a
      // continuation of its old departure camera pose.
      departureOrigin.current = camera.position.clone();
      departureNodeId.current = selected.id;
    }
    previousCameraPhase.current = phase;
    const portrait = resolve();
    if (phase === "overview") {
      const focused = document.activeElement;
      if ((focused instanceof HTMLElement && (focused.isContentEditable
        || focused.closest('input,textarea,select,[role="textbox"],[role="dialog"],[data-urai-adam-presence]')))
        || document.querySelector('[role="dialog"][aria-modal="true"],#life-map-navigator[aria-modal="true"]')) {
        heldFlightKeys.current.clear();
        flightVelocity.current.set(0, 0, 0);
      }
      flightOrientation.current = advanceLifeMapViewOrientation(flightOrientation.current, heldFlightKeys.current, delta);
      const offset = flightOffset.current, velocity = flightVelocity.current;
      const next = stepLifeMapFlight(
        { x: offset.x, y: offset.y, z: offset.z },
        { x: velocity.x, y: velocity.y, z: velocity.z },
        heldFlightKeys.current, delta, reducedMotion, flightOrientation.current.yaw,
      );
      offset.set(next.offset.x, next.offset.y, next.offset.z);
      velocity.set(next.velocity.x, next.velocity.y, next.velocity.z);
    }
    // The actual departure camera already includes exploration displacement;
    // adding flight offset again would pull star travel away from its origin.
    const flightWeight = phase === "overview" ? 1 : 0;
    positionGoal.current.addScaledVector(flightOffset.current, flightWeight);
    targetGoal.current.addScaledVector(flightOffset.current, flightWeight);
    if (phase === "overview") {
      const rotated = lifeMapRotatedLookTarget(
        [positionGoal.current.x, positionGoal.current.y, positionGoal.current.z],
        [targetGoal.current.x, targetGoal.current.y, targetGoal.current.z],
        flightOrientation.current,
      );
      targetGoal.current.set(...rotated);
    }
    if (phase === "overview" && !reducedMotion) {
      positionGoal.current.x += pointer.x * (portrait ? 0.45 : 1.05);
      positionGoal.current.y += pointer.y * (portrait ? 0.24 : 0.42);
      targetGoal.current.x += pointer.x * 0.34;
      targetGoal.current.y += pointer.y * 0.16;
    }
    const fov = portrait ? (phase === "overview" ? 55 : 57) : (phase === "arrival" ? 44 : 46);
    if (reducedMotion) {
      camera.position.copy(positionGoal.current);
      lookTarget.current.copy(targetGoal.current);
    } else {
      const rate = phase === "travel" ? 1.9 : phase === "approach" ? 2.9 : phase === "arrival" ? 5.2 : 4.1;
      camera.position.x = THREE.MathUtils.damp(camera.position.x, positionGoal.current.x, rate, delta);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, positionGoal.current.y, rate, delta);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, positionGoal.current.z, rate, delta);
      lookTarget.current.x = THREE.MathUtils.damp(lookTarget.current.x, targetGoal.current.x, 5.6, delta);
      lookTarget.current.y = THREE.MathUtils.damp(lookTarget.current.y, targetGoal.current.y, 5.6, delta);
      lookTarget.current.z = THREE.MathUtils.damp(lookTarget.current.z, targetGoal.current.z, 5.6, delta);
    }
    camera.lookAt(lookTarget.current);
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = reducedMotion ? fov : THREE.MathUtils.damp(camera.fov, fov, 4.6, delta);
      camera.updateProjectionMatrix();
    }
    const shell = shellRef.current;
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
    // Do not rewrite the same-route URL during authored star travel.
    // LifeMapAccessGate intentionally rechecks auth on every query change;
    // changing it here would unmount this camera before its journey finishes.
    // Focus and Replay construct fresh, owner-scoped destination URLs below.
  }, [profile.reducedMotion]);

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

  const activateWorldStar = useCallback((node: LifeMapNode) => {
    const action = lifeMapPhysicalStarAction(node.id, selectedId, phase,
      lifeMapPhysicalReplayAllowed(node, sourceMode));
    if (action === "select") { selectNode(node); return; }
    if (action === "replay" && selected?.id === node.id && webglState === "ready") {
      router.push(destinationHref("replay"));
    }
  }, [destinationHref, phase, router, selectNode, selected, selectedId, sourceMode, webglState]);

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
    // A deep-link query is only an initial/restored selection. Do not let that
    // stale URL identity override a newer local star selection in flight.
    if (localSelectionId.current && localSelectionId.current !== queryNode) return;
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
      if (event.key !== "Escape" || !shouldHandleRealmEscape(event)) return;
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
          onStarClick={activateWorldStar}
          cameraRig={<CameraRig selected={selected} phase={phase} reducedMotion={profile.reducedMotion} shellRef={shellRef} />}
          webglRecovery={null}
        />
      </Suspense>
    </Canvas>

    {phase === "overview" ? <p aria-label="Life Map keyboard exploration controls"
      style={{ position: "absolute", zIndex: 15, bottom: "max(108px,calc(env(safe-area-inset-bottom) + 96px))",
        left: 18, margin: 0, padding: "9px 12px", maxWidth: "min(345px,calc(100vw - 36px))",
        borderRadius: 12, background: "rgba(2,8,16,.75)", color: "#ceeaf6", fontSize: 12,
        pointerEvents: "none" }}>
      Explore: W A S D move · Q E rise/fall · arrows or drag look · Shift faster · R recenter
    </p> : null}
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
