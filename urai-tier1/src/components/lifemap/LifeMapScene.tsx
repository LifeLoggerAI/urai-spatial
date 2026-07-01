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
  position: [0.72, 2.18, 9.65],
  target: [0.05, 0.06, -1.25],
};

const LIFE_MAP_STATE_KEY = "urai:spatial:lifeMapState";

const MEMORY_TEXTURES: Record<LifeMapNodeType, { accent: string; deep: string; warm: string }> = {
  memory: { accent: "#8adfff", deep: "#061a36", warm: "#e5fbff" },
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

function drawLens(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, color: string, alpha: string) {
  ctx.strokeStyle = `${color}${alpha}`;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, -0.18, 0, Math.PI * 2);
  ctx.stroke();
}

function createMemoryTexture(node: LifeMapNode) {
  if (typeof document === "undefined") return null;

  const palette = MEMORY_TEXTURES[node.type];
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 768;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const gradient = ctx.createRadialGradient(235, 195, 10, 384, 384, 520);
  gradient.addColorStop(0, palette.warm);
  gradient.addColorStop(0.16, node.aura || palette.accent);
  gradient.addColorStop(0.46, palette.deep);
  gradient.addColorStop(1, "#01040b");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 768, 768);

  ctx.globalCompositeOperation = "screen";
  for (let i = 0; i < 64; i += 1) {
    const x = (Math.sin(i * 31.17 + node.id.length) * 0.5 + 0.5) * 768;
    const y = (Math.cos(i * 17.83 + node.title.length) * 0.5 + 0.5) * 768;
    const r = 8 + ((i * 19) % 56);
    ctx.fillStyle = i % 4 === 0 ? `${palette.accent}44` : `${palette.warm}22`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "rgba(255,255,255,.22)";
  ctx.beginPath();
  ctx.arc(274, 214, 76, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalCompositeOperation = "screen";
  ctx.strokeStyle = `${palette.warm}AA`;
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(148, 460);
  ctx.bezierCurveTo(254, 388, 318, 526, 430, 438);
  ctx.bezierCurveTo(520, 368, 570, 402, 634, 336);
  ctx.stroke();

  drawLens(ctx, 384, 396, 258, 74, palette.accent, "CC");
  drawLens(ctx, 390, 398, 196, 46, palette.warm, "66");

  if (node.type === "relationship") {
    ctx.fillStyle = "rgba(255,255,255,.68)";
    ctx.beginPath();
    ctx.arc(282, 394, 48, 0, Math.PI * 2);
    ctx.arc(496, 354, 54, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `${palette.accent}88`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(318, 382);
    ctx.bezierCurveTo(370, 318, 435, 446, 460, 374);
    ctx.stroke();
  }

  if (node.type === "recovery") {
    ctx.strokeStyle = `${palette.accent}99`;
    ctx.lineWidth = 7;
    for (let i = 0; i < 5; i += 1) {
      ctx.beginPath();
      ctx.ellipse(390, 468, 82 + i * 62, 20 + i * 17, 0.08, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  if (node.type === "threshold") {
    ctx.fillStyle = `${palette.accent}66`;
    ctx.beginPath();
    ctx.moveTo(372, 160);
    ctx.lineTo(518, 462);
    ctx.lineTo(250, 462);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.46)";
    ctx.fillRect(356, 272, 34, 190);
  }

  ctx.globalCompositeOperation = "source-over";
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

function createLifeMapCurve(from: LifeMapNode, to: LifeMapNode) {
  const start = toVector3(from.position);
  const end = toVector3(to.position);
  const mid = start
    .clone()
    .lerp(end, 0.5)
    .add(new THREE.Vector3(0, 1.25 + Math.abs(start.x - end.x) * 0.14, -1.2 - Math.abs(start.z - end.z) * 0.08));
  return new THREE.CatmullRomCurve3([start, mid, end]);
}

function cameraForNode(node: LifeMapNode): CameraIntent {
  return {
    position: [node.position[0] + 0.78, node.position[1] + 0.72, node.position[2] + 2.9],
    target: [node.position[0], node.position[1] + 0.02, node.position[2]],
  };
}

function CameraRig({ intent, exploring }: { intent: CameraIntent; exploring: boolean }) {
  const { camera } = useThree();
  const target = useMemo(() => new THREE.Vector3(...intent.target), [intent.target]);
  const desired = useMemo(() => new THREE.Vector3(...intent.position), [intent.position]);

  useFrame(({ clock }) => {
    const drift = exploring
      ? new THREE.Vector3(Math.sin(clock.elapsedTime * 0.17) * 0.34, Math.cos(clock.elapsedTime * 0.14) * 0.12, Math.sin(clock.elapsedTime * 0.11) * 0.18)
      : new THREE.Vector3(Math.sin(clock.elapsedTime * 0.24) * 0.04, Math.cos(clock.elapsedTime * 0.18) * 0.03, 0);
    camera.position.lerp(desired.clone().add(drift), exploring ? 0.045 : 0.095);
    camera.lookAt(target);
  });

  return null;
}

function GalaxySpiral() {
  const groupRef = useRef<THREE.Group>(null);
  const geometry = useMemo(() => {
    const count = 1450;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const color = new THREE.Color();

    for (let i = 0; i < count; i += 1) {
      const arm = i % 5;
      const t = i / count;
      const radius = 0.55 + Math.sqrt(t) * 7.6;
      const angle = t * 13.8 + arm * ((Math.PI * 2) / 5);
      const jitter = Math.sin(i * 12.9898) * 0.18;
      positions[i * 3] = Math.cos(angle) * radius + jitter;
      positions[i * 3 + 1] = Math.sin(i * 0.43) * 0.6 + (arm - 2) * 0.025;
      positions[i * 3 + 2] = Math.sin(angle) * radius * 0.62 - 2.15 + Math.cos(i * 0.31) * 0.25;
      color.setHSL(0.52 + (arm * 0.025), 0.88, 0.68 + Math.sin(i) * 0.1);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    const points = new THREE.BufferGeometry();
    points.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    points.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return points;
  }, []);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y = -0.12 + Math.sin(clock.elapsedTime * 0.08) * 0.055;
    groupRef.current.rotation.z = -0.08 + Math.cos(clock.elapsedTime * 0.06) * 0.025;
  });

  return (
    <group ref={groupRef} rotation={[-0.18, -0.12, -0.06]} position={[0.1, -0.15, -1.25]}>
      <points geometry={geometry} frustumCulled={false}>
        <pointsMaterial size={0.038} vertexColors transparent opacity={0.54} sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
    </group>
  );
}

function GalaxyDepthVolumes() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.z = Math.sin(clock.elapsedTime * 0.07) * 0.025;
  });

  return (
    <group ref={groupRef} position={[0, 0, -1.6]}>
      <mesh position={[-2.8, 0.35, -4.6]} rotation={[0.2, -0.42, 0.28]}>
        <planeGeometry args={[8.6, 5.1, 1, 1]} />
        <meshBasicMaterial color="#50e6ff" transparent opacity={0.05} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh position={[3.8, -0.1, -3.2]} rotation={[0.1, 0.36, -0.32]}>
        <planeGeometry args={[9.6, 6.2, 1, 1]} />
        <meshBasicMaterial color="#c06cff" transparent opacity={0.06} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh position={[0.8, -1.55, -1.15]} rotation={[-Math.PI / 2.28, 0, 0.18]}>
        <ringGeometry args={[2.9, 3.02, 180]} />
        <meshBasicMaterial color="#7df8ff" transparent opacity={0.12} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh position={[0.8, -1.57, -1.15]} rotation={[-Math.PI / 2.28, 0, 0.18]}>
        <ringGeometry args={[4.45, 4.52, 180]} />
        <meshBasicMaterial color="#b87cff" transparent opacity={0.08} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}

function LifeMapPath({ from, to, active }: { from: LifeMapNode; to: LifeMapNode; active: boolean }) {
  const pulseRef = useRef<THREE.Mesh>(null);
  const curve = useMemo(() => createLifeMapCurve(from, to), [from, to]);
  const tube = useMemo(() => new THREE.TubeGeometry(curve, 96, active ? 0.013 : 0.006, 8, false), [curve, active]);

  useEffect(() => () => tube.dispose(), [tube]);

  useFrame(({ clock }) => {
    if (!pulseRef.current) return;
    const t = (clock.elapsedTime * 0.1 + from.intensity * 0.1) % 1;
    pulseRef.current.position.copy(curve.getPointAt(t));
  });

  return (
    <group>
      <mesh geometry={tube}>
        <meshBasicMaterial color={active ? "#9ef8ff" : "#334761"} transparent opacity={active ? 0.48 : 0.075} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh ref={pulseRef} visible={active}>
        <sphereGeometry args={[0.042, 16, 16]} />
        <meshBasicMaterial color="#eaffff" transparent opacity={0.78} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}

function LifeMapStar({ node, selected, related, onSelect }: { node: LifeMapNode; selected: boolean; related: boolean; onSelect: (node: LifeMapNode) => void }) {
  const groupRef = useRef<THREE.Group>(null);
  const shellRef = useRef<THREE.MeshBasicMaterial>(null);
  const texture = useMemo(() => createMemoryTexture(node), [node]);
  const color = useMemo(() => new THREE.Color(node.aura), [node.aura]);
  const scale = 0.38 + node.intensity * 0.33;

  useEffect(() => () => texture?.dispose(), [texture]);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const breath = 1 + Math.sin(clock.elapsedTime * (0.62 + node.intensity) + node.position[0]) * 0.045;
    groupRef.current.scale.setScalar(selected ? breath * 1.34 : related ? breath : breath * 0.88);
    groupRef.current.rotation.y += selected ? 0.005 : 0.0018;
    groupRef.current.rotation.x = Math.sin(clock.elapsedTime * 0.16 + node.intensity) * 0.055;
    if (shellRef.current) shellRef.current.opacity = selected ? 0.24 : related ? 0.105 : 0.032;
  });

  const choose = (event?: { stopPropagation: () => void }) => {
    event?.stopPropagation();
    onSelect(node);
  };

  return (
    <group ref={groupRef} position={node.position}>
      <mesh onClick={choose} onPointerOver={() => { document.body.style.cursor = "pointer"; }} onPointerOut={() => { document.body.style.cursor = ""; }}>
        <sphereGeometry args={[scale, 96, 96]} />
        <meshStandardMaterial color="#ffffff" map={texture ?? undefined} emissive={color} emissiveIntensity={selected ? 1.6 : related ? 0.74 : 0.3} roughness={0.16} metalness={0.18} />
      </mesh>
      <mesh>
        <sphereGeometry args={[scale * 2.05, 64, 64]} />
        <meshBasicMaterial ref={shellRef} color={node.aura} transparent opacity={selected ? 0.24 : 0.08} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh rotation={[Math.PI / 2.05, 0, 0]}>
        <torusGeometry args={[scale * 1.92, 0.012, 16, 150]} />
        <meshBasicMaterial color={node.aura} transparent opacity={selected ? 0.76 : related ? 0.2 : 0.07} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh rotation={[Math.PI / 2.55, 0, Math.PI / 8]}>
        <torusGeometry args={[scale * 2.36, 0.006, 12, 140]} />
        <meshBasicMaterial color="#e9fbff" transparent opacity={selected ? 0.32 : 0.075} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      {selected ? (
        <Html distanceFactor={8.2} position={[0, scale * 2.1, 0]} center zIndexRange={[80, 20]}>
          <button
            type="button"
            onClick={() => onSelect(node)}
            className="rounded-full border border-white/30 bg-slate-950/55 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white shadow-2xl shadow-cyan-300/20 backdrop-blur-xl"
          >
            {lifeMapTypeLabels[node.type]}
          </button>
        </Html>
      ) : null}
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
      <color attach="background" args={["#01030a"]} />
      <fog attach="fog" args={["#01030a", selectedNode ? 5 : 7, selectedNode ? 20 : 28]} />
      <ambientLight intensity={0.42} />
      <pointLight position={[-4, 3, 5]} color="#7df8ff" intensity={2.4} />
      <pointLight position={[4, 1.4, 2]} color="#ff7bd6" intensity={1.8} />
      <pointLight position={[0, -2, 4]} color="#fff0c2" intensity={0.7} />
      <Stars radius={104} depth={72} count={4200} factor={4.8} saturation={0.5} fade speed={0.22} />
      <GalaxySpiral />
      <GalaxyDepthVolumes />

      <group rotation={[-0.13, 0.08, -0.025]} position={[0, -0.08, 0]}>
        {nodes.flatMap((node) =>
          node.connectedTo
            .map((targetId) => nodeById.get(targetId))
            .filter((target): target is LifeMapNode => Boolean(target))
            .map((target) => <LifeMapPath key={`${node.id}-${target.id}`} from={node} to={target} active={!selectedNode || related.has(node.id) || related.has(target.id)} />),
        )}

        {nodes.map((node) => <LifeMapStar key={node.id} node={node} selected={selectedNode?.id === node.id} related={related.has(node.id)} onSelect={onSelectNode} />)}
      </group>
    </>
  );
}

export default function LifeMapScene() {
  const router = useRouter();
  const { nodes, loading, error, usingSeedData } = useLifeMapEvents();
  const [selectedNode, setSelectedNode] = useState<LifeMapNode | null>(null);
  const [cameraIntent, setCameraIntent] = useState<CameraIntent>(OVERVIEW_CAMERA);
  const [narratorText, setNarratorText] = useState("The Life Map is open. Select a star to move inside the memory field.");
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
    setNarratorText("Back to the whole private constellation. Select any star to enter it.");
  }, []);

  const onWheel = useCallback((event: WheelEvent<HTMLElement>) => {
    event.preventDefault();
    setCameraIntent((current) => ({
      position: [current.position[0], current.position[1], clamp(current.position[2] + event.deltaY * 0.005, 3.7, 12.4)],
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
    const shiftX = dx * -0.008;
    const shiftY = dy * 0.005;
    setCameraIntent({
      position: [clamp(base.position[0] + shiftX, -4.8, 4.8), clamp(base.position[1] + shiftY, -0.9, 3.2), base.position[2]],
      target: [clamp(base.target[0] + shiftX * 0.7, -3.8, 3.8), clamp(base.target[1] + shiftY * 0.45, -1.2, 2.1), base.target[2]],
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
      className="relative min-h-screen overflow-hidden bg-[#01030a] text-white"
      data-testid="urai-true-3d-life-map"
      onWheel={onWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_34%,rgba(74,222,255,0.14),transparent_28%),radial-gradient(circle_at_71%_43%,rgba(255,80,210,0.13),transparent_30%),linear-gradient(180deg,#01030a_0%,#030712_55%,#010208_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,transparent_0_40%,rgba(0,0,0,0.74)_100%)]" />

      <Canvas className="absolute inset-0" camera={{ position: OVERVIEW_CAMERA.position, fov: 42, near: 0.1, far: 140 }} dpr={[1, 1.85]} gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}>
        <CameraRig intent={cameraIntent} exploring={!selectedNode} />
        <LifeMapGalaxy nodes={nodes} selectedNode={selectedNode} onSelectNode={selectNode} />
      </Canvas>

      <header className="pointer-events-none absolute left-5 top-5 z-20 max-w-[min(330px,calc(100vw-40px))] text-white drop-shadow-[0_24px_70px_rgba(0,0,0,.62)]">
        <p className="m-0 text-[10px] font-black uppercase tracking-[0.28em] text-cyan-200/90">URAI · Life Map</p>
        <h1 className="mt-1 text-[clamp(2.15rem,4.8vw,4.9rem)] font-black leading-[0.82] tracking-[-0.09em]">Step inside the map.</h1>
        <span className="mt-3 block max-w-[260px] text-xs font-bold leading-5 text-cyan-50/70">Private memory stars. Camera flies. Focus opens from the star, not a dashboard.</span>
      </header>

      <aside className="pointer-events-none absolute right-5 top-5 z-20 hidden max-w-[250px] rounded-2xl border border-white/10 bg-black/22 p-3 text-cyan-50/75 shadow-2xl shadow-black/40 backdrop-blur-xl md:block">
        <p className="m-0 text-[9px] font-black uppercase tracking-[0.22em] text-cyan-200/80">Spatial controls</p>
        <span className="mt-1 block text-[11px] font-bold leading-4">Drag / wheel / select. {loading ? "Opening galaxy…" : error ? "Seed galaxy active." : usingSeedData ? "Seed memories awake." : "Live memories awake."}</span>
      </aside>

      <section className="pointer-events-auto absolute bottom-20 left-1/2 z-30 w-[min(520px,calc(100vw-34px))] -translate-x-1/2 rounded-[28px] border border-cyan-100/15 bg-slate-950/54 p-4 shadow-[0_0_110px_rgba(80,230,255,.16)] backdrop-blur-2xl" aria-live="polite">
        <div className="flex items-start gap-3">
          <div className="mt-1 h-10 w-10 shrink-0 rounded-full bg-[radial-gradient(circle_at_35%_30%,white_0_12%,rgba(255,255,255,.55)_13%_24%,transparent_25%),radial-gradient(circle,#9ff8ff_0_24%,#52bfff_44%,rgba(32,77,160,.28)_74%)] shadow-[0_0_36px_rgba(120,235,255,.75),0_0_90px_rgba(120,235,255,.28)]" />
          <div className="min-w-0 flex-1">
            <p className="m-0 text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200/85">{selectedNode ? selectedNode.title : "Orb companion"}</p>
            <p className="mt-1 line-clamp-2 text-sm font-semibold leading-5 text-slate-100/86">{narratorText}</p>
            {selectedNode ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={openFocus} className="rounded-full bg-cyan-100 px-4 py-2 text-xs font-black text-slate-950 shadow-[0_0_34px_rgba(103,232,249,.24)]">Enter Focus</button>
                <button type="button" onClick={openReplay} disabled={!selectedNode.replayAvailable || selectedNode.locked} className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-black text-white disabled:opacity-35">Replay</button>
                <button type="button" onClick={recenter} className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-black text-white">Overview</button>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <nav className="absolute bottom-4 left-1/2 z-20 flex max-w-[calc(100vw-24px)] -translate-x-1/2 gap-1 overflow-x-auto rounded-full border border-white/10 bg-black/28 p-1.5 shadow-2xl shadow-black/50 backdrop-blur-2xl" aria-label="URAI Life Map route portals">
        {[["Home", "/home"], ["Ground", "/ground"], ["Focus", "/focus"], ["Replay", "/replay"], ["Mirror", "/mirror"], ["Passport", "/passport"], ["XR", "/spatial/ar-vr"]].map(([label, href]) => (
          <Link key={href} href={href} className="rounded-full border border-cyan-100/10 px-3 py-1.5 text-[10px] font-black text-cyan-50/78 no-underline hover:bg-cyan-100 hover:text-slate-950">{label}</Link>
        ))}
      </nav>
    </main>
  );
}
