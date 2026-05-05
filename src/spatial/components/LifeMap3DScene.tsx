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

type EmotionalDirectorState = {
  bloom: number;
  chroma: number;
  dof: number;
  vignette: number;
  fogNear: number;
  fogFar: number;
  label: string;
};

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

const defaultDirector: EmotionalDirectorState = { bloom: 1.25, chroma: 0.001, dof: 2.4, vignette: 0.7, fogNear: 28, fogFar: 96, label: "cinematic orbit" };

function directorFor(node: LifeNode3D | null): EmotionalDirectorState {
  if (!node) return defaultDirector;
  switch (node.kind) {
    case "threshold":
      return { bloom: 1.05, chroma: 0.0018, dof: 3.5, vignette: 0.9, fogNear: 16, fogFar: 58, label: "threshold descent" };
    case "recovery":
      return { bloom: 1.75, chroma: 0.0007, dof: 2.1, vignette: 0.52, fogNear: 30, fogFar: 105, label: "recovery lift" };
    case "dream":
      return { bloom: 1.55, chroma: 0.0022, dof: 4.4, vignette: 0.78, fogNear: 22, fogFar: 76, label: "dream drift" };
    case "mirror":
      return { bloom: 2.05, chroma: 0.0012, dof: 1.7, vignette: 0.42, fogNear: 38, fogFar: 130, label: "mirror reveal" };
    default:
      return { bloom: 1.35, chroma: 0.001, dof: 2.6, vignette: 0.68, fogNear: 26, fogFar: 94, label: "memory glide" };
  }
}

function cameraOffsetFor(node: LifeNode3D): THREE.Vector3 {
  switch (node.kind) {
    case "threshold":
      return new THREE.Vector3(-1.2, 0.9, 5.4);
    case "recovery":
      return new THREE.Vector3(0.4, 4.8, 10.5);
    case "dream":
      return new THREE.Vector3(2.8, 2.2, 8.8);
    case "mirror":
      return new THREE.Vector3(0, 8.8, 24);
    default:
      return new THREE.Vector3(0, 2.4, 8.6);
  }
}

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

function StarField({ intensity }: { intensity: number }) {
  const ref = useRef<THREE.Points>(null);
  const { positions, colors } = useMemo(() => makeStarPositions(2200), []);
  useFrame((_, delta) => {
    if (!ref.current) return;
    ref.current.rotation.y += delta * (0.006 + intensity * 0.004);
    ref.current.rotation.x += delta * 0.002;
  });
  return (
    <points ref={ref} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.16 + intensity * 0.025} vertexColors transparent opacity={0.86 + intensity * 0.1} sizeAttenuation depthWrite={false} />
    </points>
  );
}

function EdgeLines() {
  const geometries = useMemo(() => {
    const map = Object.fromEntries(nodes.map((node) => [node.id, node]));
    return edges.map((edge) => {
      const a = map[edge.sourceId];
      const b = map[edge.targetId];
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(...a.position),
        new THREE.Vector3((a.position[0] + b.position[0]) / 2, (a.position[1] + b.position[1]) / 2 + edge.strength * 2.4, (a.position[2] + b.position[2]) / 2),
        new THREE.Vector3(...b.position),
      ]);
      return { edge, geometry: new THREE.BufferGeometry().setFromPoints(curve.getPoints(48)) };
    });
  }, []);
  return (
    <group>
      {geometries.map(({ edge, geometry }) => (
        <line key={edge.id} geometry={geometry}>
          <lineBasicMaterial color={edge.color} transparent opacity={0.35 + edge.strength * 0.35} />
        </line>
      ))}
    </group>
  );
}

function GravityCluster({ node, active }: { node: LifeNode3D; active: boolean }) {
  const color = useMemo(() => new THREE.Color(node.color), [node.color]);
  return (
    <mesh position={node.position}>
      <sphereGeometry args={[3.2 + node.intensity * 2.2, 32, 32]} />
      <meshBasicMaterial color={color} transparent opacity={active ? 0.055 : 0.026} depthWrite={false} blending={THREE.AdditiveBlending} />
    </mesh>
  );
}

