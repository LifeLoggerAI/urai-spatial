"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, Stars } from "@react-three/drei";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as THREE from "three";
import { LifeMapHud, type LifeMapMode } from "./LifeMapHud";
import { LifeMapMirrorPanel } from "./LifeMapMirrorPanel";
import { LifeMapNodeCard } from "./LifeMapNodeCard";
import { LifeMapReplayOverlay } from "./LifeMapReplayOverlay";
import { useLifeMapEvents } from "./useLifeMapEvents";
import {
  demoMirrorOfBecoming,
  lifeMapFilters,
  lifeMapTimeScopeLabels,
  lifeMapTypeLabels,
  narrationForNode,
  type LifeMapEra,
  type LifeMapNode,
  type LifeMapNodeType,
  type LifeMapTimeScope,
} from "./lifeMapData";

type CameraSnapshot = {
  position: [number, number, number];
  target: [number, number, number];
};

type CameraIntent = CameraSnapshot;

const OVERVIEW_CAMERA: CameraIntent = {
  position: [0, 0.55, 9.8],
  target: [0, 0, -0.8],
};

const MIRROR_CAMERA: CameraIntent = {
  position: [0, 1.35, 14.2],
  target: [0, 0, -1.6],
};

const CLUSTER_RINGS: Array<{
  id: string;
  label: string;
  position: [number, number, number];
  radius: number;
  color: string;
  rotation: [number, number, number];
}> = [
  { id: "memory-cluster", label: "memory", position: [-3.45, 0.55, 0.75], radius: 1.42, color: "#8adfff", rotation: [Math.PI / 2.35, 0.24, -0.18] },
  { id: "recovery-cluster", label: "recovery", position: [-1.85, -1.55, 0.75], radius: 0.96, color: "#7ddcff", rotation: [Math.PI / 2.25, -0.42, 0.26] },
  { id: "relationship-cluster", label: "relationship", position: [3.05, -0.6, -1.0], radius: 1.58, color: "#ff7bd6", rotation: [Math.PI / 2.1, 0.15, 0.55] },
  { id: "legacy-cluster", label: "legacy", position: [2.25, -2.05, -3.05], radius: 1.2, color: "#d1f5ff", rotation: [Math.PI / 2.55, -0.7, -0.14] },
];

function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function toVector3(position: [number, number, number]) {
  return new THREE.Vector3(position[0], position[1], position[2]);
}

function createLifeMapCurve(from: LifeMapNode, to: LifeMapNode) {
  const start = toVector3(from.position);
  const end = toVector3(to.position);
  const mid = start.clone().lerp(end, 0.5).add(new THREE.Vector3(0, 0.9 + Math.abs(start.x - end.x) * 0.08, -0.7));
  return new THREE.CatmullRomCurve3([start, mid, end]);
}

function isNodeInTimeScope(node: LifeMapNode, timeScope: LifeMapTimeScope, selectedEra: LifeMapEra | null) {
  if (timeScope === "all") return true;
  if (timeScope === "era") return selectedEra ? selectedEra.nodeIds.includes(node.id) || node.eraId === selectedEra.id : true;
  if (!node.occurredAt) return true;

  const occurredAt = new Date(node.occurredAt);
  if (Number.isNaN(occurredAt.getTime())) return true;
  const now = new Date();
  const ageMs = now.getTime() - occurredAt.getTime();
  const dayMs = 24 * 60 * 60 * 1000;

  if (timeScope === "week") return ageMs <= 7 * dayMs;
  if (timeScope === "month") return ageMs <= 31 * dayMs;
  if (timeScope === "season") return ageMs <= 120 * dayMs;
  if (timeScope === "year") return ageMs <= 366 * dayMs;
  return true;
}

function CameraRig({ intent, mode }: { intent: CameraIntent; mode: LifeMapMode }) {
  const { camera } = useThree();
  const target = useMemo(() => new THREE.Vector3(...intent.target), [intent.target]);
  const desired = useMemo(() => new THREE.Vector3(...intent.position), [intent.position]);
  const reducedMotion = useMemo(prefersReducedMotion, []);

  useFrame(({ clock }) => {
    const shouldDrift = (mode === "lifemap" || mode === "mirror") && !reducedMotion;
    const driftX = shouldDrift ? Math.sin(clock.elapsedTime * 0.16) * (mode === "mirror" ? 0.32 : 0.2) : 0;
    const driftY = shouldDrift ? Math.cos(clock.elapsedTime * 0.11) * (mode === "mirror" ? 0.1 : 0.05) : 0;
    const driftZ = shouldDrift ? Math.sin(clock.elapsedTime * 0.09) * 0.08 : 0;
    camera.position.lerp(desired.clone().add(new THREE.Vector3(driftX, driftY, driftZ)), reducedMotion ? 1 : 0.055);
    camera.lookAt(target);
  });

  return null;
}

