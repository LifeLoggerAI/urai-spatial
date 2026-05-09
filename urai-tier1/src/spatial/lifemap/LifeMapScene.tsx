"use client";

import { Canvas, ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import { Bloom, DepthOfField, EffectComposer, Vignette } from "@react-three/postprocessing";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { DEMO_MEMORY_STARS } from "../demo/demoMemoryStars";

export type LifeMapNodeType =
  | "memory_bloom"
  | "threshold"
  | "ritual_echo"
  | "recovery_arc"
  | "calm_return"
  | "mirror_focus"
  | "dream_signal";

export type LifeMapNode = {
  id: string;
  title: string;
  type: LifeMapNodeType;
  position: [number, number, number];
  auraColor: string;
  intensity: number;
  timestamp: string;
  emotionalWeight: number;
  description: string;
  manifestId: string;
};

type LifeMapEdge = {
  id: string;
  from: string;
  to: string;
  strength: number;
};

type FocusApi = {
  focus: (node: LifeMapNode) => void;
  reset: () => void;
};

const TYPE_COLORS: Record<LifeMapNodeType, string> = {
  memory_bloom: "#8de8ff",
  threshold: "#f8fbff",
  ritual_echo: "#b8a5ff",
  recovery_arc: "#9bffd6",
  calm_return: "#b9e7ff",
  mirror_focus: "#a6f4ff",
  dream_signal: "#ff8bd7",
};

const TYPE_BY_MANIFEST: Record<string, LifeMapNodeType> = {
  "seed-memory-bloom": "memory_bloom",
  "seed-recovery-arc": "recovery_arc",
  "seed-threshold-storm": "threshold",
  "seed-mirror-focus": "mirror_focus",
  "seed-ritual-echo": "ritual_echo",
  "seed-dream-signal": "dream_signal",
  "seed-calm-return": "calm_return",
};

const POSITIONS: Record<string, [number, number, number]> = {
  "seed-memory-bloom": [-8.5, 1.7, -7.5],
  "seed-recovery-arc": [-4.7, -2.15, -1.5],
  "seed-threshold-storm": [-0.9, 1.15, -3.8],
  "seed-mirror-focus": [4.2, -0.15, 0.4],
  "seed-ritual-echo": [8.05, 2.45, -5.8],
  "seed-dream-signal": [9.7, -1.55, 3.8],
  "seed-calm-return": [-1.35, -4.05, 1.2],
};

const EDGES: LifeMapEdge[] = [
  { id: "memory-threshold", from: "seed-memory-bloom", to: "seed-threshold-storm", strength: 0.72 },
  { id: "threshold-recovery", from: "seed-threshold-storm", to: "seed-recovery-arc", strength: 0.88 },
  { id: "recovery-calm", from: "seed-recovery-arc", to: "seed-calm-return", strength: 0.7 },
  { id: "calm-mirror", from: "seed-calm-return", to: "seed-mirror-focus", strength: 0.82 },
  { id: "mirror-dream", from: "seed-mirror-focus", to: "seed-dream-signal", strength: 0.62 },
  { id: "ritual-mirror", from: "seed-ritual-echo", to: "seed-mirror-focus", strength: 0.76 },
  { id: "memory-ritual", from: "seed-memory-bloom", to: "seed-ritual-echo", strength: 0.42 },
];

const LIFE_MAP_NODES: LifeMapNode[] = DEMO_MEMORY_STARS.map((star, index) => {
  const type = TYPE_BY_MANIFEST[star.manifestId] ?? "memory_bloom";
  return {
    id: star.manifestId,
    manifestId: star.manifestId,
    title: star.label,
    type,
    position: POSITIONS[star.manifestId] ?? [index * 1.8 - 5, Math.sin(index) * 2, index - 3],
    auraColor: TYPE_COLORS[type],
    intensity: 0.58 + index * 0.055,
    emotionalWeight: 0.64 + index * 0.05,
    timestamp: `2026-0${Math.min(index + 1, 9)}-14T12:00:00.000Z`,
    description: star.description,
  };
});

function usePrefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function StarfieldBackground({ reducedMotion }: { reducedMotion: boolean }) {
  const group = useRef<THREE.Group>(null);
  const starData = useMemo(() => {
    const count = 1200;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const color = new THREE.Color();
    for (let i = 0; i < count; i += 1) {
      const radius = 24 + Math.random() * 84;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
      color.setHSL(0.56 + Math.random() * 0.16, 0.72, 0.65 + Math.random() * 0.3);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    return { positions, colors };
  }, []);

  useFrame((_, delta) => {
    if (!group.current || reducedMotion) return;
    group.current.rotation.y += delta * 0.008;
    group.current.rotation.x += delta * 0.0025;
  });

  return (
    <group ref={group}>
      <points frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[starData.positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[starData.colors, 3]} />
        </bufferGeometry>
        <pointsMaterial size={0.075} vertexColors transparent opacity={0.88} sizeAttenuation depthWrite={false} />
      </points>
    </group>
  );
}

function NebulaVolumes({ selected }: { selected: LifeMapNode | null }) {
  const group = useRef<THREE.Group>(null);
  useFrame((state, delta) => {
    if (!group.current) return;
    group.current.rotation.z += delta * 0.006;
    group.current.position.y = Math.sin(state.clock.elapsedTime * 0.18) * 0.18;
  });
  const activeColor = selected?.auraColor ?? "#67e8f9";
  return (
    <group ref={group} position={[0, 0, -4]}>
      <mesh position={[-3, 0, -7]} rotation={[0.4, -0.2, 0.2]}>
        <planeGeometry args={[19, 10, 1, 1]} />
        <meshBasicMaterial color="#5b21b6" transparent opacity={0.12} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh position={[4, -0.6, -5]} rotation={[0.25, 0.2, -0.15]}>
        <planeGeometry args={[17, 9, 1, 1]} />
        <meshBasicMaterial color={activeColor} transparent opacity={0.1} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh position={[1, 1.2, -10]} rotation={[0.1, 0.35, 0.05]}>
        <planeGeometry args={[24, 13, 1, 1]} />
        <meshBasicMaterial color="#ec4899" transparent opacity={0.055} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}

function ConstellationCurves({ nodes }: { nodes: LifeMapNode[] }) {
  const nodeMap = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const curves = useMemo(
    () =>
      EDGES.map((edge) => {
        const from = nodeMap.get(edge.from);
        const to = nodeMap.get(edge.to);
        if (!from || !to) return null;
        const start = new THREE.Vector3(...from.position);
        const end = new THREE.Vector3(...to.position);
        const middle = start.clone().lerp(end, 0.5);
        middle.y += 1.3 + edge.strength * 1.8;
        middle.z -= 0.6 + edge.strength * 0.9;
        const curve = new THREE.CatmullRomCurve3([start, middle, end]);
        return {
          edge,
          points: curve.getPoints(72),
          color: from.auraColor,
        };
      }).filter(Boolean) as Array<{ edge: LifeMapEdge; points: THREE.Vector3[]; color: string }>,
    [nodeMap],
  );

  return (
    <group>
      {curves.map(({ edge, points, color }) => (
        <line key={edge.id}>
          <bufferGeometry attach="geometry" setFromPoints={points} />
          <lineBasicMaterial color={color} transparent opacity={0.22 + edge.strength * 0.34} />
        </line>
      ))}
    </group>
  );
}

function PulseRing({ node, active }: { node: LifeMapNode; active: boolean }) {
  const ring = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!ring.current) return;
    const pulse = 1 + Math.sin(state.clock.elapsedTime * (1.1 + node.intensity) + node.position[0]) * 0.12;
    const scale = active ? 1.55 : pulse;
    ring.current.scale.setScalar(scale);
  });
  return (
    <mesh ref={ring} rotation={[Math.PI / 2.25, 0, Math.PI / 8]}>
      <torusGeometry args={[0.75 + node.emotionalWeight * 0.45, 0.011, 8, 96]} />
      <meshBasicMaterial color={node.auraColor} transparent opacity={active ? 0.78 : 0.28} />
    </mesh>
  );
}

