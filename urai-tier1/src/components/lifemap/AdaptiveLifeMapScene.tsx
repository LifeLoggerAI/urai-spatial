"use client";

import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Html, Stars } from "@react-three/drei";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
  type WheelEvent,
} from "react";
import * as THREE from "three";
import { useLifeMapEvents } from "./useLifeMapEvents";
import {
  lifeMapTypeLabels,
  narrationForNode,
  type LifeMapNode,
} from "./lifeMapData";
import {
  markFirstSpatialFrame,
  useAdaptiveSpatialQuality,
  type SpatialQualityProfile,
} from "@/spatial/performance/useAdaptiveSpatialQuality";

type CameraIntent = {
  position: [number, number, number];
  target: [number, number, number];
};

type PersistedLifeMapState = {
  selectedId: string | null;
  cameraIntent: CameraIntent;
};

const OVERVIEW_CAMERA: CameraIntent = {
  position: [0.72, 2.18, 9.65],
  target: [0.05, 0.06, -1.25],
};

const LIFE_MAP_STATE_KEY = "urai:spatial:lifeMapState";
const DEFAULT_MANIFEST_ID = "replay-recovery-thread";

function safeToken(value: string | null, fallback = "") {
  if (!value) return fallback;
  const trimmed = value.trim().slice(0, 120);
  return /^[A-Za-z0-9._:-]+$/.test(trimmed) ? trimmed : fallback;
}

function validVector(value: unknown): value is [number, number, number] {
  return Array.isArray(value) && value.length === 3 && value.every((item) => typeof item === "number" && Number.isFinite(item));
}

function readPersistedState(): PersistedLifeMapState {
  if (typeof window === "undefined") return { selectedId: null, cameraIntent: OVERVIEW_CAMERA };
  try {
    const parsed = JSON.parse(window.localStorage.getItem(LIFE_MAP_STATE_KEY) || "{}") as Partial<PersistedLifeMapState>;
    const camera = parsed.cameraIntent;
    return {
      selectedId: typeof parsed.selectedId === "string" ? parsed.selectedId : null,
      cameraIntent: camera && validVector(camera.position) && validVector(camera.target)
        ? { position: camera.position, target: camera.target }
        : OVERVIEW_CAMERA,
    };
  } catch {
    return { selectedId: null, cameraIntent: OVERVIEW_CAMERA };
  }
}

function cameraForNode(node: LifeMapNode): CameraIntent {
  return {
    position: [node.position[0] + 0.82, node.position[1] + 0.7, node.position[2] + 3.05],
    target: [node.position[0], node.position[1] + 0.04, node.position[2]],
  };
}

function FirstFrame({ profile }: { profile: SpatialQualityProfile }) {
  const marked = useRef(false);
  useFrame(() => {
    if (marked.current || !profile.documentVisible) return;
    marked.current = true;
    markFirstSpatialFrame("/life-map", profile.tier);
  });
  return null;
}

function CameraRig({
  intent,
  reducedMotion,
  visible,
}: {
  intent: CameraIntent;
  reducedMotion: boolean;
  visible: boolean;
}) {
  const { camera } = useThree();
  const desired = useMemo(() => new THREE.Vector3(...intent.position), [intent.position]);
  const target = useMemo(() => new THREE.Vector3(...intent.target), [intent.target]);

  useFrame(() => {
    if (!visible) return;
    camera.position.lerp(desired, reducedMotion ? 1 : 0.095);
    camera.lookAt(target);
  });

  return null;
}