function DepthRing({ position, radius, color, rotation, active }: { position: [number, number, number]; radius: number; color: string; rotation: [number, number, number]; active: boolean }) {
  const ringRef = useRef<THREE.Mesh>(null);
  const reducedMotion = useMemo(prefersReducedMotion, []);

  useFrame(({ clock }) => {
    if (!ringRef.current || reducedMotion) return;
    ringRef.current.rotation.z = rotation[2] + Math.sin(clock.elapsedTime * 0.18) * 0.08;
  });

  return (
    <mesh ref={ringRef} position={position} rotation={rotation}>
      <torusGeometry args={[radius, 0.012, 16, 160]} />
      <meshBasicMaterial color={color} transparent opacity={active ? 0.28 : 0.12} depthWrite={false} />
    </mesh>
  );
}

function MirrorFormation({ active }: { active: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const reducedMotion = useMemo(prefersReducedMotion, []);

  useFrame(({ clock }) => {
    if (!groupRef.current || reducedMotion) return;
    groupRef.current.rotation.z = Math.sin(clock.elapsedTime * 0.12) * 0.07;
    groupRef.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 0.7) * 0.015);
  });

  if (!active) return null;

  return (
    <group ref={groupRef} position={[0, 0.1, -2.8]}>
      <mesh>
        <torusGeometry args={[2.25, 0.018, 24, 180]} />
        <meshBasicMaterial color="#f0abfc" transparent opacity={0.34} depthWrite={false} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 4]}>
        <torusGeometry args={[1.55, 0.012, 24, 180]} />
        <meshBasicMaterial color="#8adfff" transparent opacity={0.22} depthWrite={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.36, 48, 48]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.16} depthWrite={false} />
      </mesh>
    </group>
  );
}

function LifeMapPath({ from, to, active, replaying }: { from: LifeMapNode; to: LifeMapNode; active: boolean; replaying: boolean }) {
  const currentRef = useRef<THREE.Mesh>(null);
  const replayPulseRef = useRef<THREE.Mesh>(null);
  const reducedMotion = useMemo(prefersReducedMotion, []);
  const curve = useMemo(() => createLifeMapCurve(from, to), [from, to]);
  const geometry = useMemo(() => new THREE.BufferGeometry().setFromPoints(curve.getPoints(96)), [curve]);

  useFrame(({ clock }) => {
    if (!reducedMotion && currentRef.current) {
      const t = (clock.elapsedTime * 0.08 + from.intensity * 0.13) % 1;
      currentRef.current.position.copy(curve.getPointAt(t));
    }
    if (replayPulseRef.current) {
      const t = reducedMotion ? 0.5 : (clock.elapsedTime * 0.32) % 1;
      replayPulseRef.current.position.copy(curve.getPointAt(t));
      replayPulseRef.current.visible = replaying;
    }
  });

  return (
    <group>
      <line geometry={geometry}>
        <lineBasicMaterial transparent color={active ? "#8adfff" : "#496486"} opacity={active ? 0.82 : 0.12} linewidth={1} />
      </line>
      <mesh ref={currentRef} visible={active}>
        <sphereGeometry args={[active ? 0.045 : 0.025, 16, 16]} />
        <meshBasicMaterial color={active ? "#d8f8ff" : "#66809a"} transparent opacity={active ? 0.9 : 0.18} />
      </mesh>
      <mesh ref={replayPulseRef} visible={replaying}>
        <sphereGeometry args={[0.11, 24, 24]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.95} depthWrite={false} />
      </mesh>
    </group>
  );
}