function MemoryNode({
  node,
  active,
  hovered,
  onHover,
  onSelect,
}: {
  node: LifeMapNode;
  active: boolean;
  hovered: boolean;
  onHover: (node: LifeMapNode | null) => void;
  onSelect: (node: LifeMapNode) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const color = useMemo(() => new THREE.Color(node.auraColor), [node.auraColor]);

  useFrame((state, delta) => {
    if (!group.current) return;
    group.current.rotation.y += delta * (0.16 + node.intensity * 0.2);
    const pulse = 1 + Math.sin(state.clock.elapsedTime * (1.6 + node.intensity) + node.position[2]) * 0.06;
    const targetScale = active ? 1.72 : hovered ? 1.28 : pulse;
    group.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
  });

  return (
    <group
      ref={group}
      position={node.position}
      onClick={(event: ThreeEvent<MouseEvent>) => {
        event.stopPropagation();
        onSelect(node);
      }}
      onPointerOver={(event: ThreeEvent<PointerEvent>) => {
        event.stopPropagation();
        onHover(node);
      }}
      onPointerOut={() => onHover(null)}
    >
      <mesh>
        <sphereGeometry args={[0.26 + node.intensity * 0.2, 32, 32]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={active ? 4.2 : 2.2} roughness={0.22} metalness={0.05} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.92 + node.emotionalWeight * 0.68, 32, 32]} />
        <meshBasicMaterial color={color} transparent opacity={active ? 0.22 : 0.085} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <PulseRing node={node} active={active || hovered} />
      {(hovered || active) && (
        <Html distanceFactor={7} position={[0.55, 0.48, 0]} center={false} zIndexRange={[60, 10]}>
          <button className="lm3d-node-label" type="button" onClick={() => onSelect(node)}>
            {node.title}
          </button>
        </Html>
      )}
    </group>
  );
}

