"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, Line, Stars } from "@react-three/drei";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useLifeMapEvents, type LifeMapSourceMode } from "./useLifeMapEvents";
import { lifeMapTypeLabels, type LifeMapNode } from "./lifeMapData";
import { useAdaptiveSpatialQuality } from "@/spatial/performance/useAdaptiveSpatialQuality";

const OVERVIEW_POSITION: [number, number, number] = [0, 1.8, 15.8];
const OVERVIEW_TARGET: [number, number, number] = [0, 0, -3.5];
const DEFAULT_MANIFEST_ID = "replay-recovery-thread";
const SELECTED_MEMORY_STANDOFF = 5.6;

type JourneyPhase = "overview" | "departure" | "travel" | "approach" | "arrival";
type WebGLState = "ready" | "lost" | "recovering" | "failed";

type CameraGoal = {
  position: [number, number, number];
  target: [number, number, number];
};

function safeToken(value: string | null, fallback = "") {
  return (value || fallback).replace(/[^a-zA-Z0-9:_-]/g, "").slice(0, 120);
}

function isEditableTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && (
    target.isContentEditable || target.matches("input,textarea,select,[role='textbox']")
  );
}

function goalForNode(node: LifeMapNode): CameraGoal {
  const p = new THREE.Vector3(...node.position);
  const direction = p.lengthSq() > .01 ? p.clone().normalize() : new THREE.Vector3(0, 0, 1);
  const arrival = p.clone().add(direction.multiplyScalar(SELECTED_MEMORY_STANDOFF));
  arrival.y += .75;
  return {
    position: [arrival.x, arrival.y, arrival.z + .6],
    target: [p.x, p.y, p.z],
  };
}

function createRadialTexture() {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  if (!context) return null;
  const gradient = context.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0, "rgba(255,255,255,.72)");
  gradient.addColorStop(.28, "rgba(255,255,255,.32)");
  gradient.addColorStop(.66, "rgba(255,255,255,.08)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  return texture;
}

function AtmosphericDepth({ reducedMotion }: { reducedMotion: boolean }) {
  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);
  const nearRef = useRef<THREE.Group>(null);
  const midRef = useRef<THREE.Group>(null);
  useEffect(() => {
    const nextTexture = createRadialTexture();
    setTexture(nextTexture);
    return () => nextTexture?.dispose();
  }, []);
  useFrame(({ clock, camera }) => {
    if (reducedMotion) return;
    if (nearRef.current) nearRef.current.position.x = camera.position.x * 0.42 + Math.sin(clock.elapsedTime * .08) * .3;
    if (midRef.current) midRef.current.position.x = camera.position.x * 0.18 + Math.sin(clock.elapsedTime * .04) * .16;
  });
  const veil = (position: [number, number, number], scale: [number, number, number], color: string, opacity: number) => (
    <sprite position={position} scale={scale} name="life-map-soft-weather-veil">
      <spriteMaterial map={texture || undefined} color={color} transparent opacity={texture ? opacity : 0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
    </sprite>
  );
  return (
    <>
      <group ref={nearRef} name="life-map-depth-near" data-depth-band="near">
        {veil([-5, 1, 3], [7, 5, 1], "#5adfff", .08)}
        {veil([5, -1, 2], [6, 4, 1], "#9d78ff", .07)}
        <group name="life-map-v122-retired-foreground-crystalline-clutter" userData={{ nonRenderingCompatibilityMarkers: true }} />
      </group>
      <group ref={midRef} name="life-map-depth-middle" data-depth-band="middle">
        {veil([-2.5, 1.8, -5], [8, 4, 1], "#8beeff", .055)}
        {veil([4.5, -1.1, -7], [9, 5, 1], "#c4a5ff", .05)}
      </group>
      <group name="life-map-depth-far" data-depth-band="far">
        <Stars radius={70} depth={48} count={reducedMotion ? 320 : 650} factor={2.4} saturation={.25} fade speed={reducedMotion ? 0 : .08} />
      </group>
    </>
  );
}

function CameraRig({ goal, phase, reducedMotion }: { goal: CameraGoal; phase: JourneyPhase; reducedMotion: boolean }) {
  const { camera, size } = useThree();
  const target = useRef(new THREE.Vector3(...goal.target));
  const currentLook = useRef(new THREE.Vector3());
  useFrame((_, delta) => {
    target.current.set(...goal.target);
    if (camera instanceof THREE.PerspectiveCamera) {
      const nextFov = size.height > size.width ? 52 : 44;
      if (Math.abs(camera.fov - nextFov) > .05) {
        camera.fov = nextFov;
        camera.updateProjectionMatrix();
      }
    }
    if (reducedMotion) {
      camera.position.set(...goal.position);
      camera.lookAt(target.current);
      return;
    }
    const rate = phase === "travel" ? 2.4 : phase === "approach" ? 3.2 : 4.6;
    camera.position.x = THREE.MathUtils.damp(camera.position.x, goal.position[0], rate, delta);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, goal.position[1], rate, delta);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, goal.position[2], rate, delta);
    camera.getWorldDirection(currentLook.current).add(camera.position);
    currentLook.current.lerp(target.current, 1 - Math.exp(-rate * delta));
    camera.lookAt(currentLook.current);
  });
  return null;
}

