"use client";

import { Canvas, ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { Bloom, ChromaticAberration, DepthOfField, EffectComposer, Vignette } from "@react-three/postprocessing";
import type { CSSProperties } from "react";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";

type NodeKind = "memory" | "threshold" | "recovery" | "dream" | "mirror";

type LifeNode3D = {
  id: string;
  kind: NodeKind;
  title: string;
  subtitle: string;
  description: string;
  narratorLine: string;
  color: string;
  position: [number, number, number];
  intensity: number;
};

type LifeEdge3D = { id: string; sourceId: string; targetId: string; color: string; strength: number };

type CameraRigApi = {
  focus: (node: LifeNode3D) => void;
  reset: () => void;
  tour: () => void;
};

const nodes: LifeNode3D[] = [
  { id: "season-becoming", kind: "memory", title: "The Season of Becoming", subtitle: "memory / calm / clarity", description: "A calm life phase becomes visible as a constellation rather than a single event.", narratorLine: "This is where the arc starts to glow.", color: "#7dd3fc", position: [-12, 0, -18], intensity: 0.72 },
  { id: "threshold", kind: "threshold", title: "The Threshold", subtitle: "conflict / shadow / pain", description: "A heavier chapter is held in the map without swallowing the rest of the story.", narratorLine: "This was not the end. It was a crossing.", color: "#fb7185", position: [-3, 4.5, -6], intensity: 0.84 },
  { id: "recovery-arc", kind: "recovery", title: "The Recovery Arc", subtitle: "recovery / growth / purpose", description: "Recovery signals connect into a green path forward instead of isolated rebounds.", narratorLine: "Growth returned through repetition.", color: "#34d399", position: [7, -1, 2], intensity: 0.88 },
  { id: "purple-dream", kind: "dream", title: "The Purple Dream Field", subtitle: "dream / mystery / milestone", description: "Dream, mystery, and memory overlap into a soft violet field.", narratorLine: "The unconscious started leaving breadcrumbs.", color: "#a78bfa", position: [14, 5, -10], intensity: 0.7 },
  { id: "mirror-becoming", kind: "mirror", title: "Mirror of Becoming", subtitle: "rebirth / clarity / purpose", description: "Life phases, repeated patterns, recovery cycles, relationship lessons, and purpose threads connect in one zoom-out.", narratorLine: "The full arc is visible now.", color: "#fde047", position: [19, -3.5, 8], intensity: 0.95 },
];

const edges: LifeEdge3D[] = [
  { id: "e1", sourceId: "season-becoming", targetId: "threshold", color: "#fb7185", strength: 0.72 },
  { id: "e2", sourceId: "threshold", targetId: "recovery-arc", color: "#34d399", strength: 0.88 },
  { id: "e3", sourceId: "recovery-arc", targetId: "purple-dream", color: "#a78bfa", strength: 0.54 },
  { id: "e4", sourceId: "purple-dream", targetId: "mirror-becoming", color: "#fde047", strength: 0.82 },
  { id: "e5", sourceId: "season-becoming", targetId: "mirror-becoming", color: "#93c5fd", strength: 0.42 },
];

function makeStarPositions(count: number) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const color = new THREE.Color();
  for (let i = 0; i < count; i += 1) {
    const r = 38 + Math.random() * 90;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
    color.setHSL(0.58 + Math.random() * 0.14, 0.72, 0.62 + Math.random() * 0.28);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  return { positions, colors };
}

function StarField() {
  const ref = useRef<THREE.Points>(null);
  const { positions, colors } = useMemo(() => makeStarPositions(1800), []);
  useFrame((_, delta) => {
    if (!ref.current) return;
    ref.current.rotation.y += delta * 0.006;
    ref.current.rotation.x += delta * 0.002;
  });
  return (
    <points ref={ref} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.16} vertexColors transparent opacity={0.9} sizeAttenuation depthWrite={false} />
    </points>
  );
}

function EdgeLines() {
  const map = useMemo(() => Object.fromEntries(nodes.map((node) => [node.id, node])), []);
  return (
    <group>
      {edges.map((edge) => {
        const a = map[edge.sourceId];
        const b = map[edge.targetId];
        const points = [new THREE.Vector3(...a.position), new THREE.Vector3(...b.position)];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        return (
          <line key={edge.id} geometry={geometry}>
            <lineBasicMaterial color={edge.color} transparent opacity={0.35 + edge.strength * 0.35} />
          </line>
        );
      })}
    </group>
  );
}