function LifeStar({ node, active, onSelect }: { node: LifeNode3D; active: boolean; onSelect: (node: LifeNode3D) => void }) {
  const group = useRef<THREE.Group>(null);
  const color = useMemo(() => new THREE.Color(node.color), [node.color]);
  useFrame((state, delta) => {
    if (!group.current) return;
    group.current.rotation.y += delta * (0.24 + node.intensity * 0.18);
    group.current.rotation.z += delta * (node.kind === "dream" ? 0.18 : 0.06);
    const pulse = 1 + Math.sin(state.clock.elapsedTime * (1.8 + node.intensity) + node.position[0]) * 0.08;
    group.current.scale.lerp(new THREE.Vector3(active ? 1.65 : pulse, active ? 1.65 : pulse, active ? 1.65 : pulse), 0.08);
  });
  return (
    <group ref={group} position={node.position} onClick={(event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); onSelect(node); }}>
      <mesh>
        <sphereGeometry args={[0.42 + node.intensity * 0.28, 32, 32]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={active ? 3.5 : 1.7 + node.intensity} roughness={0.18} metalness={0.12} />
      </mesh>
      <mesh>
        <sphereGeometry args={[1.08 + node.intensity * 0.8, 32, 32]} />
        <meshBasicMaterial color={color} transparent opacity={active ? 0.22 : 0.08} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh rotation={[Math.PI / 2.4, 0, 0]}>
        <torusGeometry args={[1.2 + node.intensity * 0.7, 0.012, 8, 96]} />
        <meshBasicMaterial color={color} transparent opacity={active ? 0.76 : 0.32} />
      </mesh>
      <mesh rotation={[Math.PI / 1.8, Math.PI / 4, 0]}>
        <torusGeometry args={[1.5 + node.intensity * 0.55, 0.008, 8, 96]} />
        <meshBasicMaterial color={color} transparent opacity={active ? 0.48 : 0.18} />
      </mesh>
    </group>
  );
}

function CameraRig({ selected, onReady, onTourSelect, setDirector }: { selected: LifeNode3D | null; onReady: (api: CameraRigApi) => void; onTourSelect: (node: LifeNode3D) => void; setDirector: (state: EmotionalDirectorState) => void }) {
  const { camera } = useThree();
  const lookTarget = useRef(new THREE.Vector3(0, 0, 0));
  const desired = useRef(new THREE.Vector3(0, 3, 24));
  const velocity = useRef(new THREE.Vector3());
  const roll = useRef(0);
  const tourIndex = useRef(0);

  useMemo(() => {
    onReady({
      focus: (node) => {
        const target = new THREE.Vector3(...node.position);
        const offset = cameraOffsetFor(node);
        const direction = new THREE.Vector3().subVectors(camera.position, target).normalize();
        const overshoot = direction.multiplyScalar(node.kind === "threshold" ? 1.1 : node.kind === "mirror" ? -2.2 : 0.7);
        lookTarget.current.copy(target);
        desired.current.copy(target).add(offset).add(overshoot);
        setDirector(directorFor(node));
      },
      reset: () => {
        lookTarget.current.set(4, 0, -4);
        desired.current.set(0, 4, 28);
        setDirector(defaultDirector);
      },
      tour: () => {
        const node = nodes[tourIndex.current % nodes.length];
        tourIndex.current += 1;
        onTourSelect(node);
        const target = new THREE.Vector3(...node.position);
        lookTarget.current.copy(target);
        desired.current.copy(target).add(cameraOffsetFor(node));
        setDirector(directorFor(node));
      },
    });
  }, [camera.position, onReady, onTourSelect, setDirector]);

  useFrame((state, delta) => {
    const elapsed = state.clock.elapsedTime;
    if (!selected) {
      const t = elapsed * 0.1;
      desired.current.set(Math.sin(t) * 12, 5 + Math.cos(t * 0.7) * 2.2, 29 + Math.sin(t * 0.6) * 4);
      lookTarget.current.set(4 + Math.sin(t * 0.8) * 1.2, Math.cos(t * 0.6) * 0.7, -4);
    } else if (selected.kind === "dream") {
      desired.current.x += Math.sin(elapsed * 0.9) * 0.006;
      desired.current.y += Math.cos(elapsed * 0.7) * 0.005;
    } else if (selected.kind === "recovery") {
      desired.current.y += Math.sin(elapsed * 0.45) * 0.004;
    }

    const gravity = new THREE.Vector3();
    for (const node of nodes) {
      const p = new THREE.Vector3(...node.position);
      const dist = Math.max(camera.position.distanceTo(p), 1.2);
      const pull = (node.intensity * node.intensity) / (dist * dist) * (selected?.id === node.id ? 0.018 : 0.006);
      gravity.add(p.sub(camera.position).normalize().multiplyScalar(pull));
    }

    const targetPosition = desired.current.clone().add(gravity);
    const spring = selected?.kind === "threshold" ? 0.55 : selected?.kind === "mirror" ? 0.82 : 0.7;
    const damping = selected?.kind === "dream" ? 0.86 : 0.8;
    velocity.current.add(targetPosition.sub(camera.position).multiplyScalar(spring * delta));
    velocity.current.multiplyScalar(Math.pow(damping, delta * 60));
    camera.position.add(velocity.current);

    roll.current += ((velocity.current.x * -0.12) - roll.current) * 0.08;
    camera.up.set(Math.sin(roll.current), 1, 0).normalize();
    camera.lookAt(lookTarget.current);
  });

  return null;
}