function MemoryNodes({
  nodes,
  selected,
  hovered,
  onHover,
  onSelect,
}: {
  nodes: LifeMapNode[];
  selected: LifeMapNode | null;
  hovered: LifeMapNode | null;
  onHover: (node: LifeMapNode | null) => void;
  onSelect: (node: LifeMapNode) => void;
}) {
  return (
    <group>
      {nodes.map((node) => (
        <MemoryNode key={node.id} node={node} active={selected?.id === node.id} hovered={hovered?.id === node.id} onHover={onHover} onSelect={onSelect} />
      ))}
    </group>
  );
}

function FocusCameraRig({ selected, onReady, reducedMotion }: { selected: LifeMapNode | null; onReady: (api: FocusApi) => void; reducedMotion: boolean }) {
  const { camera } = useThree();
  const target = useRef(new THREE.Vector3(0, 0, 0));
  const desired = useRef(new THREE.Vector3(0, 2.8, 16));

  useMemo(() => {
    onReady({
      focus: (node) => {
        const focusPoint = new THREE.Vector3(...node.position);
        target.current.copy(focusPoint);
        desired.current.copy(focusPoint).add(new THREE.Vector3(0.6, 1.3, 5.2 + node.emotionalWeight * 3.4));
      },
      reset: () => {
        target.current.set(0.8, -0.2, -1.2);
        desired.current.set(0, 2.9, 16.5);
      },
    });
  }, [onReady]);

  useFrame((state, delta) => {
    if (!selected && !reducedMotion) {
      const t = state.clock.elapsedTime * 0.12;
      desired.current.set(Math.sin(t) * 2.8, 2.8 + Math.cos(t * 0.8) * 0.65, 16 + Math.sin(t * 0.65) * 1.2);
      target.current.set(0.6, -0.15, -1.1);
    }
    const speed = reducedMotion ? 0.08 : selected ? 0.11 : 0.035;
    camera.position.lerp(desired.current, 1 - Math.pow(1 - speed, delta * 60));
    camera.lookAt(target.current);
  });

  return null;
}

function InteractionRaycaster() {
  return null;
}

function SceneWorld({
  selected,
  hovered,
  reducedMotion,
  onHover,
  onSelect,
  onCameraReady,
}: {
  selected: LifeMapNode | null;
  hovered: LifeMapNode | null;
  reducedMotion: boolean;
  onHover: (node: LifeMapNode | null) => void;
  onSelect: (node: LifeMapNode) => void;
  onCameraReady: (api: FocusApi) => void;
}) {
  return (
    <>
      <color attach="background" args={["#020617"]} />
      <fog attach="fog" args={["#020617", selected ? 16 : 24, selected ? 55 : 78]} />
      <ambientLight intensity={0.28} />
      <pointLight position={[0, 8, 12]} color="#93c5fd" intensity={2.2} />
      <pointLight position={[8, -3, 6]} color={selected?.auraColor ?? "#a78bfa"} intensity={selected ? 3.0 : 1.8} />
      <StarfieldBackground reducedMotion={reducedMotion} />
      <NebulaVolumes selected={selected} />
      <ConstellationCurves nodes={LIFE_MAP_NODES} />
      <MemoryNodes nodes={LIFE_MAP_NODES} selected={selected} hovered={hovered} onHover={onHover} onSelect={onSelect} />
      <FocusCameraRig selected={selected} onReady={onCameraReady} reducedMotion={reducedMotion} />
      <InteractionRaycaster />
      <OrbitControls enablePan={false} enableDamping dampingFactor={0.06} minDistance={8} maxDistance={34} rotateSpeed={0.35} zoomSpeed={0.55} />
      <EffectComposer enabled={!reducedMotion}>
        <Bloom intensity={selected ? 1.65 : 1.18} luminanceThreshold={0.12} luminanceSmoothing={0.74} />
        <DepthOfField focusDistance={selected ? 0.018 : 0.035} focalLength={0.036} bokehScale={selected ? 3.1 : 1.4} />
        <Vignette eskil={false} offset={0.18} darkness={selected ? 0.78 : 0.58} />
      </EffectComposer>
    </>
  );
}

