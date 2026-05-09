"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, Stars } from "@react-three/drei";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as THREE from "three";
import { LifeMapHud, type LifeMapMode } from "./LifeMapHud";
import { LifeMapNodeCard } from "./LifeMapNodeCard";
import { LifeMapReplayOverlay } from "./LifeMapReplayOverlay";
import type { LifeMapNode, LifeMapNodeType } from "./lifeMapData";
import { lifeMapFilters, lifeMapNodes, lifeMapTypeLabels } from "./lifeMapData";

type CameraSnapshot = {
  position: [number, number, number];
  target: [number, number, number];
};

type CameraIntent = CameraSnapshot;

const OVERVIEW_CAMERA: CameraIntent = {
  position: [0, 0.55, 9.8],
  target: [0, 0, -0.8],
};

function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function toVector3(position: [number, number, number]) {
  return new THREE.Vector3(position[0], position[1], position[2]);
}

function CameraRig({ intent, mode }: { intent: CameraIntent; mode: LifeMapMode }) {
  const { camera } = useThree();
  const target = useMemo(() => new THREE.Vector3(...intent.target), [intent.target]);
  const desired = useMemo(() => new THREE.Vector3(...intent.position), [intent.position]);
  const reducedMotion = useMemo(prefersReducedMotion, []);

  useFrame(({ clock }) => {
    const drift = mode === "lifemap" && !reducedMotion ? Math.sin(clock.elapsedTime * 0.18) * 0.18 : 0;
    const desiredWithDrift = desired.clone().add(new THREE.Vector3(drift, drift * 0.18, 0));
    camera.position.lerp(desiredWithDrift, reducedMotion ? 1 : 0.055);
    camera.lookAt(target);
  });

  return null;
}

