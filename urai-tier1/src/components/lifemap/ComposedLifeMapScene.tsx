"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, Line, Stars } from "@react-three/drei";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useAdaptiveSpatialQuality } from "@/spatial/performance/useAdaptiveSpatialQuality";
import { useLifeMapEvents, type LifeMapSourceMode } from "./useLifeMapEvents";
import { lifeMapTypeLabels, type LifeMapNode } from "./lifeMapData";

const OVERVIEW_POSITION: [number, number, number] = [0, 1.8, 13.5];
const OVERVIEW_TARGET: [number, number, number] = [0, 0, -3.5];
const DEFAULT_MANIFEST_ID = "replay-recovery-thread";
const SELECTED_MEMORY_STANDOFF = 5.8;

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
  if (direction.lengthSq() < .01) direction.set(0, .1, 1);
  direction.normalize();
  const arrival = target.clone().addScaledVector(direction, SELECTED_MEMORY_STANDOFF);
  arrival.y += .36;
  if (phase === "departure") return { position: OVERVIEW_POSITION, target: tuple(target) };
  if (phase === "travel") {
    const travel = overview.clone().lerp(arrival, .5);
    travel.x += (Math.sign(node.position[0]) || 1) * 1.05;
    travel.y += 1.2;
    return { position: tuple(travel), target: tuple(target) };
  }
  if (phase === "approach") {
    const approach = target.clone().addScaledVector(direction, SELECTED_MEMORY_STANDOFF + 2.25);
    approach.y += .72;
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
    if (portrait && phase !== "overview") {
      const offset = positionGoal.current.clone().sub(targetGoal.current).multiplyScalar(1.28);
      positionGoal.current.copy(targetGoal.current).add(offset);
      positionGoal.current.y += .3;
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
      camera.fov = portrait ? (phase === "overview" ? 50 : 56) : (phase === "arrival" ? 46 : 44);
      camera.updateProjectionMatrix();
    }
    initialized.current = true;
  }, [camera, phase, resolve]);

  useFrame((_, delta) => {
    const portrait = resolve();
    const fov = portrait ? (phase === "overview" ? 50 : 56) : (phase === "arrival" ? 46 : 44);
    if (reducedMotion) {
      camera.position.copy(positionGoal.current);
      lookTarget.current.copy(targetGoal.current);
    } else {
      const rate = phase === "travel" ? 2.25 : phase === "approach" ? 3.15 : phase === "arrival" ? 5.4 : 4.6;
      camera.position.x = THREE.MathUtils.damp(camera.position.x, positionGoal.current.x, rate, delta);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, positionGoal.current.y, rate, delta);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, positionGoal.current.z, rate, delta);
      lookTarget.current.x = THREE.MathUtils.damp(lookTarget.current.x, targetGoal.current.x, 6.4, delta);
      lookTarget.current.y = THREE.MathUtils.damp(lookTarget.current.y, targetGoal.current.y, 6.4, delta);
      lookTarget.current.z = THREE.MathUtils.damp(lookTarget.current.z, targetGoal.current.z, 6.4, delta);
    }
    camera.lookAt(lookTarget.current);
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = reducedMotion ? fov : THREE.MathUtils.damp(camera.fov, fov, 5, delta);
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
    const lost = (event: Event) => {
      event.preventDefault();
      onStateChange("lost");
      timer = window.setTimeout(() => onStateChange("recovering"), 250);
    };
    const restored = () => onStateChange("ready");
    canvas.addEventListener("webglcontextlost", lost, false);
    canvas.addEventListener("webglcontextrestored", restored, false);
    onStateChange("ready");
    return () => {
      if (timer !== null) window.clearTimeout(timer);
      canvas.removeEventListener("webglcontextlost", lost, false);
      canvas.removeEventListener("webglcontextrestored", restored, false);
    };
  }, [gl, onStateChange]);
  return null;
}