function LifeMapNodeMesh({ node, selected, dimmed, mirrorMode, onSelect }: { node: LifeMapNode; selected: boolean; dimmed: boolean; mirrorMode: boolean; onSelect: (node: LifeMapNode) => void }) {
  const groupRef = useRef<THREE.Group>(null);
  const auraRef = useRef<THREE.MeshBasicMaterial>(null);
  const coreRef = useRef<THREE.MeshStandardMaterial>(null);
  const reducedMotion = useMemo(prefersReducedMotion, []);
  const scale = 0.22 + node.intensity * 0.2;

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const breathSpeed = 0.55 + node.intensity * 1.55;
    const breathAmp = 0.025 + node.intensity * 0.075;
    const breath = reducedMotion ? 1 : 1 + Math.sin(clock.elapsedTime * breathSpeed) * breathAmp;
    groupRef.current.scale.setScalar(selected ? breath * 1.28 : mirrorMode ? breath * 0.72 : breath);
    groupRef.current.rotation.y += reducedMotion ? 0 : 0.0015 + node.intensity * 0.0015;

    if (auraRef.current) {
      const auraPulse = reducedMotion ? 0 : Math.sin(clock.elapsedTime * breathSpeed) * 0.045;
      auraRef.current.opacity = selected ? 0.24 + auraPulse : dimmed ? 0.025 : mirrorMode ? 0.16 + auraPulse : 0.09 + auraPulse * node.intensity;
    }
    if (coreRef.current) {
      const emissionPulse = reducedMotion ? 0 : Math.sin(clock.elapsedTime * breathSpeed) * 0.32 * node.intensity;
      coreRef.current.emissiveIntensity = selected ? 2.8 + emissionPulse : dimmed ? 0.32 : mirrorMode ? 2 + emissionPulse : 1.25 + emissionPulse;
      coreRef.current.opacity = dimmed ? 0.25 : mirrorMode ? 0.82 : 0.95;
    }
  });

  return (
    <group ref={groupRef} position={node.position}>
      <mesh
        onClick={(event) => {
          event.stopPropagation();
          onSelect(node);
        }}
      >
        <sphereGeometry args={[scale, 40, 40]} />
        <meshStandardMaterial ref={coreRef} color={node.aura} emissive={node.aura} emissiveIntensity={selected ? 2.8 : dimmed ? 0.32 : 1.35} roughness={0.22} metalness={0.12} transparent opacity={dimmed ? 0.25 : 0.95} />
      </mesh>
      <mesh>
        <sphereGeometry args={[scale * 2.1, 40, 40]} />
        <meshBasicMaterial ref={auraRef} color={node.aura} transparent opacity={selected ? 0.24 : dimmed ? 0.025 : 0.1} depthWrite={false} />
      </mesh>
      <mesh rotation={[Math.PI / 2.15, 0, 0]}>
        <torusGeometry args={[scale * 1.85, 0.008, 16, 96]} />
        <meshBasicMaterial color={node.aura} transparent opacity={selected ? 0.62 : dimmed ? 0.05 : mirrorMode ? 0.34 : 0.2} />
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
          aria-label={`Focus ${node.title}`}
        >
          {lifeMapTypeLabels[node.type]}
        </button>
      </Html>
    </group>
  );
}

function LifeMapGalaxy({ nodes, selectedNode, mode, onSelectNode }: { nodes: LifeMapNode[]; selectedNode: LifeMapNode | null; mode: LifeMapMode; onSelectNode: (node: LifeMapNode) => void }) {
  const nodeById = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const selectedLinks = useMemo(() => {
    if (!selectedNode) return new Set<string>();
    const linked = new Set<string>([selectedNode.id, ...selectedNode.connectedTo]);
    nodes.forEach((node) => {
      if (node.connectedTo.includes(selectedNode.id)) linked.add(node.id);
    });
    return linked;
  }, [nodes, selectedNode]);

  return (
    <>
      <color attach="background" args={["#020815"]} />
      <fog attach="fog" args={["#020815", 8, mode === "mirror" ? 28 : 20]} />
      <ambientLight intensity={mode === "mirror" ? 0.58 : 0.42} />
      <pointLight position={[-4, 2, 4]} color="#7ddcff" intensity={1.4} />
      <pointLight position={[4, -1, 2]} color="#ff7bd6" intensity={1.1} />
      <pointLight position={[0, 3, -4]} color="#a980ff" intensity={mode === "mirror" ? 1.6 : 0.9} />
      <Stars radius={80} depth={45} count={mode === "mirror" ? 2300 : 1600} factor={4} saturation={0.3} fade speed={0.25} />
      <MirrorFormation active={mode === "mirror"} />

      {CLUSTER_RINGS.map((ring) => (
        <DepthRing key={ring.id} position={ring.position} radius={mode === "mirror" ? ring.radius * 1.18 : ring.radius} color={ring.color} rotation={ring.rotation} active={mode === "lifemap" || mode === "mirror" || ring.label === selectedNode?.type} />
      ))}

      <group>
        {nodes.flatMap((node) =>
          node.connectedTo
            .map((targetId) => nodeById.get(targetId))
            .filter((target): target is LifeMapNode => Boolean(target))
            .map((target) => {
              const active = !selectedNode || selectedNode.id === node.id || selectedNode.id === target.id || selectedLinks.has(node.id) || selectedLinks.has(target.id) || mode === "mirror";
              const replaying = mode === "replay" && Boolean(selectedNode) && selectedNode.id === node.id;
              return <LifeMapPath key={`${node.id}-${target.id}`} from={node} to={target} active={active} replaying={replaying} />;
            }),
        )}
      </group>

      {nodes.map((node) => {
        const dimmed = mode !== "lifemap" && mode !== "mirror" && selectedNode ? !selectedLinks.has(node.id) : false;
        return <LifeMapNodeMesh key={node.id} node={node} selected={selectedNode?.id === node.id} dimmed={dimmed} mirrorMode={mode === "mirror"} onSelect={onSelectNode} />;
      })}
    </>
  );
}