function LifeStar({ node, active, onSelect }: { node: LifeNode3D; active: boolean; onSelect: (node: LifeNode3D) => void }) {
  const group = useRef<THREE.Group>(null);
  const color = useMemo(() => new THREE.Color(node.color), [node.color]);
  useFrame((state, delta) => {
    if (!group.current) return;
    group.current.rotation.y += delta * (0.24 + node.intensity * 0.18);
    const pulse = 1 + Math.sin(state.clock.elapsedTime * (1.8 + node.intensity) + node.position[0]) * 0.08;
    group.current.scale.lerp(new THREE.Vector3(active ? 1.65 : pulse, active ? 1.65 : pulse, active ? 1.65 : pulse), 0.08);
  });
  return (
    <group ref={group} position={node.position} onClick={(event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); onSelect(node); }}>
      <mesh>
        <sphereGeometry args={[0.42 + node.intensity * 0.28, 32, 32]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={active ? 3.2 : 1.7 + node.intensity} roughness={0.2} metalness={0.1} />
      </mesh>
      <mesh>
        <sphereGeometry args={[1.08 + node.intensity * 0.8, 32, 32]} />
        <meshBasicMaterial color={color} transparent opacity={active ? 0.2 : 0.08} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh rotation={[Math.PI / 2.4, 0, 0]}>
        <torusGeometry args={[1.2 + node.intensity * 0.7, 0.012, 8, 96]} />
        <meshBasicMaterial color={color} transparent opacity={active ? 0.72 : 0.32} />
      </mesh>
    </group>
  );
}

function CameraRig({ selected, onReady, onTourSelect }: { selected: LifeNode3D | null; onReady: (api: CameraRigApi) => void; onTourSelect: (node: LifeNode3D) => void }) {
  const { camera } = useThree();
  const target = useRef(new THREE.Vector3(0, 0, 0));
  const desired = useRef(new THREE.Vector3(0, 3, 24));
  const tourIndex = useRef(0);

  useMemo(() => {
    onReady({
      focus: (node) => {
        target.current.set(...node.position);
        desired.current.copy(target.current).add(new THREE.Vector3(0, 1.8, 8.5));
      },
      reset: () => {
        target.current.set(4, 0, -4);
        desired.current.set(0, 4, 28);
      },
      tour: () => {
        const node = nodes[tourIndex.current % nodes.length];
        tourIndex.current += 1;
        onTourSelect(node);
        target.current.set(...node.position);
        desired.current.copy(target.current).add(new THREE.Vector3(0, 2.2, 8.5));
      },
    });
  }, [onReady, onTourSelect]);

  useFrame((state, delta) => {
    if (!selected) {
      const t = state.clock.elapsedTime * 0.12;
      desired.current.set(Math.sin(t) * 9, 4 + Math.cos(t * 0.7) * 1.5, 27 + Math.sin(t * 0.6) * 3);
      target.current.set(4, 0, -4);
    }
    camera.position.lerp(desired.current, 1 - Math.pow(0.02, delta));
    camera.lookAt(target.current);
  });

  return null;
}

function SceneWorld({ selected, setSelected, onCameraReady }: { selected: LifeNode3D | null; setSelected: (node: LifeNode3D | null) => void; onCameraReady: (api: CameraRigApi) => void }) {
  return (
    <>
      <color attach="background" args={["#020617"]} />
      <fog attach="fog" args={["#020617", 26, 94]} />
      <ambientLight intensity={0.22} />
      <pointLight position={[0, 8, 12]} intensity={2.2} color="#93c5fd" />
      <pointLight position={[15, -4, 12]} intensity={1.8} color="#a78bfa" />
      <StarField />
      <EdgeLines />
      {nodes.map((node) => <LifeStar key={node.id} node={node} active={selected?.id === node.id} onSelect={setSelected} />)}
      <CameraRig selected={selected} onReady={onCameraReady} onTourSelect={setSelected} />
      <EffectComposer>
        <Bloom intensity={1.35} luminanceThreshold={0.12} luminanceSmoothing={0.75} />
        <DepthOfField focusDistance={0.018} focalLength={0.035} bokehScale={2.6} />
        <ChromaticAberration offset={[0.0008, 0.0012]} />
        <Vignette eskil={false} offset={0.18} darkness={0.72} />
      </EffectComposer>
    </>
  );
}