function WebGLRecoveryBridge({ onStateChange }: { onStateChange: (state: WebGLState) => void }) {
  const { gl } = useThree();

  useEffect(() => {
    const canvas = gl.domElement;
    let recoveryTimer: number | null = null;

    const clearRecoveryTimer = () => {
      if (recoveryTimer !== null) {
        window.clearTimeout(recoveryTimer);
        recoveryTimer = null;
      }
    };
    const lost = (event: Event) => {
      event.preventDefault();
      clearRecoveryTimer();
      onStateChange("lost");
      recoveryTimer = window.setTimeout(() => onStateChange("recovering"), 250);
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

function MemoryLens({ node, active, muted, showLabel, reducedMotion, onSelect }: { node: LifeMapNode; active: boolean; muted: boolean; showLabel: boolean; reducedMotion: boolean; onSelect: (node: LifeMapNode) => void }) {
  const group = useRef<THREE.Group>(null);
  const color = useMemo(() => new THREE.Color(node.aura), [node.aura]);
  useFrame(({ clock }, delta) => {
    if (!group.current) return;
    const scale = active ? 1.34 : muted ? .58 : .82;
    group.current.scale.setScalar(THREE.MathUtils.damp(group.current.scale.x, scale, 5, delta));
    if (!reducedMotion) group.current.rotation.y = Math.sin(clock.elapsedTime * .22 + node.position[0]) * .12;
  });
  return (
    <group ref={group} position={node.position} rotation={[0, node.position[0] * .04, node.position[1] * .03]} name={`life-map-memory-${node.id}`} data-depth-anchor="true">
      <mesh
        onClick={(event) => { event.stopPropagation(); onSelect(node); }}
        onPointerOver={(event) => { event.stopPropagation(); document.body.style.cursor = "pointer"; }}
        onPointerOut={(event) => { event.stopPropagation(); document.body.style.cursor = ""; }}
      >
        <sphereGeometry args={[.30 + node.intensity * .10, 28, 28]} />
        <meshPhysicalMaterial color={color} emissive={color} emissiveIntensity={active ? 1.5 : .55} roughness={.18} metalness={.18} transmission={.18} transparent opacity={muted ? .28 : .9} />
      </mesh>
      {active ? <mesh scale={1.42} name="life-map-selected-memory-halo"><torusGeometry args={[.42, .014, 8, 56]} /><meshBasicMaterial color={color} transparent opacity={.56} depthWrite={false} /></mesh> : null}
      <pointLight color={color} intensity={active ? 5 : 1.4} distance={active ? 7 : 3.5} decay={2} />
      {showLabel ? (
        <Html position={[0, .88, 0]} center distanceFactor={10} occlude="blending">
          <button className="life-map-world-label" data-active={active ? "true" : "false"} onClick={() => onSelect(node)}>
            <strong>{node.title}</strong><span>{lifeMapTypeLabels[node.type]} · {node.dateLabel}</span>
          </button>
        </Html>
      ) : null}
    </group>
  );
}

function MemoryPaths({ nodes, activeId }: { nodes: LifeMapNode[]; activeId: string | null }) {
  const byId = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  return <group name="life-map-anchored-paths" userData={{ hierarchy: "v122-selected-thread-or-sparse-overview" }}>{nodes.flatMap((node) => node.connectedTo.slice(0, 1).map((targetId) => {
    const targetNode = byId.get(targetId);
    if (!targetNode || targetNode.id < node.id) return null;
    const active = activeId === node.id || activeId === targetNode.id;
    if (activeId && !active) return null;
    return <Line key={`${node.id}-${targetNode.id}`} points={[node.position, targetNode.position]} color={active ? "#c8f7ff" : "#38506b"} transparent opacity={active ? .48 : .07} lineWidth={active ? 1.2 : .45} />;
  }))}</group>;
}

function LifeMapWorld({ nodes, selected, goal, phase, reducedMotion, onSelect, onWebGLStateChange }: { nodes: LifeMapNode[]; selected: LifeMapNode | null; goal: CameraGoal; phase: JourneyPhase; reducedMotion: boolean; onSelect: (node: LifeMapNode) => void; onWebGLStateChange: (state: WebGLState) => void }) {
  return (
    <>
      <color attach="background" args={["#01030a"]} />
      <fog attach="fog" args={["#01030a", 12, 42]} />
      <ambientLight intensity={.26} color="#b8dcff" />
      <directionalLight position={[4, 8, 8]} intensity={1.2} color="#d8f5ff" />
      <WebGLRecoveryBridge onStateChange={onWebGLStateChange} />
      <CameraRig goal={goal} phase={phase} reducedMotion={reducedMotion} />
      <AtmosphericDepth reducedMotion={reducedMotion} />
      <MemoryPaths nodes={nodes} activeId={selected?.id || null} />
      {nodes.map((node, index) => <MemoryLens key={node.id} node={node} active={selected?.id === node.id} muted={Boolean(selected && selected.id !== node.id && !selected.connectedTo.includes(node.id))} showLabel={selected ? selected.id === node.id : index < 5} reducedMotion={reducedMotion} onSelect={onSelect} />)}
    </>
  );
}

function truthLabel(sourceMode: LifeMapSourceMode) {
  if (sourceMode === "explicit-demo") return "Sample constellation · not your memories";
  if (sourceMode === "signed-out") return "Signed out · no personal data displayed";
  if (sourceMode === "empty") return "Private constellation ready for its first memory";
  if (sourceMode === "unavailable") return "Private memory service resting safely";
  if (sourceMode === "error") return "Private memory data could not be opened";
  return "Private constellation";
}

export default function AdaptiveLifeMapScene() {
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
  const goal = useMemo<CameraGoal>(() => selected ? goalForNode(selected) : { position: OVERVIEW_POSITION, target: OVERVIEW_TARGET }, [selected]);

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
    clearTimers();
    setSelectedId(node.id);
    if (profile.reducedMotion) setPhase("arrival");
    else {
      setPhase("departure");
      timers.current.push(window.setTimeout(() => setPhase("travel"), 180));
      timers.current.push(window.setTimeout(() => setPhase("approach"), 760));
      timers.current.push(window.setTimeout(() => setPhase("arrival"), 1320));
    }
    const next = withIdentity(new URLSearchParams());
    next.set("memoryId", node.id);
    next.set("node", node.id);
    router.replace(`/life-map?${next.toString()}`, { scroll: false });
  }, [clearTimers, profile.reducedMotion, router, withIdentity]);

  const overview = useCallback(() => {
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
    next.set("from", "life-map");
    return `/${route}?${next.toString()}`;
  }, [selected, withIdentity]);

  useEffect(() => {
    if (!queryNode || !nodes.length) return;
    const node = nodes.find((candidate) => candidate.id === queryNode);
    if (node && node.id !== selectedId) selectNode(node);
  }, [nodes, queryNode, selectNode, selectedId]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.key !== "Escape" || isEditableTarget(event.target)) return;
      event.preventDefault();
      if (selectedId) overview(); else router.push("/home");
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [overview, router, selectedId]);

  useEffect(() => () => {
    document.body.style.cursor = "";
  }, []);

  const recovery = webglState !== "ready";
  return (
    <main className="life-map-root" data-testid="urai-true-3d-life-map" data-spatial-visible="true" data-life-map-source={sourceMode} data-life-map-phase={phase} data-life-map-mode={selected ? "selected" : "overview"} data-webgl-state={webglState} data-home-companion-owned="false">
      <h1 className="sr-only">URAI Life Map private universe</h1>
      <Canvas camera={{ position: OVERVIEW_POSITION, fov: 44, near: .08, far: 120 }} dpr={[1, profile.pixelRatioMax]} gl={{ antialias: profile.antialias, powerPreference: "high-performance" }}>
        <LifeMapWorld nodes={nodes} selected={selected} goal={goal} phase={phase} reducedMotion={profile.reducedMotion} onSelect={selectNode} onWebGLStateChange={setWebglState} />
      </Canvas>

      <header className="life-map-title"><span>URAI · LIFE MAP</span><strong>{selected ? selected.title : "Your private universe"}</strong><em>{truthLabel(sourceMode)}</em></header>
      <div className="life-map-phase" role="status" aria-live="polite">{loading ? "Opening constellation" : phase}</div>

      {selected ? <nav className="life-map-actions" aria-label="Selected memory actions">
        <button type="button" onClick={() => router.push(destinationHref("focus"))}>Enter Focus</button>
        <button type="button" disabled={!selected.replayAvailable || selected.locked} onClick={() => router.push(destinationHref("replay"))}>Replay</button>
        <button type="button" onClick={overview}>Overview</button>
      </nav> : null}

      <details className="life-map-help"><summary>Explore</summary><div><p>Choose a memory, use Escape to unwind, or select Overview.</p>{nodes.map((node) => <button key={node.id} onClick={() => selectNode(node)}>{node.title}: {node.summary}</button>)}</div></details>

      {recovery ? <section className="life-map-recovery" role="status" aria-live="assertive"><h2>{webglState === "lost" ? "Visual field paused safely" : "Restoring visual field"}</h2><p>Your selected memory and privacy state remain preserved.</p><button onClick={overview}>Open semantic overview</button><button onClick={() => router.push("/home")}>Return Home</button></section> : null}

      <style jsx>{`
        .life-map-root{position:fixed;inset:0;overflow:hidden;background:#01030a;color:#f8fbff;font-family:Inter,system-ui;isolation:isolate}.life-map-root :global(canvas){position:absolute!important;inset:0;width:100%!important;height:100%!important}.life-map-title{position:absolute;z-index:5;top:max(22px,env(safe-area-inset-top));left:max(22px,env(safe-area-inset-left));display:grid;gap:5px;max-width:min(560px,calc(100vw - 44px));pointer-events:none;text-shadow:0 12px 40px #000}.life-map-title span,.life-map-title em{font:800 10px/1.2 Inter,system-ui;letter-spacing:.22em;text-transform:uppercase;color:rgba(194,244,255,.72);font-style:normal}.life-map-title strong{font:800 clamp(26px,5vw,58px)/.95 Inter,system-ui;letter-spacing:-.055em}.life-map-phase{position:absolute;z-index:6;right:max(20px,env(safe-area-inset-right));top:max(20px,env(safe-area-inset-top));padding:9px 13px;border:1px solid rgba(190,241,255,.2);border-radius:999px;background:rgba(2,7,18,.58);backdrop-filter:blur(14px);font:800 9px/1 Inter,system-ui;letter-spacing:.16em;text-transform:uppercase}.life-map-actions{position:absolute;z-index:8;left:50%;bottom:max(26px,calc(env(safe-area-inset-bottom) + 14px));transform:translateX(-50%);display:flex;gap:8px;padding:8px;border:1px solid rgba(195,240,255,.18);border-radius:999px;background:rgba(2,7,18,.72);backdrop-filter:blur(18px)}.life-map-actions button,.life-map-help button,.life-map-recovery button{min-height:48px;border:1px solid rgba(220,248,255,.2);border-radius:999px;background:rgba(10,25,40,.84);color:#f8fbff;padding:0 18px;font-weight:800;cursor:pointer}.life-map-actions button:disabled{opacity:.38;cursor:not-allowed}.life-map-help{position:absolute;z-index:8;right:max(20px,env(safe-area-inset-right));bottom:max(20px,env(safe-area-inset-bottom));max-width:min(390px,calc(100vw - 40px));border:1px solid rgba(195,240,255,.18);border-radius:20px;background:rgba(2,7,18,.78);backdrop-filter:blur(18px)}.life-map-help summary{padding:14px 18px;cursor:pointer;font-weight:800}.life-map-help div{display:grid;max-height:48vh;overflow:auto;gap:8px;padding:0 12px 12px}.life-map-help p{font-size:12px;color:rgba(229,244,255,.72)}.life-map-help button{text-align:left;height:auto;padding:12px 14px;border-radius:14px}.life-map-recovery{position:absolute;z-index:20;inset:0;display:grid;place-content:center;justify-items:center;gap:12px;padding:24px;text-align:center;background:rgba(1,3,10,.9);backdrop-filter:blur(22px)}.life-map-recovery h2{font-size:clamp(28px,6vw,64px);margin:0}.life-map-recovery p{color:rgba(230,245,255,.74)}:global(.life-map-world-label){display:grid;gap:3px;min-width:150px;padding:10px 12px;border:1px solid rgba(205,244,255,.18);border-radius:16px;background:rgba(2,7,18,.72);backdrop-filter:blur(14px);color:#fff;text-align:left;cursor:pointer;transform:translateZ(0)}:global(.life-map-world-label[data-active='true']){border-color:rgba(215,250,255,.72);background:rgba(10,35,52,.9)}:global(.life-map-world-label strong){font-size:12px}:global(.life-map-world-label span){font-size:9px;color:rgba(221,241,255,.68)}@media(max-width:700px){.life-map-title{top:max(16px,env(safe-area-inset-top));left:16px}.life-map-title strong{font-size:30px}.life-map-phase{top:auto;bottom:max(84px,calc(env(safe-area-inset-bottom) + 74px));right:16px}.life-map-actions{bottom:max(16px,env(safe-area-inset-bottom));width:calc(100vw - 32px);justify-content:center}.life-map-actions button{flex:1;padding:0 10px}.life-map-help{right:16px;bottom:max(82px,calc(env(safe-area-inset-bottom) + 72px))}}@media(prefers-reduced-motion:reduce){.life-map-root *{scroll-behavior:auto!important;transition:none!important;animation:none!important}}
      `}</style>
    </main>
  );
}