function SceneWorld({ selected, setSelected, onCameraReady, director, setDirector }: { selected: LifeNode3D | null; setSelected: (node: LifeNode3D | null) => void; onCameraReady: (api: CameraRigApi) => void; director: EmotionalDirectorState; setDirector: (state: EmotionalDirectorState) => void }) {
  return (
    <>
      <color attach="background" args={["#020617"]} />
      <fog attach="fog" args={["#020617", director.fogNear, director.fogFar]} />
      <ambientLight intensity={selected?.kind === "threshold" ? 0.14 : 0.24} />
      <pointLight position={[0, 8, 12]} intensity={2.2} color="#93c5fd" />
      <pointLight position={[15, -4, 12]} intensity={selected?.kind === "recovery" ? 2.5 : 1.8} color="#a78bfa" />
      <StarField intensity={selected?.intensity ?? 0.4} />
      <EdgeLines />
      {nodes.map((node) => <GravityCluster key={`${node.id}-gravity`} node={node} active={selected?.id === node.id} />)}
      {nodes.map((node) => <LifeStar key={node.id} node={node} active={selected?.id === node.id} onSelect={setSelected} />)}
      <CameraRig selected={selected} onReady={onCameraReady} onTourSelect={setSelected} setDirector={setDirector} />
      <EffectComposer>
        <Bloom intensity={director.bloom} luminanceThreshold={0.1} luminanceSmoothing={0.72} />
        <DepthOfField focusDistance={0.018} focalLength={0.035} bokehScale={director.dof} />
        <ChromaticAberration offset={[director.chroma, director.chroma * 1.35]} />
        <Vignette eskil={false} offset={0.18} darkness={director.vignette} />
      </EffectComposer>
    </>
  );
}

export default function LifeMap3DScene() {
  const [selected, setSelected] = useState<LifeNode3D | null>(null);
  const [director, setDirector] = useState<EmotionalDirectorState>(defaultDirector);
  const cameraApi = useRef<CameraRigApi | null>(null);

  function focus(node: LifeNode3D) {
    setSelected(node);
    setDirector(directorFor(node));
    cameraApi.current?.focus(node);
  }

  return (
    <main className="lm3d-root">
      <Canvas camera={{ position: [0, 3, 26], fov: 55, near: 0.1, far: 220 }} dpr={[1, 1.8]} gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}>
        <SceneWorld selected={selected} setSelected={focus} onCameraReady={(api) => { cameraApi.current = api; }} director={director} setDirector={setDirector} />
      </Canvas>
      <section className="lm3d-hero" style={{ ["--aura" as string]: selected?.color ?? "#7dd3fc" } as CSSProperties}>
        <p>{director.label.toUpperCase()}</p>
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
            <button onClick={() => { setSelected(null); setDirector(defaultDirector); cameraApi.current?.reset(); }}>Back to galaxy</button>
          </div>
        </aside>
      ) : null}
      <nav className="lm3d-nav">
        <button onClick={() => { setSelected(null); setDirector(defaultDirector); cameraApi.current?.reset(); }}>Life Map</button>
        <button onClick={() => cameraApi.current?.tour()}>Tour</button>
        <button onClick={() => window.location.assign("/home")}>Home</button>
      </nav>
      <style jsx>{`.lm3d-root{position:fixed;inset:0;overflow:hidden;background:#020617;color:white}.lm3d-hero{position:absolute;top:24px;left:50%;transform:translateX(-50%);width:min(620px,calc(100% - 32px));padding:20px 24px;border:1px solid color-mix(in srgb,var(--aura),white 22%);border-radius:24px;background:rgba(2,6,23,.48);backdrop-filter:blur(18px);box-shadow:0 0 72px color-mix(in srgb,var(--aura),transparent 74%);pointer-events:none}.lm3d-hero p,.lm3d-panel p{margin:0 0 8px;font-size:11px;letter-spacing:.24em;color:#94a3b8;font-weight:800}.lm3d-hero h1{margin:0;font-size:28px}.lm3d-hero span{display:block;margin-top:8px;color:rgba(226,232,240,.88);line-height:1.45}.lm3d-panel{position:absolute;right:22px;top:50%;transform:translateY(-50%);width:min(390px,calc(100% - 44px));padding:20px;border-radius:24px;border:1px solid color-mix(in srgb,var(--aura),white 26%);background:rgba(2,6,23,.68);backdrop-filter:blur(20px);box-shadow:0 0 90px color-mix(in srgb,var(--aura),transparent 66%)}.lm3d-panel h2{margin:0 0 8px;font-size:28px}.lm3d-panel small{color:#cbd5e1}.lm3d-panel span{display:block;margin-top:14px;color:#e2e8f0;line-height:1.55}.lm3d-panel div{display:flex;gap:8px;flex-wrap:wrap;margin-top:16px}.lm3d-nav{position:absolute;bottom:20px;left:50%;transform:translateX(-50%);display:flex;gap:10px;padding:8px;border:1px solid rgba(255,255,255,.12);border-radius:999px;background:rgba(2,6,23,.58);backdrop-filter:blur(14px)}button{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.12);padding:8px 12px;border-radius:999px;color:white;cursor:pointer}button:hover{background:rgba(255,255,255,.18)}@media(max-width:720px){.lm3d-panel{left:14px;right:14px;bottom:82px;top:auto;transform:none;width:auto}.lm3d-hero{top:14px}.lm3d-hero h1{font-size:22px}}`}</style>
    </main>
  );
}