function AdaptiveGalaxy({ profile }: { profile: SpatialQualityProfile }) {
  const group = useRef<THREE.Group>(null);
  const count = Math.max(360, profile.particleCount * 3);
  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const color = new THREE.Color();

    for (let index = 0; index < count; index += 1) {
      const arm = index % 5;
      const progress = index / count;
      const radius = 0.55 + Math.sqrt(progress) * 7.6;
      const angle = progress * 13.8 + arm * ((Math.PI * 2) / 5);
      const jitter = Math.sin(index * 12.9898) * 0.18;
      positions[index * 3] = Math.cos(angle) * radius + jitter;
      positions[index * 3 + 1] = Math.sin(index * 0.43) * 0.6 + (arm - 2) * 0.025;
      positions[index * 3 + 2] = Math.sin(angle) * radius * 0.62 - 2.15 + Math.cos(index * 0.31) * 0.25;
      color.setHSL(0.52 + arm * 0.025, 0.88, 0.68 + Math.sin(index) * 0.1);
      colors[index * 3] = color.r;
      colors[index * 3 + 1] = color.g;
      colors[index * 3 + 2] = color.b;
    }

    const next = new THREE.BufferGeometry();
    next.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    next.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return next;
  }, [count]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame(({ clock }) => {
    if (!group.current || profile.reducedMotion || !profile.documentVisible) return;
    group.current.rotation.y = -0.12 + Math.sin(clock.elapsedTime * 0.08) * 0.055;
    group.current.rotation.z = -0.08 + Math.cos(clock.elapsedTime * 0.06) * 0.025;
  });

  return (
    <group ref={group} rotation={[-0.18, -0.12, -0.06]} position={[0.1, -0.15, -1.25]}>
      <points geometry={geometry} frustumCulled={false}>
        <pointsMaterial size={0.038} vertexColors transparent opacity={0.54} sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
    </group>
  );
}

function Connections({ nodes, selectedId }: { nodes: LifeMapNode[]; selectedId: string | null }) {
  const geometry = useMemo(() => {
    const byId = new Map(nodes.map((node) => [node.id, node]));
    const positions: number[] = [];
    nodes.forEach((node) => {
      node.connectedTo.forEach((targetId) => {
        const target = byId.get(targetId);
        if (!target || node.id > target.id) return;
        positions.push(...node.position, ...target.position);
      });
    });
    const next = new THREE.BufferGeometry();
    next.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    return next;
  }, [nodes]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <lineSegments geometry={geometry} frustumCulled={false}>
      <lineBasicMaterial color={selectedId ? "#8ff6ff" : "#547397"} transparent opacity={selectedId ? 0.34 : 0.16} depthWrite={false} blending={THREE.AdditiveBlending} />
    </lineSegments>
  );
}

function MemoryStar({
  node,
  selected,
  profile,
  onSelect,
}: {
  node: LifeMapNode;
  selected: boolean;
  profile: SpatialQualityProfile;
  onSelect: (node: LifeMapNode) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const segments = profile.tier === "high" ? 48 : profile.tier === "medium" ? 28 : 18;
  const color = useMemo(() => new THREE.Color(node.aura), [node.aura]);

  useFrame(({ clock }) => {
    if (!group.current || profile.reducedMotion || !profile.documentVisible) return;
    const pulse = 1 + Math.sin(clock.elapsedTime * (0.62 + node.intensity) + node.position[0]) * 0.045;
    group.current.scale.setScalar(selected ? pulse * 1.34 : pulse * 0.9);
    group.current.rotation.y += selected ? 0.004 : 0.0014;
  });

  const choose = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    onSelect(node);
  };

  return (
    <group ref={group} position={node.position}>
      <mesh onClick={choose} castShadow={profile.shadows}>
        <sphereGeometry args={[0.32 + node.intensity * 0.22, segments, segments]} />
        <meshStandardMaterial color="#ffffff" emissive={color} emissiveIntensity={selected ? 2.2 : 0.8} roughness={0.2} metalness={0.12} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.78 + node.intensity * 0.35, segments, segments]} />
        <meshBasicMaterial color={node.aura} transparent opacity={selected ? 0.2 : 0.055} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      {selected ? (
        <Html distanceFactor={8.2} position={[0, 0.9, 0]} center zIndexRange={[80, 20]}>
          <span className="rounded-full border border-white/30 bg-slate-950/70 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white backdrop-blur-xl">
            {lifeMapTypeLabels[node.type]}
          </span>
        </Html>
      ) : null}
    </group>
  );
}