function LifeMapPath({
  from,
  to,
  active,
}: {
  from: LifeMapNode;
  to: LifeMapNode;
  active: boolean;
}) {
  const geometry = useMemo(() => {
    const start = toVector3(from.position);
    const end = toVector3(to.position);
    const mid = start
      .clone()
      .lerp(end, 0.5)
      .add(new THREE.Vector3(0, 0.9 + Math.abs(start.x - end.x) * 0.08, -0.7));
    const curve = new THREE.CatmullRomCurve3([start, mid, end]);
    const points = curve.getPoints(64);
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [from, to]);

  return (
    <line geometry={geometry}>
      <lineBasicMaterial
        transparent
        color={active ? "#8adfff" : "#496486"}
        opacity={active ? 0.72 : 0.2}
        linewidth={1}
      />
    </line>
  );
}

function LifeMapNodeMesh({
  node,
  selected,
  dimmed,
  onSelect,
}: {
  node: LifeMapNode;
  selected: boolean;
  dimmed: boolean;
  onSelect: (node: LifeMapNode) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const reducedMotion = useMemo(prefersReducedMotion, []);
  const scale = 0.22 + node.intensity * 0.2;

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const pulse = reducedMotion ? 1 : 1 + Math.sin(clock.elapsedTime * (1.2 + node.intensity)) * 0.045;
    groupRef.current.scale.setScalar(selected ? pulse * 1.28 : pulse);
    groupRef.current.rotation.y += reducedMotion ? 0 : 0.0025;
  });

  return (
    <group ref={groupRef} position={node.position}>
      <mesh onClick={(event) => {
        event.stopPropagation();
        onSelect(node);
      }}>
        <sphereGeometry args={[scale, 40, 40]} />
        <meshStandardMaterial
          color={node.aura}
          emissive={node.aura}
          emissiveIntensity={selected ? 2.3 : dimmed ? 0.55 : 1.35}
          roughness={0.22}
          metalness={0.12}
          transparent
          opacity={dimmed ? 0.45 : 0.95}
        />
      </mesh>

      <mesh>
        <sphereGeometry args={[scale * 2.1, 40, 40]} />
        <meshBasicMaterial
          color={node.aura}
          transparent
          opacity={selected ? 0.18 : dimmed ? 0.035 : 0.1}
          depthWrite={false}
        />
      </mesh>

      <mesh rotation={[Math.PI / 2.15, 0, 0]}>
        <torusGeometry args={[scale * 1.85, 0.008, 16, 96]} />
        <meshBasicMaterial
          color={node.aura}
          transparent
          opacity={selected ? 0.56 : dimmed ? 0.08 : 0.2}
        />
      </mesh>

      <Html distanceFactor={8} position={[0, scale * 2.35, 0]} center>
        <button
          type="button"
          onClick={() => onSelect(node)}
          className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] backdrop-blur-xl transition ${
            selected
              ? "border-cyan-100/70 bg-cyan-100/20 text-cyan-50 shadow-xl shadow-cyan-400/20"
              : dimmed
                ? "border-white/10 bg-slate-950/20 text-white/25"
                : "border-cyan-100/25 bg-slate-950/35 text-cyan-50/80 hover:border-cyan-100/55 hover:bg-cyan-100/10"
          }`}
        >
          {lifeMapTypeLabels[node.type]}
        </button>
      </Html>
    </group>
  );
}

function LifeMapGalaxy({
  nodes,
  selectedNode,
  mode,
  onSelectNode,
}: {
  nodes: LifeMapNode[];
  selectedNode: LifeMapNode | null;
  mode: LifeMapMode;
  onSelectNode: (node: LifeMapNode) => void;
}) {
  const nodeById = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const selectedLinks = useMemo(() => {
    if (!selectedNode) return new Set<string>();
    return new Set([selectedNode.id, ...selectedNode.connectedTo]);
  }, [selectedNode]);

  return (
    <>
      <color attach="background" args={["#020815"]} />
      <fog attach="fog" args={["#020815", 8, 20]} />
      <ambientLight intensity={0.42} />
      <pointLight position={[-4, 2, 4]} color="#7ddcff" intensity={1.4} />
      <pointLight position={[4, -1, 2]} color="#ff7bd6" intensity={1.1} />
      <pointLight position={[0, 3, -4]} color="#a980ff" intensity={0.9} />
      <Stars radius={80} depth={45} count={1600} factor={4} saturation={0.3} fade speed={0.25} />

      <group>
        {nodes.flatMap((node) =>
          node.connectedTo
            .map((targetId) => nodeById.get(targetId))
            .filter((target): target is LifeMapNode => Boolean(target))
            .map((target) => {
              const active = !selectedNode || selectedNode.id === node.id || selectedNode.id === target.id;
              return <LifeMapPath key={`${node.id}-${target.id}`} from={node} to={target} active={active} />;
            }),
        )}
      </group>

      {nodes.map((node) => {
        const dimmed = mode !== "lifemap" && selectedNode ? !selectedLinks.has(node.id) : false;
        return (
          <LifeMapNodeMesh
            key={node.id}
            node={node}
            selected={selectedNode?.id === node.id}
            dimmed={dimmed}
            onSelect={onSelectNode}
          />
        );
      })}
    </>
  );
}

export default function LifeMapScene() {
  const router = useRouter();
  const [mode, setMode] = useState<LifeMapMode>("lifemap");
  const [selectedNode, setSelectedNode] = useState<LifeMapNode | null>(null);
  const [activeFilters, setActiveFilters] = useState<LifeMapNodeType[]>(lifeMapFilters);
  const [cameraIntent, setCameraIntent] = useState<CameraIntent>(OVERVIEW_CAMERA);
  const cameraStack = useRef<CameraSnapshot[]>([]);

  const visibleNodes = useMemo(
    () => lifeMapNodes.filter((node) => activeFilters.includes(node.type)),
    [activeFilters],
  );

  const selectNode = useCallback((node: LifeMapNode) => {
    cameraStack.current.push(cameraIntent);
    setSelectedNode(node);
    setMode("focus");
    setCameraIntent({
      position: [node.position[0] + 1.1, node.position[1] + 0.65, node.position[2] + 2.25],
      target: node.position,
    });
  }, [cameraIntent]);

  const recenter = useCallback(() => {
    cameraStack.current = [];
    setSelectedNode(null);
    setMode("lifemap");
    setCameraIntent(OVERVIEW_CAMERA);
  }, []);

  const returnHome = useCallback(() => {
    router.push("/home");
  }, [router]);

  const beginReplay = useCallback(() => {
    if (!selectedNode || !selectedNode.replayAvailable || selectedNode.locked) return;
    cameraStack.current.push(cameraIntent);
    setMode("replay");
    setCameraIntent({
      position: [selectedNode.position[0] + 0.45, selectedNode.position[1] + 0.2, selectedNode.position[2] + 1.25],
      target: selectedNode.position,
    });
  }, [cameraIntent, selectedNode]);

  const unwind = useCallback(() => {
    if (mode === "replay") {
      setMode("focus");
      const previous = cameraStack.current.pop();
      if (previous) setCameraIntent(previous);
      return;
    }

    if (mode === "focus") {
      const previous = cameraStack.current.pop();
      setSelectedNode(null);
      setMode("lifemap");
      setCameraIntent(previous ?? OVERVIEW_CAMERA);
      return;
    }

    returnHome();
  }, [mode, returnHome]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") unwind();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [unwind]);

  const toggleFilter = useCallback((type: LifeMapNodeType) => {
    setActiveFilters((current) => {
      if (current.includes(type)) {
        const next = current.filter((item) => item !== type);
        return next.length ? next : current;
      }
      return [...current, type];
    });
  }, []);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020815] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(87,63,190,0.24),transparent_34%),radial-gradient(circle_at_65%_50%,rgba(255,75,188,0.16),transparent_34%),radial-gradient(circle_at_50%_45%,rgba(62,189,222,0.18),transparent_26%)]" />
      <div className="absolute inset-x-6 top-8 bottom-8 rounded-[2.5rem] border border-cyan-100/5 bg-slate-950/10 shadow-[inset_0_0_80px_rgba(125,220,255,0.04)]" />

      <Canvas
        className="absolute inset-0"
        camera={{ position: OVERVIEW_CAMERA.position, fov: 50, near: 0.1, far: 100 }}
        dpr={[1, 1.6]}
      >
        <CameraRig intent={cameraIntent} mode={mode} />
        <LifeMapGalaxy
          nodes={visibleNodes}
          selectedNode={selectedNode}
          mode={mode}
          onSelectNode={selectNode}
        />
      </Canvas>

      <LifeMapHud
        mode={mode}
        activeFilters={activeFilters}
        onToggleFilter={toggleFilter}
        onRecenter={recenter}
        onReturnHome={returnHome}
      />

      <LifeMapNodeCard node={selectedNode} onReplay={beginReplay} onClose={unwind} />
      <LifeMapReplayOverlay node={selectedNode} active={mode === "replay"} onClose={unwind} />
    </main>
  );
}