function MemoryLens({ node, active, muted, phase, reducedMotion, onSelect }: { node: LifeMapNode; active: boolean; muted: boolean; phase: JourneyPhase; reducedMotion: boolean; onSelect: (node: LifeMapNode) => void }) {
  const group = useRef<THREE.Group>(null);
  const color = useMemo(() => new THREE.Color(node.aura), [node.aura]);
  useFrame(({ clock }, delta) => {
    if (!group.current) return;
    const scale = active ? (phase === "arrival" ? 1.42 : 1.22) : muted ? .82 : 1;
    group.current.scale.setScalar(THREE.MathUtils.damp(group.current.scale.x, scale, 5, delta));
    if (!reducedMotion) group.current.rotation.y = Math.sin(clock.elapsedTime * .22 + node.position[0]) * .12;
  });
  return <group ref={group} position={node.position} name={`life-map-memory-${node.id}`} data-depth-anchor="true">
    <mesh onClick={(event) => { event.stopPropagation(); onSelect(node); }} onPointerOver={() => { document.body.style.cursor = "pointer"; }} onPointerOut={() => { document.body.style.cursor = ""; }}>
      <sphereGeometry args={[.42 + node.intensity * .16, 32, 32]} />
      <meshPhysicalMaterial color={color} emissive={color} emissiveIntensity={active ? 1.35 : .55} roughness={.18} metalness={.18} transmission={.18} transparent opacity={muted ? .4 : .92} />
    </mesh>
    <mesh scale={active ? 1.62 : 1.35}><torusGeometry args={[.48, .018, 10, 72]} /><meshBasicMaterial color={color} transparent opacity={muted ? .18 : active ? .82 : .34} depthWrite={false} /></mesh>
    <pointLight color={color} intensity={active ? 4.2 : 1.4} distance={active ? 7 : 3.5} decay={2} />
    {(active || !muted) ? <Html position={[0, .88, 0]} center distanceFactor={10} occlude="blending"><button className="life-map-world-label" data-active={active ? "true" : "false"} onClick={() => onSelect(node)}><strong>{node.title}</strong><span>{lifeMapTypeLabels[node.type]} · {node.dateLabel}</span></button></Html> : null}
  </group>;
}

function MemoryPaths({ nodes, activeId }: { nodes: LifeMapNode[]; activeId: string | null }) {
  const byId = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  return <group name="life-map-anchored-paths">{nodes.flatMap((node) => node.connectedTo.slice(0, 2).map((targetId) => {
    const target = byId.get(targetId);
    if (!target || target.id < node.id) return null;
    const active = activeId === node.id || activeId === target.id;
    return <Line key={`${node.id}-${target.id}`} points={[node.position, target.position]} color={active ? "#c8f7ff" : "#38506b"} transparent opacity={active ? .62 : .16} lineWidth={active ? 1.6 : .7} />;
  }))}</group>;
}