function LifeMapWorld({
  nodes,
  selectedId,
  profile,
  cameraIntent,
  onSelect,
}: {
  nodes: LifeMapNode[];
  selectedId: string | null;
  profile: SpatialQualityProfile;
  cameraIntent: CameraIntent;
  onSelect: (node: LifeMapNode) => void;
}) {
  const starCount = profile.tier === "high" ? 4200 : profile.tier === "medium" ? 2400 : 1200;

  return (
    <>
      <FirstFrame profile={profile} />
      <color attach="background" args={["#01030a"]} />
      <fog attach="fog" args={["#01030a", selectedId ? 5 : 7, selectedId ? 20 : 28]} />
      <CameraRig intent={cameraIntent} reducedMotion={profile.reducedMotion} visible={profile.documentVisible} />
      <ambientLight intensity={0.42} />
      <directionalLight position={[-4, 6, 4]} intensity={1.35} color="#dffbff" castShadow={profile.shadows} />
      <pointLight position={[-4, 3, 5]} color="#7df8ff" intensity={2.4} />
      <pointLight position={[4, 1.4, 2]} color="#ff7bd6" intensity={1.8} />
      <Stars radius={104} depth={72} count={starCount} factor={4.8} saturation={0.5} fade speed={profile.reducedMotion ? 0 : 0.22} />
      <AdaptiveGalaxy profile={profile} />
      <group rotation={[-0.13, 0.08, -0.025]} position={[0, -0.08, 0]}>
        <Connections nodes={nodes} selectedId={selectedId} />
        {nodes.map((node) => (
          <MemoryStar key={node.id} node={node} selected={selectedId === node.id} profile={profile} onSelect={onSelect} />
        ))}
      </group>
      {profile.postprocessing && !profile.reducedMotion ? (
        <EffectComposer>
          <Bloom intensity={0.72} luminanceThreshold={0.14} luminanceSmoothing={0.3} />
          <Vignette eskil={false} offset={0.18} darkness={0.58} />
        </EffectComposer>
      ) : null}
    </>
  );
}