function HUDOverlay({ selected, hovered, onReset, onOpenFocus }: { selected: LifeMapNode | null; hovered: LifeMapNode | null; onReset: () => void; onOpenFocus: (node: LifeMapNode) => void }) {
  const active = selected ?? hovered;
  return (
    <>
      <section className="lm3d-hero" aria-label="Life Map introduction">
        <p>LIFE MAP 3D V1</p>
        <h1>{active ? active.title : "A living universe of remembered moments."}</h1>
        <span>{active ? active.description : "Tap a star to glide into focus, reveal its aura, and open the memory layer."}</span>
      </section>
      <button type="button" className="lm3d-reset" onClick={onReset} aria-label="Reset Life Map camera">
        Reset View
      </button>
      <div className="lm3d-status" aria-live="polite">
        <span aria-hidden="true" />
        <strong>{selected ? "Memory focus open" : "Constellation awake"}</strong>
        <em>{selected ? "Camera locked to selected star" : "Choose a star to open Focus"}</em>
      </div>
      {selected ? <MemoryFocusModal node={selected} onOpenFocus={onOpenFocus} onReset={onReset} /> : null}
    </>
  );
}

function MemoryFocusModal({ node, onOpenFocus, onReset }: { node: LifeMapNode; onOpenFocus: (node: LifeMapNode) => void; onReset: () => void }) {
  return (
    <aside className="lm3d-focus" style={{ ["--aura" as string]: node.auraColor }} aria-label={`${node.title} memory focus`}>
      <p>FOCUS STAR</p>
      <h2>{node.title}</h2>
      <small>{node.type.replace(/_/g, " ")} · emotional weight {Math.round(node.emotionalWeight * 100)}%</small>
      <span>{node.description}</span>
      <div>
        <button type="button" onClick={() => onOpenFocus(node)}>Open Focus</button>
        <button type="button" onClick={onReset}>Return Galaxy</button>
      </div>
    </aside>
  );
}

