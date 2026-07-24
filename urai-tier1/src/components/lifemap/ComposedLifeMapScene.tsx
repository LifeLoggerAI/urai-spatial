"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useAdaptiveSpatialQuality } from "@/spatial/performance/useAdaptiveSpatialQuality";
import { useLifeMapEvents, type LifeMapSourceMode } from "./useLifeMapEvents";
import type { LifeMapNode } from "./lifeMapData";
import { LifeMapProductionWorld, type LifeMapJourneyPhase } from "./LifeMapProductionWorld";
import { artifactFamilyLabel, resolveArtifactFamily } from "./lifeMapVisualSystem";

const OVERVIEW_POSITION: [number, number, number] = [0, 1.6, 14.8];
const OVERVIEW_TARGET: [number, number, number] = [0, 0.15, -4.6];
const DEFAULT_MANIFEST_ID = "replay-recovery-thread";
const SELECTED_MEMORY_STANDOFF = 5.6;

type JourneyPhase = "overview" | "departure" | "travel" | "approach" | "arrival";
type WebGLState = "ready" | "lost" | "recovering" | "failed";
type CameraGoal = { position: [number, number, number]; target: [number, number, number] };

function safeToken(value: string | null, fallback = "") {
  return (value || fallback).replace(/[^a-zA-Z0-9:_-]/g, "").slice(0, 120);
}

function tuple(vector: THREE.Vector3): [number, number, number] {
  return [vector.x, vector.y, vector.z];
}

function goalForNode(node: LifeMapNode, phase: JourneyPhase): CameraGoal {
  const target = new THREE.Vector3(...node.position);
  const overview = new THREE.Vector3(...OVERVIEW_POSITION);
  const direction = overview.clone().sub(target);
  if (direction.lengthSq() < 0.01) direction.set(0, 0.1, 1);
  direction.normalize();
  const arrival = target.clone().addScaledVector(direction, SELECTED_MEMORY_STANDOFF);
  arrival.y += 0.34;
  if (phase === "departure") return { position: OVERVIEW_POSITION, target: tuple(target) };
  if (phase === "travel") {
    const travel = overview.clone().lerp(arrival, 0.52);
    travel.x += (Math.sign(node.position[0]) || 1) * 1.18;
    travel.y += 1.28;
    return { position: tuple(travel), target: tuple(target) };
  }
  if (phase === "approach") {
    const approach = target.clone().addScaledVector(direction, SELECTED_MEMORY_STANDOFF + 2.4);
    approach.y += 0.8;
    return { position: tuple(approach), target: tuple(target) };
  }
  return { position: tuple(arrival), target: tuple(target) };
}

function CameraRig({ goal, phase, reducedMotion }: { goal: CameraGoal; phase: JourneyPhase; reducedMotion: boolean }) {
  const { camera, size } = useThree();
  const initialized = useRef(false);
  const positionGoal = useRef(new THREE.Vector3());
  const targetGoal = useRef(new THREE.Vector3());
  const lookTarget = useRef(new THREE.Vector3(...goal.target));

  const resolve = useCallback(() => {
    positionGoal.current.set(...goal.position);
    targetGoal.current.set(...goal.target);
    const portrait = size.height > size.width;
    if (portrait) {
      if (phase === "overview") {
        positionGoal.current.set(0, 2.15, 17.8);
        targetGoal.current.set(0, 0.2, -4.6);
      } else {
        const offset = positionGoal.current.clone().sub(targetGoal.current).multiplyScalar(1.38);
        positionGoal.current.copy(targetGoal.current).add(offset);
        positionGoal.current.y += 0.46;
      }
    }
    return portrait;
  }, [goal.position, goal.target, phase, size.height, size.width]);

  useLayoutEffect(() => {
    if (initialized.current) return;
    const portrait = resolve();
    camera.position.copy(positionGoal.current);
    lookTarget.current.copy(targetGoal.current);
    camera.lookAt(lookTarget.current);
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = portrait ? (phase === "overview" ? 54 : 58) : (phase === "arrival" ? 45 : 42);
      camera.updateProjectionMatrix();
    }
    initialized.current = true;
  }, [camera, phase, resolve]);

  useFrame((_, delta) => {
    const portrait = resolve();
    const fov = portrait ? (phase === "overview" ? 54 : 58) : (phase === "arrival" ? 45 : 42);
    if (reducedMotion) {
      camera.position.copy(positionGoal.current);
      lookTarget.current.copy(targetGoal.current);
    } else {
      const rate = phase === "travel" ? 1.8 : phase === "approach" ? 2.7 : phase === "arrival" ? 4.8 : 3.7;
      camera.position.x = THREE.MathUtils.damp(camera.position.x, positionGoal.current.x, rate, delta);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, positionGoal.current.y, rate, delta);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, positionGoal.current.z, rate, delta);
      lookTarget.current.x = THREE.MathUtils.damp(lookTarget.current.x, targetGoal.current.x, 5.4, delta);
      lookTarget.current.y = THREE.MathUtils.damp(lookTarget.current.y, targetGoal.current.y, 5.4, delta);
      lookTarget.current.z = THREE.MathUtils.damp(lookTarget.current.z, targetGoal.current.z, 5.4, delta);
    }
    camera.lookAt(lookTarget.current);
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = reducedMotion ? fov : THREE.MathUtils.damp(camera.fov, fov, 4.4, delta);
      camera.updateProjectionMatrix();
    }
  });
  return null;
}