export default function LifeMapScene() {
  const router = useRouter();
  const { nodes, eras, loading, error, usingSeedData } = useLifeMapEvents();
  const [mode, setMode] = useState<LifeMapMode>("lifemap");
  const [selectedNode, setSelectedNode] = useState<LifeMapNode | null>(null);
  const [activeFilters, setActiveFilters] = useState<LifeMapNodeType[]>(lifeMapFilters);
  const [timeScope, setTimeScope] = useState<LifeMapTimeScope>("all");
  const [selectedEraId, setSelectedEraId] = useState<string | null>(null);
  const [cameraIntent, setCameraIntent] = useState<CameraIntent>(OVERVIEW_CAMERA);
  const [narratorText, setNarratorText] = useState("Your Life Map is open. Choose a star, an era, or the Mirror to move through the inner universe.");
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const cameraStack = useRef<CameraSnapshot[]>([]);
  const touchStart = useRef<{ x: number; y: number; distance: number | null } | null>(null);

  const selectedEra = useMemo(() => eras.find((era) => era.id === selectedEraId) ?? null, [eras, selectedEraId]);
  const visibleNodes = useMemo(
    () => nodes.filter((node) => activeFilters.includes(node.type) && isNodeInTimeScope(node, timeScope, selectedEra)),
    [activeFilters, nodes, selectedEra, timeScope],
  );

  const speak = useCallback((text: string) => {
    setNarratorText(text);
    if (!ttsEnabled || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.92;
    utterance.pitch = 0.95;
    window.speechSynthesis.speak(utterance);
  }, [ttsEnabled]);

  const selectNode = useCallback((node: LifeMapNode) => {
    cameraStack.current.push(cameraIntent);
    setSelectedNode(node);
    setMode("focus");
    setCameraIntent({ position: [node.position[0] + 1.1, node.position[1] + 0.65, node.position[2] + 2.25], target: node.position });
    speak(narrationForNode(node).text);
  }, [cameraIntent, speak]);

  const recenter = useCallback(() => {
    cameraStack.current = [];
    setSelectedNode(null);
    setMode("lifemap");
    setCameraIntent(OVERVIEW_CAMERA);
    speak("The galaxy has returned to overview. You can move by time, type, or memory cluster.");
  }, [speak]);

  const returnHome = useCallback(() => {
    speak("Returning from the Life Map.");
    router.push("/home");
  }, [router, speak]);

  const beginReplay = useCallback(() => {
    if (!selectedNode || !selectedNode.replayAvailable || selectedNode.locked) return;
    cameraStack.current.push(cameraIntent);
    setMode("replay");
    const targetNode = nodes.find((node) => selectedNode.connectedTo.includes(node.id));
    const target = targetNode?.position ?? selectedNode.position;
    setCameraIntent({ position: [target[0] + 0.45, target[1] + 0.2, target[2] + 1.25], target });
    speak(`Opening replay stream. ${selectedNode.narratorHint ?? "URAI is threading this memory as symbolic atmosphere."}`);
  }, [cameraIntent, nodes, selectedNode, speak]);

  const openMirror = useCallback(() => {
    cameraStack.current.push(cameraIntent);
    setSelectedNode(null);
    setMode("mirror");
    setCameraIntent(MIRROR_CAMERA);
    speak(demoMirrorOfBecoming.becomingStatement);
  }, [cameraIntent, speak]);

  const unwind = useCallback(() => {
    if (mode === "replay") {
      setMode("focus");
      const previous = cameraStack.current.pop();
      if (previous) setCameraIntent(previous);
      speak("Replay closed. You are back at the focused memory star.");
      return;
    }
    if (mode === "focus") {
      const previous = cameraStack.current.pop();
      setSelectedNode(null);
      setMode("lifemap");
      setCameraIntent(previous ?? OVERVIEW_CAMERA);
      speak("Focus closed. The wider Life Map is visible again.");
      return;
    }
    if (mode === "mirror") {
      const previous = cameraStack.current.pop();
      setMode("lifemap");
      setCameraIntent(previous ?? OVERVIEW_CAMERA);
      speak("Mirror closed. You are back in the Life Map overview.");
      return;
    }
    returnHome();
  }, [mode, returnHome, speak]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") unwind();
      if (event.key.toLowerCase() === "m") openMirror();
      if (event.key.toLowerCase() === "r") recenter();
      if ((event.key === "Enter" || event.key === " ") && mode === "focus" && selectedNode?.replayAvailable && !selectedNode.locked) {
        event.preventDefault();
        beginReplay();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [beginReplay, mode, openMirror, recenter, selectedNode, unwind]);

  const toggleFilter = useCallback((type: LifeMapNodeType) => {
    setActiveFilters((current) => {
      if (current.includes(type)) {
        const next = current.filter((item) => item !== type);
        return next.length ? next : current;
      }
      return [...current, type];
    });
  }, []);

  const selectTimeScope = useCallback((scope: LifeMapTimeScope) => {
    setTimeScope(scope);
    if (scope !== "era") setSelectedEraId(null);
    speak(`Time view set to ${lifeMapTimeScopeLabels[scope]}.`);
  }, [speak]);

  const selectEra = useCallback((eraId: string | null) => {
    setSelectedEraId(eraId);
    setTimeScope("era");
    const era = eras.find((item) => item.id === eraId) ?? null;
    speak(era ? `${era.title}. ${era.summary}` : "All eras are visible again.");
  }, [eras, speak]);

  const toggleTts = useCallback(() => {
    setTtsEnabled((value) => !value);
  }, []);

  const onTouchStart = useCallback((event: React.TouchEvent<HTMLElement>) => {
    const first = event.touches[0];
    const second = event.touches[1];
    if (!first) return;
    const distance = second ? Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY) : null;
    touchStart.current = { x: first.clientX, y: first.clientY, distance };
  }, []);

  const onTouchEnd = useCallback((event: React.TouchEvent<HTMLElement>) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const touch = event.changedTouches[0];
    if (!touch) return;
    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    if (Math.abs(deltaX) > 80 && Math.abs(deltaY) < 80 && mode === "focus" && selectedNode) {
      const linkedId = deltaX < 0 ? selectedNode.connectedTo[0] : nodes.find((node) => node.connectedTo.includes(selectedNode.id))?.id;
      const nextNode = linkedId ? nodes.find((node) => node.id === linkedId) : null;
      if (nextNode) selectNode(nextNode);
    }
  }, [mode, nodes, selectNode, selectedNode]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020815] text-white" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(87,63,190,0.24),transparent_34%),radial-gradient(circle_at_65%_50%,rgba(255,75,188,0.16),transparent_34%),radial-gradient(circle_at_50%_45%,rgba(62,189,222,0.18),transparent_26%)]" />
      <div className="absolute inset-x-6 top-8 bottom-8 rounded-[2.5rem] border border-cyan-100/5 bg-slate-950/10 shadow-[inset_0_0_80px_rgba(125,220,255,0.04)]" />

      <Canvas className="absolute inset-0" camera={{ position: OVERVIEW_CAMERA.position, fov: 50, near: 0.1, far: 100 }} dpr={[1, 1.6]}>
        <CameraRig intent={cameraIntent} mode={mode} />
        <LifeMapGalaxy nodes={visibleNodes} selectedNode={selectedNode} mode={mode} onSelectNode={selectNode} />
      </Canvas>

      <LifeMapHud
        mode={mode}
        activeFilters={activeFilters}
        timeScope={timeScope}
        eras={eras}
        selectedEraId={selectedEraId}
        narratorText={narratorText}
        ttsEnabled={ttsEnabled}
        loading={loading}
        usingSeedData={usingSeedData}
        error={error}
        onToggleFilter={toggleFilter}
        onSelectTimeScope={selectTimeScope}
        onSelectEra={selectEra}
        onToggleTts={toggleTts}
        onOpenMirror={openMirror}
        onRecenter={recenter}
        onReturnHome={returnHome}
      />

      <LifeMapNodeCard node={mode === "mirror" ? null : selectedNode} onReplay={beginReplay} onClose={unwind} />
      <LifeMapReplayOverlay node={selectedNode} active={mode === "replay"} onClose={unwind} />
      <LifeMapMirrorPanel mirror={demoMirrorOfBecoming} active={mode === "mirror"} onClose={unwind} />

      <section className="sr-only" aria-label="Keyboard controls">
        Press Escape to unwind. Press R to recenter. Press M to open the Mirror of Becoming. Press Enter on a focused replay node to begin replay.
      </section>
    </main>
  );
}