function World({ nodes, selected, goal, phase, reducedMotion, onSelect, onWebGLStateChange }: { nodes: LifeMapNode[]; selected: LifeMapNode | null; goal: CameraGoal; phase: JourneyPhase; reducedMotion: boolean; onSelect: (node: LifeMapNode) => void; onWebGLStateChange: (state: WebGLState) => void }) {
  return <>
    <color attach="background" args={["#01030a"]} />
    <fog attach="fog" args={["#01030a", 12, 42]} />
    <ambientLight intensity={.3} color="#b8dcff" />
    <directionalLight position={[4, 8, 8]} intensity={1.2} color="#d8f5ff" />
    <WebGLRecoveryBridge onStateChange={onWebGLStateChange} />
    <CameraRig goal={goal} phase={phase} reducedMotion={reducedMotion} />
    <group name="life-map-depth-near" data-depth-band="near"><mesh position={[-4.8, -1.8, 1]}><icosahedronGeometry args={[1.1, 1]} /><meshStandardMaterial color="#071422" emissive="#16415d" emissiveIntensity={.34} /></mesh></group>
    <group name="life-map-depth-middle" data-depth-band="middle" />
    <group name="life-map-depth-far" data-depth-band="far"><Stars radius={70} depth={48} count={reducedMotion ? 500 : 1100} factor={2.4} saturation={.25} fade speed={reducedMotion ? 0 : .08} /></group>
    <MemoryPaths nodes={nodes} activeId={selected?.id || null} />
    {selected && (phase === "approach" || phase === "arrival") ? <group position={selected.position} name="life-map-selected-memory-chamber"><mesh><torusGeometry args={[1.05, .026, 12, 96]} /><meshBasicMaterial color={selected.aura} transparent opacity={phase === "arrival" ? .48 : .28} depthWrite={false} /></mesh><mesh rotation={[0, Math.PI / 2, 0]}><torusGeometry args={[1.28, .018, 12, 96]} /><meshBasicMaterial color={selected.aura} transparent opacity={.2} depthWrite={false} /></mesh></group> : null}
    {nodes.map((node) => <MemoryLens key={node.id} node={node} active={selected?.id === node.id} muted={Boolean(phase === "arrival" && selected && selected.id !== node.id && !selected.connectedTo.includes(node.id))} phase={phase} reducedMotion={reducedMotion} onSelect={onSelect} />)}
  </>;
}

function truthLabel(sourceMode: LifeMapSourceMode) {
  if (sourceMode === "explicit-demo") return "Sample constellation · not your memories";
  if (sourceMode === "signed-out") return "Signed out · no personal data displayed";
  if (sourceMode === "empty") return "Private constellation ready for its first memory";
  if (sourceMode === "unavailable") return "Private memory service resting safely";
  if (sourceMode === "error") return "Private memory data could not be opened";
  return "Private constellation";
}