function WebGLRecoveryBridge({ onStateChange }: { onStateChange: (state: WebGLState) => void }) {
  const { gl } = useThree();
  useEffect(() => {
    const canvas = gl.domElement;
    let timer: number | null = null;
    const clearRecoveryTimer = () => {
      if (timer === null) return;
      window.clearTimeout(timer);
      timer = null;
    };
    const lost = (event: Event) => {
      event.preventDefault();
      clearRecoveryTimer();
      onStateChange("lost");
      timer = window.setTimeout(() => {
        timer = null;
        onStateChange("recovering");
      }, 250);
    };
    const restored = () => {
      clearRecoveryTimer();
      onStateChange("ready");
    };
    canvas.addEventListener("webglcontextlost", lost, false);
    canvas.addEventListener("webglcontextrestored", restored, false);
    onStateChange("ready");
    return () => {
      clearRecoveryTimer();
      canvas.removeEventListener("webglcontextlost", lost, false);
      canvas.removeEventListener("webglcontextrestored", restored, false);
    };
  }, [gl, onStateChange]);
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
  return "Intimate memory chamber";
}

export default function ComposedLifeMapScene() {
  const router = useRouter();
  const params = useSearchParams();
  const profile = useAdaptiveSpatialQuality();
  const explicitDemoRequested = params.get("demo") === "1";
  const overviewRequested = params.get("overview") === "1";
  const { nodes, loading, sourceMode } = useLifeMapEvents(explicitDemoRequested ? "demo-user" : undefined);
  const queryNode = safeToken(params.get("node") || params.get("memoryId"));
  const manifestId = safeToken(params.get("manifestId"), DEFAULT_MANIFEST_ID);
  const [selectedId, setSelectedId] = useState<string | null>(overviewRequested ? null : queryNode || null);
  const [phase, setPhase] = useState<JourneyPhase>(selectedId ? "arrival" : "overview");
  const [webglState, setWebglState] = useState<WebGLState>("ready");
  const timers = useRef<number[]>([]);
  const overviewPending = useRef(overviewRequested);
  const selected = useMemo(() => nodes.find((node) => node.id === selectedId) || null, [nodes, selectedId]);
  const goal = useMemo<CameraGoal>(() => selected ? goalForNode(selected, phase) : { position: OVERVIEW_POSITION, target: OVERVIEW_TARGET }, [phase, selected]);

  const clearTimers = useCallback(() => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  }, []);
  useEffect(() => () => clearTimers(), [clearTimers]);

  const withIdentity = useCallback((next: URLSearchParams) => {
    if (explicitDemoRequested) next.set("demo", "1");
    if (manifestId) next.set("manifestId", manifestId);
    return next;
  }, [explicitDemoRequested, manifestId]);

  const selectNode = useCallback((node: LifeMapNode) => {
    overviewPending.current = false;
    clearTimers();
    setSelectedId(node.id);
    if (profile.reducedMotion) {
      setPhase("arrival");
    } else {
      setPhase("departure");
      timers.current.push(window.setTimeout(() => setPhase("travel"), 260));
      timers.current.push(window.setTimeout(() => setPhase("approach"), 1050));
      timers.current.push(window.setTimeout(() => setPhase("arrival"), 1880));
    }
    const next = withIdentity(new URLSearchParams());
    next.set("memoryId", node.id);
    next.set("node", node.id);
    if (node.eraId) next.set("era", node.eraId);
    router.replace(`/life-map?${next.toString()}`, { scroll: false });
  }, [clearTimers, profile.reducedMotion, router, withIdentity]);

  const overview = useCallback(() => {
    overviewPending.current = true;
    clearTimers();
    setSelectedId(null);
    setPhase("overview");
    const next = withIdentity(new URLSearchParams());
    next.set("overview", "1");
    router.replace(`/life-map?${next.toString()}`, { scroll: false });
  }, [clearTimers, router, withIdentity]);

  const destinationHref = useCallback((route: "focus" | "replay") => {
    if (!selected) return "/life-map";
    const next = withIdentity(new URLSearchParams());
    next.set("memoryId", selected.id);
    next.set("node", selected.id);
    next.set("returnNode", selected.id);
    next.set("artifactFamily", resolveArtifactFamily(selected));
    next.set("from", "life-map");
    return `/${route}?${next.toString()}`;
  }, [selected, withIdentity]);

  useEffect(() => {
    if (!overviewRequested) return;
    overviewPending.current = false;
    clearTimers();
    setSelectedId((current) => current === null ? current : null);
    setPhase((current) => current === "overview" ? current : "overview");
  }, [clearTimers, overviewRequested]);

  useEffect(() => {
    if (overviewRequested || overviewPending.current || !queryNode || !nodes.length) return;
    const node = nodes.find((candidate) => candidate.id === queryNode);
    if (node && node.id !== selectedId) selectNode(node);
  }, [nodes, overviewRequested, queryNode, selectNode, selectedId]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.key !== "Escape" || (event.target instanceof HTMLElement && event.target.matches("input,textarea,select,[role='textbox']"))) return;
      event.preventDefault();
      if (selectedId) overview(); else router.push("/home");
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [overview, router, selectedId]);

  useEffect(() => () => { document.body.style.cursor = ""; }, []);

  const recovery = webglState !== "ready";
  return <main
    className="life-map-root"
    data-testid="urai-true-3d-life-map"
    data-spatial-visible="true"
    data-life-map-source={sourceMode}
    data-life-map-phase={phase}
    data-life-map-mode={selected ? "selected" : "overview"}
    data-life-map-scale={selected ? phase === "arrival" ? "intimate" : "regional" : "cosmic"}
    data-life-map-production-world="true"
    data-webgl-state={webglState}
    data-home-companion-owned="false"
  >
    <h1 className="sr-only">URAI Life Map private universe</h1>
    <Canvas
      camera={{ position: OVERVIEW_POSITION, fov: 42, near: 0.08, far: 140 }}
      dpr={[1, profile.pixelRatioMax]}
      shadows={profile.shadows}
      gl={{ antialias: profile.antialias, powerPreference: "high-performance", alpha: false }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 0.92;
        gl.outputColorSpace = THREE.SRGBColorSpace;
        gl.setClearColor("#02050b", 1);
      }}
    >
      <LifeMapProductionWorld
        nodes={nodes}
        selected={selected}
        phase={phase as LifeMapJourneyPhase}
        profile={profile}
        onSelect={selectNode}
        cameraRig={<CameraRig goal={goal} phase={phase} reducedMotion={profile.reducedMotion} />}
        webglRecovery={<WebGLRecoveryBridge onStateChange={setWebglState} />}
      />
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

    {selected ? <nav className="life-map-thresholds" aria-label="Selected memory thresholds" data-family={resolveArtifactFamily(selected)}>
      <button className="focus-threshold" onClick={() => router.push(destinationHref("focus"))}>
        <span>Inspect</span><strong>Enter Focus</strong>
      </button>
      <button className="replay-threshold" disabled={!selected.replayAvailable || selected.locked} onClick={() => router.push(destinationHref("replay"))}>
        <span>Cross threshold</span><strong>Replay</strong>
      </button>
      <button className="overview-return" onClick={overview} aria-label="Return to Life Map overview">Overview</button>
    </nav> : null}

    {recovery ? <section className="life-map-recovery" role="status" aria-live="assertive">
      <h2>{webglState === "lost" ? "Visual field paused safely" : "Restoring visual field"}</h2>
      <p>Your selected memory, privacy state, and return position remain preserved.</p>
      <button onClick={overview}>Open semantic overview</button>
      <button onClick={() => router.push("/home")}>Return Home</button>
    </section> : null}

    <style jsx>{`
      .life-map-root{position:fixed;inset:0;overflow:hidden;background:#02050b;color:#f8fbff;font-family:Inter,system-ui;isolation:isolate}.life-map-root :global(canvas){position:absolute!important;inset:0;width:100%!important;height:100%!important}.life-map-title{position:absolute;z-index:12;top:max(22px,env(safe-area-inset-top));left:max(22px,env(safe-area-inset-left));display:grid;gap:5px;max-width:min(560px,calc(100vw - 44px));pointer-events:none;text-shadow:0 10px 34px #000}.life-map-title span,.life-map-title em{font:800 10px/1.2 Inter,system-ui;letter-spacing:.22em;text-transform:uppercase;color:rgba(211,243,255,.76);font-style:normal}.life-map-title strong{font:750 clamp(25px,4.6vw,54px)/.96 Inter,system-ui;letter-spacing:-.05em;max-width:12ch}.life-map-status{position:absolute;z-index:12;right:max(20px,env(safe-area-inset-right));top:max(20px,env(safe-area-inset-top));display:grid;justify-items:end;gap:4px;padding:10px 13px;border-right:1px solid rgba(225,243,255,.34);text-shadow:0 6px 20px #000;pointer-events:none}.life-map-status span{font:800 9px/1 Inter,system-ui;letter-spacing:.17em;text-transform:uppercase;color:#e9f8ff}.life-map-status small{font-size:10px;color:rgba(220,240,251,.62)}.life-map-thresholds{position:absolute;z-index:16;left:50%;bottom:max(24px,calc(env(safe-area-inset-bottom) + 14px));transform:translateX(-50%);display:grid;grid-template-columns:minmax(148px,1fr) minmax(148px,1fr) auto;gap:10px;width:min(560px,calc(100vw - 40px));align-items:stretch}.life-map-thresholds button,.life-map-recovery button{min-height:58px;border:1px solid rgba(220,248,255,.24);border-radius:18px;background:linear-gradient(145deg,rgba(8,22,35,.92),rgba(2,8,16,.9));color:#f8fbff;padding:9px 16px;font-weight:800;cursor:pointer;box-shadow:0 18px 50px rgba(0,0,0,.38),inset 0 1px rgba(255,255,255,.05)}.life-map-thresholds button span{display:block;font-size:8px;letter-spacing:.16em;text-transform:uppercase;color:rgba(211,239,251,.62)}.life-map-thresholds button strong{display:block;margin-top:3px;font-size:14px}.life-map-thresholds .focus-threshold{border-color:rgba(159,231,255,.48)}.life-map-thresholds .replay-threshold{border-color:rgba(244,214,152,.48)}.life-map-thresholds .overview-return{min-width:58px;padding:0 12px;border-radius:999px;font-size:10px;letter-spacing:.08em;text-transform:uppercase}.life-map-thresholds button:disabled{opacity:.36;cursor:not-allowed}.life-map-recovery{position:absolute;z-index:30;inset:0;display:grid;place-content:center;justify-items:center;gap:12px;padding:24px;text-align:center;background:rgba(1,3,10,.92)}.life-map-recovery h2,.life-map-recovery p{margin:0}.life-map-recovery p{max-width:42ch;color:rgba(231,244,252,.74)}:global(.life-map-world-label){display:grid;gap:3px;min-width:142px;padding:9px 11px;border:1px solid rgba(205,244,255,.18);border-radius:14px;background:rgba(2,7,18,.74);backdrop-filter:blur(14px);color:#fff;text-align:left;cursor:pointer;box-shadow:0 12px 34px rgba(0,0,0,.32)}:global(.life-map-world-label[data-active='true']){border-color:rgba(245,226,174,.74);background:rgba(14,30,43,.94)}:global(.life-map-world-label strong){font-size:12px}:global(.life-map-world-label span){font-size:9px;color:rgba(221,241,255,.68)}:global(.life-map-chapter-label){display:block;padding:5px 8px;border-left:1px solid rgba(210,240,255,.3);font:800 9px/1 Inter,system-ui;letter-spacing:.18em;text-transform:uppercase;color:rgba(222,244,255,.72);text-shadow:0 8px 28px #000}:global(.life-map-chapter-label[data-muted='true']){opacity:.42}@media(max-width:700px){.life-map-title{top:max(14px,env(safe-area-inset-top));left:14px;max-width:calc(100vw - 28px)}.life-map-title strong{font-size:28px;max-width:10ch}.life-map-status{top:max(15px,env(safe-area-inset-top));right:12px;max-width:44vw}.life-map-status small{display:none}.life-map-thresholds{bottom:max(12px,env(safe-area-inset-bottom));grid-template-columns:1fr 1fr;width:calc(100vw - 24px);gap:8px}.life-map-thresholds .overview-return{grid-column:1/-1;justify-self:center;min-height:44px;width:108px}.life-map-thresholds button{min-height:56px;padding:8px 10px}:global(.life-map-world-label){min-width:118px;padding:7px 8px}:global(.life-map-chapter-label){font-size:8px;letter-spacing:.14em}}@media(prefers-reduced-motion:reduce){.life-map-root *{transition:none!important;animation:none!important}}@media(forced-colors:active){.life-map-title,.life-map-status,.life-map-thresholds,.life-map-recovery{forced-color-adjust:auto}.life-map-thresholds button,.life-map-recovery button,:global(.life-map-world-label){border:2px solid CanvasText;background:Canvas;color:CanvasText}}
    `}</style>
  </main>;
}