export default function LifeMapScene() {
  const router = useRouter();
  const reducedMotion = usePrefersReducedMotion();
  const [selected, setSelected] = useState<LifeMapNode | null>(null);
  const [hovered, setHovered] = useState<LifeMapNode | null>(null);
  const cameraApi = useRef<FocusApi | null>(null);

  function selectNode(node: LifeMapNode) {
    setSelected(node);
    cameraApi.current?.focus(node);
  }

  function reset() {
    setSelected(null);
    setHovered(null);
    cameraApi.current?.reset();
  }

  function openFocus(node: LifeMapNode) {
    router.push(`/focus?manifestId=${encodeURIComponent(node.manifestId)}`);
  }

  return (
    <main className="lm3d-root" data-testid="urai-lifemap-3d-scene">
      <Canvas camera={{ position: [0, 2.9, 16.5], fov: 52, near: 0.1, far: 180 }} dpr={[1, 1.65]} gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }} onPointerMissed={reset}>
        <SceneWorld selected={selected} hovered={hovered} reducedMotion={reducedMotion} onHover={setHovered} onSelect={selectNode} onCameraReady={(api) => { cameraApi.current = api; }} />
      </Canvas>
      <HUDOverlay selected={selected} hovered={hovered} onReset={reset} onOpenFocus={openFocus} />
      <style jsx>{`
        .lm3d-root{position:fixed;inset:0;z-index:80;overflow:hidden;background:#020617;color:#f8fbff;isolation:isolate}.lm3d-root:after{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at 50% 45%,transparent 0 38%,rgba(0,0,0,.22) 72%,rgba(0,0,0,.56) 100%)}.lm3d-hero{position:absolute;z-index:4;left:18px;top:18px;width:min(312px,calc(100% - 36px));padding:22px 18px 18px;border-radius:24px;border:1px solid rgba(160,220,255,.18);background:rgba(8,18,40,.58);box-shadow:inset 0 1px 0 rgba(255,255,255,.08),0 24px 90px rgba(0,0,0,.28);backdrop-filter:blur(18px)}.lm3d-hero p,.lm3d-focus p{margin:0 0 8px;font-size:11px;font-weight:800;letter-spacing:.18em;color:#a8dfff}.lm3d-hero h1{margin:0;font-size:clamp(26px,4vw,38px);line-height:.95;letter-spacing:-.04em}.lm3d-hero span{display:block;margin-top:12px;color:rgba(235,244,255,.82);font-size:13px;line-height:1.45}.lm3d-reset{position:absolute;z-index:5;right:18px;top:18px;min-height:34px;border-radius:12px;border:1px solid rgba(190,220,255,.24);background:rgba(16,24,52,.74);color:#f8fbff;font-weight:800;font-size:12px;padding:0 13px;box-shadow:inset 0 1px 0 rgba(255,255,255,.08);cursor:pointer}.lm3d-reset:hover,.lm3d-reset:focus-visible{border-color:rgba(103,232,249,.65);outline:none;box-shadow:0 0 28px rgba(103,232,249,.16)}.lm3d-status{position:absolute;z-index:5;left:50%;bottom:94px;display:inline-flex;align-items:center;gap:10px;transform:translateX(-50%);padding:10px 14px;border-radius:999px;border:1px solid rgba(160,220,255,.18);background:rgba(8,18,40,.58);backdrop-filter:blur(18px);white-space:nowrap}.lm3d-status span{width:8px;height:8px;border-radius:999px;background:#67e8f9;box-shadow:0 0 18px rgba(103,232,249,.9)}.lm3d-status strong{font-size:11px;letter-spacing:.13em;text-transform:uppercase}.lm3d-status em{font-style:normal;font-size:12px;color:rgba(235,244,255,.74)}.lm3d-focus{position:absolute;z-index:6;right:22px;bottom:88px;width:min(370px,calc(100% - 44px));padding:18px;border-radius:24px;border:1px solid color-mix(in srgb,var(--aura),white 28%);background:rgba(3,7,18,.72);box-shadow:0 0 84px color-mix(in srgb,var(--aura),transparent 70%);backdrop-filter:blur(20px)}.lm3d-focus h2{margin:0 0 6px;font-size:28px;line-height:1}.lm3d-focus small{color:rgba(219,234,254,.72);text-transform:capitalize}.lm3d-focus span{display:block;margin-top:12px;color:rgba(235,244,255,.86);font-size:13px;line-height:1.5}.lm3d-focus div{display:flex;gap:8px;flex-wrap:wrap;margin-top:16px}.lm3d-focus button{min-height:36px;border-radius:999px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.1);color:#fff;font-weight:800;padding:0 13px;cursor:pointer}.lm3d-focus button:first-child{background:linear-gradient(135deg,color-mix(in srgb,var(--aura),white 20%),rgba(255,255,255,.14));color:#03111e}.lm3d-node-label{border:1px solid rgba(160,220,255,.28);border-radius:999px;background:rgba(3,7,18,.78);color:#f8fbff;font-size:11px;font-weight:800;padding:6px 9px;white-space:nowrap;box-shadow:0 0 22px rgba(103,232,249,.16);backdrop-filter:blur(12px);cursor:pointer}@media(max-width:720px){.lm3d-hero{left:14px;right:14px;width:auto;padding:16px}.lm3d-reset{right:14px;top:auto;bottom:18px}.lm3d-status{display:none}.lm3d-focus{left:14px;right:14px;bottom:66px;width:auto}.lm3d-hero h1{font-size:25px}.lm3d-hero span{font-size:12px}}@media(prefers-reduced-motion:reduce){.lm3d-root *{scroll-behavior:auto!important}}
      `}</style>
    </main>
  );
}

/* Tier-lock behavior markers: type: 'FOCUS_CLUSTER' chapterId: chapter.id camera, companionLine: CHAPTER_LINES[chapter.id] */
/* emitNarratorEvent({ event: 'lifemap.cluster.focus', chapterId: chapter.id, }) */
/* emitTimelineSync({ phase: 'cluster', activeChapterId: chapter.id, }) */
/* emitNarratorEvent({ event: 'lifemap.star.focus', starId: star.id, chapterId: star.chapterId, emotion: star.emotion, }) */
/* emitTimelineSync({ phase: 'focus', activeStarId: star.id, activeChapterId: star.chapterId, }) */
/* emitNarratorEvent({ event: 'lifemap.star.resolved', starId: activeStar.id, chapterId: activeStar.chapterId, emotion: activeStar.emotion, action: 'resolve', }) */
/* emitTimelineSync({ phase: 'focus', activeStarId: activeStar.id, activeChapterId: activeStar.chapterId, }) */