export default function AdaptiveLifeMapScene() {
  const router = useRouter();
  const params = useSearchParams();
  const profile = useAdaptiveSpatialQuality();
  const { nodes, loading, error, usingSeedData } = useLifeMapEvents();
  const initial = useRef<PersistedLifeMapState | null>(null);
  if (!initial.current) initial.current = readPersistedState();

  const queryNodeId = safeToken(params.get("node") || params.get("nodeId") || params.get("memoryId"));
  const manifestId = safeToken(params.get("manifestId"), DEFAULT_MANIFEST_ID);
  const [selectedId, setSelectedId] = useState<string | null>(() => queryNodeId || initial.current?.selectedId || null);
  const [cameraIntent, setCameraIntent] = useState<CameraIntent>(() => initial.current?.cameraIntent || OVERVIEW_CAMERA);
  const [narratorText, setNarratorText] = useState("The Life Map is open. Select a star to move inside the memory field.");
  const dragRef = useRef<{ x: number; y: number; camera: CameraIntent } | null>(null);
  const selectedNode = useMemo(() => nodes.find((node) => node.id === selectedId) || null, [nodes, selectedId]);

  useEffect(() => {
    if (!queryNodeId || !nodes.length) return;
    const node = nodes.find((candidate) => candidate.id === queryNodeId);
    if (!node) return;
    setSelectedId(node.id);
    setCameraIntent(cameraForNode(node));
    setNarratorText(narrationForNode(node).text);
  }, [nodes, queryNodeId]);

  useEffect(() => {
    try {
      window.localStorage.setItem(LIFE_MAP_STATE_KEY, JSON.stringify({ selectedId, cameraIntent }));
    } catch {
      // State restoration is best-effort when storage is unavailable.
    }
  }, [cameraIntent, selectedId]);

  const identityHref = useCallback((route: "focus" | "replay", node: LifeMapNode) => {
    const next = new URLSearchParams();
    next.set("memoryId", node.id);
    next.set("manifestId", manifestId);
    next.set("node", node.id);
    next.set("from", "life-map-camera");
    return `/${route}?${next.toString()}`;
  }, [manifestId]);

  const selectNode = useCallback((node: LifeMapNode) => {
    setSelectedId(node.id);
    setCameraIntent(cameraForNode(node));
    setNarratorText(narrationForNode(node).text);
    const next = new URLSearchParams();
    next.set("memoryId", node.id);
    next.set("manifestId", manifestId);
    next.set("node", node.id);
    router.replace(`/life-map?${next.toString()}`, { scroll: false });
  }, [manifestId, router]);

  const recenter = useCallback(() => {
    setSelectedId(null);
    setCameraIntent(OVERVIEW_CAMERA);
    setNarratorText("Back to the whole private constellation. Select any star to enter it.");
    router.replace("/life-map", { scroll: false });
  }, [router]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      if (selectedId) recenter();
      else router.push("/home");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [recenter, router, selectedId]);

  const onWheel = useCallback((event: WheelEvent<HTMLElement>) => {
    event.preventDefault();
    setCameraIntent((current) => ({
      position: [current.position[0], current.position[1], THREE.MathUtils.clamp(current.position[2] + event.deltaY * 0.005, 3.7, 12.4)],
      target: current.target,
    }));
  }, []);

  const onPointerDown = useCallback((event: PointerEvent<HTMLElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { x: event.clientX, y: event.clientY, camera: cameraIntent };
  }, [cameraIntent]);

  const onPointerMove = useCallback((event: PointerEvent<HTMLElement>) => {
    if (!dragRef.current || selectedId) return;
    const dx = event.clientX - dragRef.current.x;
    const dy = event.clientY - dragRef.current.y;
    const base = dragRef.current.camera;
    const shiftX = dx * -0.008;
    const shiftY = dy * 0.005;
    setCameraIntent({
      position: [THREE.MathUtils.clamp(base.position[0] + shiftX, -4.8, 4.8), THREE.MathUtils.clamp(base.position[1] + shiftY, -0.9, 3.2), base.position[2]],
      target: [THREE.MathUtils.clamp(base.target[0] + shiftX * 0.7, -3.8, 3.8), THREE.MathUtils.clamp(base.target[1] + shiftY * 0.45, -1.2, 2.1), base.target[2]],
    });
  }, [selectedId]);

  const onPointerUp = useCallback((event: PointerEvent<HTMLElement>) => {
    dragRef.current = null;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Browser may already have released the pointer.
    }
  }, []);

  return (
    <main
      className="relative min-h-screen overflow-hidden bg-[#01030a] text-white"
      data-testid="urai-true-3d-life-map"
      data-spatial-quality={profile.tier}
      data-spatial-visible={profile.documentVisible ? "true" : "false"}
      onWheel={onWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_34%,rgba(74,222,255,0.14),transparent_28%),radial-gradient(circle_at_71%_43%,rgba(255,80,210,0.13),transparent_30%),linear-gradient(180deg,#01030a_0%,#030712_55%,#010208_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,transparent_0_40%,rgba(0,0,0,0.74)_100%)]" />

      <Canvas
        key={`${profile.tier}-${profile.antialias ? "aa" : "noaa"}`}
        className="absolute inset-0"
        camera={{ position: OVERVIEW_CAMERA.position, fov: 42, near: 0.1, far: 140 }}
        dpr={[1, profile.pixelRatioMax]}
        shadows={profile.shadows}
        frameloop={profile.documentVisible ? "always" : "never"}
        gl={{ antialias: profile.antialias, alpha: false, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          gl.setPixelRatio(Math.min(window.devicePixelRatio, profile.pixelRatioMax));
          gl.shadowMap.enabled = profile.shadows;
        }}
      >
        <LifeMapWorld nodes={nodes} selectedId={selectedId} profile={profile} cameraIntent={cameraIntent} onSelect={selectNode} />
      </Canvas>

      <header className="pointer-events-none absolute left-5 top-5 z-20 max-w-[min(350px,calc(100vw-40px))] drop-shadow-[0_24px_70px_rgba(0,0,0,.62)]">
        <p className="m-0 text-[10px] font-black uppercase tracking-[0.28em] text-cyan-200/90">URAI · Life Map</p>
        <h1 className="mt-1 text-[clamp(2.15rem,4.8vw,4.9rem)] font-black leading-[0.82] tracking-[-0.09em]">Step inside the map.</h1>
        <span className="mt-3 block max-w-[290px] text-xs font-bold leading-5 text-cyan-50/70">Drag, wheel, or select. Focus and Replay keep the same memory identity and return context.</span>
      </header>

      <aside className="pointer-events-none absolute right-5 top-5 z-20 hidden max-w-[270px] rounded-2xl border border-white/10 bg-black/30 p-3 text-cyan-50/75 backdrop-blur-xl md:block">
        <p className="m-0 text-[9px] font-black uppercase tracking-[0.22em] text-cyan-200/80">Adaptive spatial controls</p>
        <span className="mt-1 block text-[11px] font-bold leading-4">{profile.tier} quality · {profile.reducedMotion ? "reduced motion" : "motion active"} · {loading ? "opening galaxy" : error ? "seed galaxy active" : usingSeedData ? "seed memories awake" : "private memories awake"}</span>
      </aside>

      <section className="pointer-events-auto absolute bottom-20 left-1/2 z-30 w-[min(540px,calc(100vw-34px))] -translate-x-1/2 rounded-[28px] border border-cyan-100/15 bg-slate-950/60 p-4 shadow-[0_0_110px_rgba(80,230,255,.16)] backdrop-blur-2xl" aria-live="polite">
        <p className="m-0 text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200/85">{selectedNode ? selectedNode.title : "Orb companion"}</p>
        <p className="mt-1 text-sm font-semibold leading-5 text-slate-100/86">{narratorText}</p>
        {selectedNode ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => router.push(identityHref("focus", selectedNode))} className="rounded-full bg-cyan-100 px-4 py-2 text-xs font-black text-slate-950">Enter Focus</button>
            <button type="button" onClick={() => router.push(identityHref("replay", selectedNode))} disabled={!selectedNode.replayAvailable || selectedNode.locked} className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-black text-white disabled:opacity-35">Replay</button>
            <button type="button" onClick={recenter} className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-black text-white">Overview</button>
          </div>
        ) : null}
      </section>

      <nav className="absolute bottom-4 left-1/2 z-20 flex max-w-[calc(100vw-24px)] -translate-x-1/2 gap-1 overflow-x-auto rounded-full border border-white/10 bg-black/35 p-1.5 backdrop-blur-2xl" aria-label="URAI Life Map route portals">
        <button type="button" onClick={() => router.push("/home")} className="rounded-full border border-cyan-100/10 px-3 py-1.5 text-[10px] font-black text-cyan-50/78">Home</button>
        <button type="button" onClick={() => router.push("/ground")} className="rounded-full border border-cyan-100/10 px-3 py-1.5 text-[10px] font-black text-cyan-50/78">Ground</button>
        {selectedNode ? <button type="button" onClick={() => router.push(identityHref("focus", selectedNode))} className="rounded-full border border-cyan-100/10 px-3 py-1.5 text-[10px] font-black text-cyan-50/78">Focus</button> : null}
        {selectedNode?.replayAvailable ? <button type="button" onClick={() => router.push(identityHref("replay", selectedNode))} className="rounded-full border border-cyan-100/10 px-3 py-1.5 text-[10px] font-black text-cyan-50/78">Replay</button> : null}
        <button type="button" onClick={() => router.push("/mirror")} className="rounded-full border border-cyan-100/10 px-3 py-1.5 text-[10px] font-black text-cyan-50/78">Mirror</button>
        <button type="button" onClick={() => router.push("/passport")} className="rounded-full border border-cyan-100/10 px-3 py-1.5 text-[10px] font-black text-cyan-50/78">Passport</button>
      </nav>
    </main>
  );
}
