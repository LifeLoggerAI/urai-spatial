"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, Stars } from "@react-three/drei";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
  type WheelEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as THREE from "three";
import { useLifeMapEvents } from "./useLifeMapEvents";
import {
  lifeMapTypeLabels,
  narrationForNode,
  type LifeMapNode,
  type LifeMapNodeType,
} from "./lifeMapData";

type CameraIntent = {
  position: [number, number, number];
  target: [number, number, number];
};

const OVERVIEW_CAMERA: CameraIntent = {
  position: [0, 1.05, 10.8],
  target: [0, 0, -0.85],
};

const LIFE_MAP_STATE_KEY = "urai:spatial:lifeMapState";

const MEMORY_TEXTURES: Record<LifeMapNodeType, { accent: string; deep: string; warm: string }> = {
  memory: { accent: "#8adfff", deep: "#061a36", warm: "#d8f8ff" },
  season: { accent: "#73e4ff", deep: "#071e2f", warm: "#e5fbff" },
  ritual: { accent: "#a980ff", deep: "#180d3f", warm: "#f2e7ff" },
  forecast: { accent: "#b68cff", deep: "#160d3c", warm: "#efe5ff" },
  threshold: { accent: "#ff7bd6", deep: "#280822", warm: "#ffe2f5" },
  relationship: { accent: "#d5eaff", deep: "#10182c", warm: "#ffffff" },
  recovery: { accent: "#7ddcff", deep: "#061f2f", warm: "#d9fbff" },
  legacy: { accent: "#d1f5ff", deep: "#081522", warm: "#fff4d1" },
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function toVector3(position: [number, number, number]) {
  return new THREE.Vector3(position[0], position[1], position[2]);
}

function createMemoryTexture(node: LifeMapNode) {
  if (typeof document === "undefined") return null;

  const palette = MEMORY_TEXTURES[node.type];
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const gradient = ctx.createRadialGradient(180, 150, 20, 256, 256, 360);
  gradient.addColorStop(0, palette.warm);
  gradient.addColorStop(0.18, node.aura || palette.accent);
  gradient.addColorStop(0.52, palette.deep);
  gradient.addColorStop(1, "#01040b");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 512);

  ctx.globalCompositeOperation = "screen";
  for (let i = 0; i < 38; i += 1) {
    const x = (Math.sin(i * 31.17 + node.id.length) * 0.5 + 0.5) * 512;
    const y = (Math.cos(i * 17.83 + node.title.length) * 0.5 + 0.5) * 512;
    const r = 8 + ((i * 13) % 42);
    ctx.fillStyle = i % 3 === 0 ? `${palette.accent}55` : `${palette.warm}33`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalCompositeOperation = "source-over";
  ctx.strokeStyle = `${palette.accent}cc`;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(256, 270, 190, 70, -0.23, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(256, 270, 158, 48, 0.34, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "rgba(2, 7, 18, .62)";
  ctx.roundRect(54, 340, 404, 98, 28);
  ctx.fill();
  ctx.fillStyle = palette.warm;
  ctx.font = "900 34px Inter, Arial, sans-serif";
  ctx.fillText(node.title.slice(0, 18), 78, 386);
  ctx.fillStyle = `${palette.accent}`;
  ctx.font = "800 20px Inter, Arial, sans-serif";
  ctx.fillText(lifeMapTypeLabels[node.type].toUpperCase(), 78, 418);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function createLifeMapCurve(from: LifeMapNode, to: LifeMapNode) {
  const start = toVector3(from.position);
  const end = toVector3(to.position);
  const mid = start
    .clone()
    .lerp(end, 0.5)
    .add(new THREE.Vector3(0, 1.05 + Math.abs(start.x - end.x) * 0.1, -1.05));
  return new THREE.CatmullRomCurve3([start, mid, end]);
}

function cameraForNode(node: LifeMapNode): CameraIntent {
  return {
    position: [node.position[0] + 0.9, node.position[1] + 0.52, node.position[2] + 2.7],
    target: node.position,
  };
}

function CameraRig({ intent, exploring }: { intent: CameraIntent; exploring: boolean }) {
  const { camera } = useThree();
  const target = useMemo(() => new THREE.Vector3(...intent.target), [intent.target]);
  const desired = useMemo(() => new THREE.Vector3(...intent.position), [intent.position]);

  useFrame(({ clock }) => {
    const drift = exploring ? new THREE.Vector3(Math.sin(clock.elapsedTime * 0.22) * 0.18, Math.cos(clock.elapsedTime * 0.17) * 0.07, Math.sin(clock.elapsedTime * 0.13) * 0.1) : new THREE.Vector3();
    camera.position.lerp(desired.clone().add(drift), 0.085);
    camera.lookAt(target);
  });

  return null;
}

function GalaxyPlane() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.72, -0.8]}>
        <planeGeometry args={[16, 9, 1, 1]} />
        <meshBasicMaterial color="#092033" transparent opacity={0.2} depthWrite={false} />
      </mesh>
      {[-5.5, -3.5, -1.5, 0.5, 2.5, 4.5].map((x) => (
        <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, -2.65, -0.8]}>
          <planeGeometry args={[0.012, 9]} />
          <meshBasicMaterial color="#7df8ff" transparent opacity={0.08} depthWrite={false} />
        </mesh>
      ))}
      {[-3.8, -2.2, -0.6, 1, 2.6].map((z) => (
        <mesh key={z} rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.64, z]}>
          <planeGeometry args={[16, 0.012]} />
          <meshBasicMaterial color="#b87cff" transparent opacity={0.07} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

function LifeMapPath({ from, to, active }: { from: LifeMapNode; to: LifeMapNode; active: boolean }) {
  const pulseRef = useRef<THREE.Mesh>(null);
  const curve = useMemo(() => createLifeMapCurve(from, to), [from, to]);
  const points = useMemo(() => curve.getPoints(88), [curve]);
  const geometry = useMemo(() => new THREE.BufferGeometry().setFromPoints(points), [points]);

  useFrame(({ clock }) => {
    if (!pulseRef.current) return;
    const t = (clock.elapsedTime * 0.12 + from.intensity * 0.1) % 1;
    pulseRef.current.position.copy(curve.getPointAt(t));
  });

  return (
    <group>
      <primitive object={new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: active ? "#86f4ff" : "#334761", transparent: true, opacity: active ? 0.66 : 0.12 }))} />
      <mesh ref={pulseRef} visible={active}>
        <sphereGeometry args={[0.048, 16, 16]} />
        <meshBasicMaterial color="#eaffff" transparent opacity={0.82} depthWrite={false} />
      </mesh>
    </group>
  );
}