export default function LifeMap3DScene() {
  const [selected, setSelected] = useState<LifeNode3D | null>(null);
  const cameraApi = useRef<CameraRigApi | null>(null);

  function focus(node: LifeNode3D) {
    setSelected(node);
    cameraApi.current?.focus(node);
  }

  return (
    <main className="lm3d-root">
      <Canvas camera={{ position: [0, 3, 26], fov: 55, near: 0.1, far: 220 }} dpr={[1, 1.8]} gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}>
        <SceneWorld selected={selected} setSelected={focus} onCameraReady={(api) => { cameraApi.current = api; }} />
      </Canvas>
      <section className="lm3d-hero" style={{ ["--aura" as string]: selected?.color ?? "#7dd3fc" } as CSSProperties}>
        <p>MIRROR OF BECOMING</p>
        <h1>{selected ? selected.title : "The full arc is visible now."}</h1>
        <span>{selected ? selected.narratorLine : "A true 3D LifeMap is online. Tour the arc, enter a star, or let the camera orbit the memory field."}</span>
      </section>
      {selected ? (
        <aside className="lm3d-panel" style={{ ["--aura" as string]: selected.color } as CSSProperties}>
          <p>FOCUS STAR</p>
          <h2>{selected.title}</h2>
          <small>{selected.subtitle}</small>
          <span>{selected.description}</span>
          <div>
            <button onClick={() => cameraApi.current?.tour()}>Next star</button>
            <button onClick={() => { setSelected(null); cameraApi.current?.reset(); }}>Back to galaxy</button>
          </div>
        </aside>
      ) : null}
      <nav className="lm3d-nav">
        <button onClick={() => { setSelected(null); cameraApi.current?.reset(); }}>Life Map</button>
        <button onClick={() => cameraApi.current?.tour()}>Tour</button>
        <button onClick={() => window.location.assign("/home")}>Home</button>
      </nav>
      <style jsx>{`.lm3d-root{position:fixed;inset:0;overflow:hidden;background:#020617;color:white}.lm3d-hero{position:absolute;top:24px;left:50%;transform:translateX(-50%);width:min(620px,calc(100% - 32px));padding:20px 24px;border:1px solid color-mix(in srgb,var(--aura),white 22%);border-radius:24px;background:rgba(2,6,23,.48);backdrop-filter:blur(18px);box-shadow:0 0 72px color-mix(in srgb,var(--aura),transparent 74%);pointer-events:none}.lm3d-hero p,.lm3d-panel p{margin:0 0 8px;font-size:11px;letter-spacing:.24em;color:#94a3b8;font-weight:800}.lm3d-hero h1{margin:0;font-size:28px}.lm3d-hero span{display:block;margin-top:8px;color:rgba(226,232,240,.88);line-height:1.45}.lm3d-panel{position:absolute;right:22px;top:50%;transform:translateY(-50%);width:min(390px,calc(100% - 44px));padding:20px;border-radius:24px;border:1px solid color-mix(in srgb,var(--aura),white 26%);background:rgba(2,6,23,.68);backdrop-filter:blur(20px);box-shadow:0 0 90px color-mix(in srgb,var(--aura),transparent 66%)}.lm3d-panel h2{margin:0 0 8px;font-size:28px}.lm3d-panel small{color:#cbd5e1}.lm3d-panel span{display:block;margin-top:14px;color:#e2e8f0;line-height:1.55}.lm3d-panel div{display:flex;gap:8px;flex-wrap:wrap;margin-top:16px}.lm3d-nav{position:absolute;bottom:20px;left:50%;transform:translateX(-50%);display:flex;gap:10px;padding:8px;border:1px solid rgba(255,255,255,.12);border-radius:999px;background:rgba(2,6,23,.58);backdrop-filter:blur(14px)}button{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.12);padding:8px 12px;border-radius:999px;color:white;cursor:pointer}button:hover{background:rgba(255,255,255,.18)}@media(max-width:720px){.lm3d-panel{left:14px;right:14px;bottom:82px;top:auto;transform:none;width:auto}.lm3d-hero{top:14px}.lm3d-hero h1{font-size:22px}}`}</style>
    </main>
  );
}