export default function ComposedLifeMapScene() {
  const router = useRouter();
  const params = useSearchParams();
  const profile = useAdaptiveSpatialQuality();
  const explicitDemoRequested = params.get("demo") === "1";
  const { nodes, loading, sourceMode } = useLifeMapEvents(explicitDemoRequested ? "demo-user" : undefined);
  const queryNode = safeToken(params.get("node") || params.get("memoryId"));
  const manifestId = safeToken(params.get("manifestId"), DEFAULT_MANIFEST_ID);
  const [selectedId, setSelectedId] = useState<string | null>(params.get("overview") === "1" ? null : queryNode || null);
  const [phase, setPhase] = useState<JourneyPhase>(selectedId ? "arrival" : "overview");
  const [webglState, setWebglState] = useState<WebGLState>("ready");
  const timers = useRef<number[]>([]);
  const selected = useMemo(() => nodes.find((node) => node.id === selectedId) || null, [nodes, selectedId]);
  const goal = useMemo<CameraGoal>(() => selected ? goalForNode(selected, phase) : { position: OVERVIEW_POSITION, target: OVERVIEW_TARGET }, [phase, selected]);

  const clearTimers = useCallback(() => { timers.current.forEach((id) => window.clearTimeout(id)); timers.current = []; }, []);
  useEffect(() => () => clearTimers(), [clearTimers]);
  const withIdentity = useCallback((next: URLSearchParams) => { if (explicitDemoRequested) next.set("demo", "1"); if (manifestId) next.set("manifestId", manifestId); return next; }, [explicitDemoRequested, manifestId]);
  const selectNode = useCallback((node: LifeMapNode) => {
    clearTimers(); setSelectedId(node.id);
    if (profile.reducedMotion) setPhase("arrival"); else {
      setPhase("departure");
      timers.current.push(window.setTimeout(() => setPhase("travel"), 220));
      timers.current.push(window.setTimeout(() => setPhase("approach"), 900));
      timers.current.push(window.setTimeout(() => setPhase("arrival"), 1580));
    }
    const next = withIdentity(new URLSearchParams()); next.set("memoryId", node.id); next.set("node", node.id); router.replace(`/life-map?${next.toString()}`, { scroll: false });
  }, [clearTimers, profile.reducedMotion, router, withIdentity]);
  const overview = useCallback(() => { clearTimers(); setSelectedId(null); setPhase("overview"); const next = withIdentity(new URLSearchParams()); next.set("overview", "1"); router.replace(`/life-map?${next.toString()}`, { scroll: false }); }, [clearTimers, router, withIdentity]);
  const destinationHref = useCallback((route: "focus" | "replay") => { if (!selected) return "/life-map"; const next = withIdentity(new URLSearchParams()); next.set("memoryId", selected.id); next.set("node", selected.id); next.set("returnNode", selected.id); next.set("from", "life-map"); return `/${route}?${next.toString()}`; }, [selected, withIdentity]);
  useEffect(() => { if (!queryNode || !nodes.length) return; const node = nodes.find((candidate) => candidate.id === queryNode); if (node && node.id !== selectedId) selectNode(node); }, [nodes, queryNode, selectNode, selectedId]);
  useEffect(() => { const handler = (event: KeyboardEvent) => { if (event.defaultPrevented || event.key !== "Escape" || (event.target instanceof HTMLElement && event.target.matches("input,textarea,select,[role='textbox']"))) return; event.preventDefault(); if (selectedId) overview(); else router.push("/home"); }; window.addEventListener("keydown", handler, true); return () => window.removeEventListener("keydown", handler, true); }, [overview, router, selectedId]);
  useEffect(() => () => { document.body.style.cursor = ""; }, []);

  const recovery = webglState !== "ready";
  return <main className="life-map-root" data-testid="urai-true-3d-life-map" data-spatial-visible="true" data-life-map-source={sourceMode} data-life-map-phase={phase} data-life-map-mode={selected ? "selected" : "overview"} data-webgl-state={webglState} data-home-companion-owned="false">
    <h1 className="sr-only">URAI Life Map private universe</h1>
    <Canvas camera={{ position: OVERVIEW_POSITION, fov: 44, near: .08, far: 120 }} dpr={[1, profile.pixelRatioMax]} gl={{ antialias: profile.antialias, powerPreference: "high-performance" }}><World nodes={nodes} selected={selected} goal={goal} phase={phase} reducedMotion={profile.reducedMotion} onSelect={selectNode} onWebGLStateChange={setWebglState} /></Canvas>
    <header className="life-map-title"><span>URAI · LIFE MAP</span><strong>{selected ? selected.title : "Your private universe"}</strong><em>{truthLabel(sourceMode)}</em></header>
    <div className="life-map-phase" role="status" aria-live="polite">{loading ? "Opening constellation" : phase}</div>
    {selected ? <nav className="life-map-actions" aria-label="Selected memory actions"><button onClick={() => router.push(destinationHref("focus"))}>Enter Focus</button><button disabled={!selected.replayAvailable || selected.locked} onClick={() => router.push(destinationHref("replay"))}>Replay</button><button onClick={overview}>Overview</button></nav> : null}
    <details className="life-map-help"><summary>Explore</summary><div><p>Choose a memory, use Escape to unwind, or select Overview.</p>{nodes.map((node) => <button key={node.id} onClick={() => selectNode(node)}>{node.title}: {node.summary}</button>)}</div></details>
    {recovery ? <section className="life-map-recovery" role="status" aria-live="assertive"><h2>{webglState === "lost" ? "Visual field paused safely" : "Restoring visual field"}</h2><p>Your selected memory and privacy state remain preserved.</p><button onClick={overview}>Open semantic overview</button><button onClick={() => router.push("/home")}>Return Home</button></section> : null}
    <style jsx>{`.life-map-root{position:fixed;inset:0;overflow:hidden;background:#01030a;color:#f8fbff;font-family:Inter,system-ui;isolation:isolate}.life-map-root :global(canvas){position:absolute!important;inset:0;width:100%!important;height:100%!important}.life-map-title{position:absolute;z-index:5;top:max(22px,env(safe-area-inset-top));left:max(22px,env(safe-area-inset-left));display:grid;gap:5px;max-width:min(560px,calc(100vw - 44px));pointer-events:none;text-shadow:0 12px 40px #000}.life-map-title span,.life-map-title em{font:800 10px/1.2 Inter,system-ui;letter-spacing:.22em;text-transform:uppercase;color:rgba(194,244,255,.72);font-style:normal}.life-map-title strong{font:800 clamp(26px,5vw,58px)/.95 Inter,system-ui;letter-spacing:-.055em}.life-map-phase{position:absolute;z-index:6;right:max(20px,env(safe-area-inset-right));top:max(20px,env(safe-area-inset-top));padding:9px 13px;border:1px solid rgba(190,241,255,.2);border-radius:999px;background:rgba(2,7,18,.58);font:800 9px/1 Inter,system-ui;letter-spacing:.16em;text-transform:uppercase}.life-map-actions{position:absolute;z-index:8;left:50%;bottom:max(26px,calc(env(safe-area-inset-bottom) + 14px));transform:translateX(-50%);display:flex;gap:8px;padding:8px;border:1px solid rgba(195,240,255,.18);border-radius:999px;background:rgba(2,7,18,.72)}.life-map-actions button,.life-map-help button,.life-map-recovery button{min-height:48px;border:1px solid rgba(220,248,255,.2);border-radius:999px;background:rgba(10,25,40,.84);color:#f8fbff;padding:0 18px;font-weight:800;cursor:pointer}.life-map-actions button:disabled{opacity:.38}.life-map-help{position:absolute;z-index:8;right:max(20px,env(safe-area-inset-right));bottom:max(20px,env(safe-area-inset-bottom));max-width:min(390px,calc(100vw - 40px));border:1px solid rgba(195,240,255,.18);border-radius:20px;background:rgba(2,7,18,.78)}.life-map-help summary{padding:14px 18px;cursor:pointer;font-weight:800}.life-map-help div{display:grid;max-height:48vh;overflow:auto;gap:8px;padding:0 12px 12px}.life-map-help button{text-align:left;height:auto;padding:12px 14px;border-radius:14px}.life-map-recovery{position:absolute;z-index:20;inset:0;display:grid;place-content:center;justify-items:center;gap:12px;padding:24px;text-align:center;background:rgba(1,3,10,.9)}:global(.life-map-world-label){display:grid;gap:3px;min-width:150px;padding:10px 12px;border:1px solid rgba(205,244,255,.18);border-radius:16px;background:rgba(2,7,18,.72);color:#fff;text-align:left;cursor:pointer}:global(.life-map-world-label[data-active='true']){border-color:rgba(215,250,255,.72);background:rgba(10,35,52,.9)}:global(.life-map-world-label strong){font-size:12px}:global(.life-map-world-label span){font-size:9px;color:rgba(221,241,255,.68)}@media(max-width:700px){.life-map-title{top:max(16px,env(safe-area-inset-top));left:16px;max-width:calc(100vw - 32px)}.life-map-title strong{font-size:30px}.life-map-phase{top:auto;bottom:max(84px,calc(env(safe-area-inset-bottom) + 74px));right:16px}.life-map-actions{bottom:max(16px,env(safe-area-inset-bottom));width:calc(100vw - 32px);justify-content:center}.life-map-actions button{flex:1;padding:0 10px}.life-map-help{right:16px;bottom:max(82px,calc(env(safe-area-inset-bottom) + 72px))}:global(.life-map-world-label){min-width:126px;padding:8px 9px}}@media(prefers-reduced-motion:reduce){.life-map-root *{transition:none!important;animation:none!important}}`}</style>
  </main>;
}