function LifeMapStar({ node, selected, related, onSelect }: { node: LifeMapNode; selected: boolean; related: boolean; onSelect: (node: LifeMapNode) => void }) {
  const groupRef = useRef<THREE.Group>(null);
  const shellRef = useRef<THREE.MeshBasicMaterial>(null);
  const texture = useMemo(() => createMemoryTexture(node), [node]);
  const scale = 0.32 + node.intensity * 0.28;

  useEffect(() => () => texture?.dispose(), [texture]);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const breath = 1 + Math.sin(clock.elapsedTime * (0.72 + node.intensity)) * 0.055;
    groupRef.current.scale.setScalar(selected ? breath * 1.18 : breath);
    groupRef.current.rotation.y += selected ? 0.006 : 0.0024;
    groupRef.current.rotation.x = Math.sin(clock.elapsedTime * 0.18 + node.intensity) * 0.05;
    if (shellRef.current) shellRef.current.opacity = selected ? 0.22 : related ? 0.13 : 0.065;
  });

  const choose = (event?: { stopPropagation: () => void }) => {
    event?.stopPropagation();
    onSelect(node);
  };

  return (
    <group ref={groupRef} position={node.position}>
      <mesh onClick={choose} onPointerOver={() => { document.body.style.cursor = "pointer"; }} onPointerOut={() => { document.body.style.cursor = ""; }}>
        <sphereGeometry args={[scale, 64, 64]} />
        <meshStandardMaterial color="#ffffff" map={texture ?? undefined} emissive={node.aura} emissiveIntensity={selected ? 1.35 : 0.62} roughness={0.18} metalness={0.16} />
      </mesh>
      <mesh>
        <sphereGeometry args={[scale * 1.82, 48, 48]} />
        <meshBasicMaterial ref={shellRef} color={node.aura} transparent opacity={selected ? 0.22 : 0.08} depthWrite={false} />
      </mesh>
      <mesh rotation={[Math.PI / 2.05, 0, 0]}>
        <torusGeometry args={[scale * 1.75, 0.014, 16, 140]} />
        <meshBasicMaterial color={node.aura} transparent opacity={selected ? 0.72 : 0.24} depthWrite={false} />
      </mesh>
      <mesh rotation={[Math.PI / 2.55, 0, Math.PI / 8]}>
        <torusGeometry args={[scale * 2.15, 0.007, 12, 130]} />
        <meshBasicMaterial color="#e9fbff" transparent opacity={selected ? 0.34 : 0.1} depthWrite={false} />
      </mesh>
      <Html distanceFactor={9.4} position={[0, scale * 2.15, 0]} center>
        <button
          type="button"
          onClick={() => onSelect(node)}
          className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] backdrop-blur-xl transition ${selected ? "border-white/70 bg-white/18 text-white shadow-2xl shadow-cyan-300/20" : "border-cyan-100/20 bg-slate-950/45 text-cyan-50/80 hover:border-cyan-100/60"}`}
        >
          {lifeMapTypeLabels[node.type]}
        </button>
      </Html>
    </group>
  );
}

function LifeMapGalaxy({ nodes, selectedNode, onSelectNode }: { nodes: LifeMapNode[]; selectedNode: LifeMapNode | null; onSelectNode: (node: LifeMapNode) => void }) {
  const nodeById = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const related = useMemo(() => {
    if (!selectedNode) return new Set<string>(nodes.map((node) => node.id));
    const set = new Set<string>([selectedNode.id, ...selectedNode.connectedTo]);
    nodes.forEach((node) => {
      if (node.connectedTo.includes(selectedNode.id)) set.add(node.id);
    });
    return set;
  }, [nodes, selectedNode]);

  return (
    <>
      <color attach="background" args={["#01050d"]} />
      <fog attach="fog" args={["#01050d", 8, 24]} />
      <ambientLight intensity={0.55} />
      <pointLight position={[-4, 3, 5]} color="#7df8ff" intensity={2.1} />
      <pointLight position={[4, 1.4, 2]} color="#ff7bd6" intensity={1.7} />
      <pointLight position={[0, -2, 4]} color="#fff0c2" intensity={0.72} />
      <Stars radius={92} depth={62} count={3200} factor={5} saturation={0.5} fade speed={0.35} />
      <GalaxyPlane />

      {nodes.flatMap((node) =>
        node.connectedTo
          .map((targetId) => nodeById.get(targetId))
          .filter((target): target is LifeMapNode => Boolean(target))
          .map((target) => <LifeMapPath key={`${node.id}-${target.id}`} from={node} to={target} active={!selectedNode || related.has(node.id) || related.has(target.id)} />),
      )}

      {nodes.map((node) => <LifeMapStar key={node.id} node={node} selected={selectedNode?.id === node.id} related={related.has(node.id)} onSelect={onSelectNode} />)}
    </>
  );
}

export default function LifeMapScene() {
  const router = useRouter();
  const { nodes, loading, error, usingSeedData } = useLifeMapEvents();
  const [selectedNode, setSelectedNode] = useState<LifeMapNode | null>(null);
  const [cameraIntent, setCameraIntent] = useState<CameraIntent>(OVERVIEW_CAMERA);
  const [narratorText, setNarratorText] = useState("3D Life Map open. Drag to pan, wheel to fly, choose a memory star, then enter Focus or Replay.");
  const dragRef = useRef<{ x: number; y: number; camera: CameraIntent } | null>(null);

  useEffect(() => {
    try {
      window.localStorage.removeItem(LIFE_MAP_STATE_KEY);
    } catch {
      // Best-effort reset only.
    }
  }, []);

  const selectNode = useCallback((node: LifeMapNode) => {
    setSelectedNode(node);
    setCameraIntent(cameraForNode(node));
    setNarratorText(narrationForNode(node).text);
  }, []);

  const recenter = useCallback(() => {
    setSelectedNode(null);
    setCameraIntent(OVERVIEW_CAMERA);
    setNarratorText("The Life Map returned to galaxy overview. Drag to pan, wheel to fly, select a memory star.");
  }, []);

  const onWheel = useCallback((event: WheelEvent<HTMLElement>) => {
    event.preventDefault();
    setCameraIntent((current) => ({
      position: [current.position[0], current.position[1], clamp(current.position[2] + event.deltaY * 0.006, 4.2, 14.2)],
      target: current.target,
    }));
  }, []);

  const onPointerDown = useCallback((event: PointerEvent<HTMLElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { x: event.clientX, y: event.clientY, camera: cameraIntent };
  }, [cameraIntent]);

  const onPointerMove = useCallback((event: PointerEvent<HTMLElement>) => {
    if (!dragRef.current || selectedNode) return;
    const dx = event.clientX - dragRef.current.x;
    const dy = event.clientY - dragRef.current.y;
    const base = dragRef.current.camera;
    const shiftX = dx * -0.010;
    const shiftY = dy * 0.006;
    setCameraIntent({
      position: [clamp(base.position[0] + shiftX, -4.8, 4.8), clamp(base.position[1] + shiftY, -1.4, 3.4), base.position[2]],
      target: [clamp(base.target[0] + shiftX * 0.7, -3.8, 3.8), clamp(base.target[1] + shiftY * 0.45, -1.7, 2.3), base.target[2]],
    });
  }, [selectedNode]);

  const onPointerUp = useCallback((event: PointerEvent<HTMLElement>) => {
    dragRef.current = null;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Pointer may already be released by the browser.
    }
  }, []);

  const openFocus = useCallback(() => {
    if (selectedNode) router.push(`/focus?memoryId=${encodeURIComponent(selectedNode.id)}`);
  }, [router, selectedNode]);

  const openReplay = useCallback(() => {
    if (selectedNode) router.push(`/replay?memoryId=${encodeURIComponent(selectedNode.id)}&manifestId=replay-recovery-thread`);
  }, [router, selectedNode]);

  return (
    <main
      className="relative min-h-screen overflow-hidden bg-[#01050d] text-white"
      data-testid="urai-true-3d-life-map"
      onWheel={onWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_35%,rgba(74,222,255,0.18),transparent_30%),radial-gradient(circle_at_68%_44%,rgba(255,80,210,0.16),transparent_32%),linear-gradient(180deg,#01050d_0%,#040817_55%,#01030a_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,transparent_0_42%,rgba(0,0,0,0.82)_100%)] pointer-events-none" />

      <Canvas className="absolute inset-0" camera={{ position: OVERVIEW_CAMERA.position, fov: 48, near: 0.1, far: 120 }} dpr={[1, 1.75]}>
        <CameraRig intent={cameraIntent} exploring={!selectedNode} />
        <LifeMapGalaxy nodes={nodes} selectedNode={selectedNode} onSelectNode={selectNode} />
      </Canvas>

      <header className="absolute left-4 top-4 z-20 w-[min(360px,calc(100vw-32px))] rounded-3xl border border-cyan-100/15 bg-slate-950/55 p-5 shadow-2xl shadow-cyan-950/30 backdrop-blur-2xl">
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan-200">URAI Spatial · True 3D Life Map</p>
        <h1 className="mt-2 text-6xl font-black leading-[0.78] tracking-[-0.1em] md:text-8xl">Life<br />Map</h1>
        <p className="mt-4 text-sm font-semibold leading-6 text-cyan-50/78">Drag to pan through memory space. Wheel to fly closer. Stars now carry symbolic interior image textures.</p>
        <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-50/80">
          <span className="rounded-full border border-cyan-100/15 bg-cyan-100/10 px-3 py-1">3D camera unlocked</span>
          <span className="rounded-full border border-cyan-100/15 bg-cyan-100/10 px-3 py-1">Image stars</span>
        </div>
      </header>

      <aside className="absolute right-4 top-4 z-20 w-[min(320px,calc(100vw-32px))] rounded-3xl border border-white/10 bg-slate-950/55 p-4 shadow-2xl shadow-fuchsia-950/30 backdrop-blur-2xl">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200">Spatial controls</p>
        <strong className="mt-2 block text-lg">Wheel / drag / select</strong>
        <span className="mt-1 block text-xs font-semibold leading-5 text-slate-200">{loading ? "Loading memory galaxy…" : error ? "Seed galaxy fallback active." : usingSeedData ? "Seed memory galaxy online." : "Live memory galaxy online."}</span>
      </aside>

      <section className="absolute bottom-20 right-4 z-20 w-[min(390px,calc(100vw-32px))] rounded-3xl border border-cyan-100/15 bg-slate-950/62 p-4 shadow-2xl shadow-cyan-950/30 backdrop-blur-2xl" aria-live="polite">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200">Orb companion</p>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-100">{narratorText}</p>
        {selectedNode ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={openFocus} className="rounded-full bg-cyan-100 px-4 py-2 text-xs font-black text-slate-950">Enter Focus</button>
            <button type="button" onClick={openReplay} disabled={!selectedNode.replayAvailable || selectedNode.locked} className="rounded-full border border-white/20 px-4 py-2 text-xs font-black text-white disabled:opacity-35">Replay</button>
            <button type="button" onClick={recenter} className="rounded-full border border-white/20 px-4 py-2 text-xs font-black text-white">Overview</button>
          </div>
        ) : null}
      </section>

      <nav className="absolute bottom-4 left-1/2 z-20 flex max-w-[calc(100vw-24px)] -translate-x-1/2 gap-2 overflow-x-auto rounded-full border border-white/10 bg-slate-950/65 p-2 shadow-2xl shadow-black/40 backdrop-blur-2xl" aria-label="URAI Life Map route portals">
        {[["Home", "/home"], ["Ground", "/ground"], ["Focus", "/focus"], ["Replay", "/replay"], ["Mirror", "/mirror"], ["Passport", "/passport"], ["XR", "/spatial/ar-vr"]].map(([label, href]) => (
          <Link key={href} href={href} className="rounded-full border border-cyan-100/15 px-4 py-2 text-[11px] font-black text-cyan-50 no-underline hover:bg-cyan-100 hover:text-slate-950">{label}</Link>
        ))}
      </nav>
    </main>
  );
}
