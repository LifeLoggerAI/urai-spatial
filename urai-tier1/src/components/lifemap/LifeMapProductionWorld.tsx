"use client";

import { Line, Sparkles, Stars } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import CinematicPostProcessing from "@/spatial/cinematic/CinematicPostProcessing";
import type { SpatialQualityProfile } from "@/spatial/performance/useAdaptiveSpatialQuality";
import type { LifeMapNode } from "./lifeMapData";

export type LifeMapJourneyPhase = "overview" | "departure" | "travel" | "approach" | "arrival";
type Point3 = [number, number, number];
const DEEP = "#01030a";
const GOLD = "#ffd98a";
const ICE = "#dff8ff";

function seeded(index: number, salt: number) {
  const value = Math.sin(index * 91.317 + salt * 13.77) * 43758.5453;
  return value - Math.floor(value);
}

function LifeCore({ hidden, reducedMotion }: { hidden: boolean; reducedMotion: boolean }) {
  const root = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!root.current || reducedMotion) return;
    root.current.rotation.y = clock.elapsedTime * 0.08;
    root.current.rotation.z = Math.sin(clock.elapsedTime * 0.18) * 0.08;
  });
  if (hidden) return null;
  return (
    <group ref={root} name="life-map-white-gold-life-core" position={[0, 0.5, -8]}>
      {[1, 1.42, 1.95].map((scale, index) => (
        <mesh key={scale} scale={scale} rotation={[index * 0.45, index * 0.78, 0]}>
          <torusKnotGeometry args={[0.62, 0.035 + index * 0.012, 180, 24, 2 + index, 3]} />
          <meshBasicMaterial color={index === 1 ? ICE : GOLD} transparent opacity={0.82 - index * 0.18} toneMapped={false} />
        </mesh>
      ))}
      <mesh>
        <icosahedronGeometry args={[0.72, 5]} />
        <meshPhysicalMaterial color="#fff6d6" emissive={GOLD} emissiveIntensity={2.2} transmission={0.26} roughness={0.08} clearcoat={1} />
      </mesh>
      <pointLight color={GOLD} intensity={13} distance={28} decay={2} />
    </group>
  );
}

function MemoryStar({ node, active, index, phase, reducedMotion, onSelect }: {
  node: LifeMapNode;
  active: boolean;
  index: number;
  phase: LifeMapJourneyPhase;
  reducedMotion: boolean;
  onSelect: (node: LifeMapNode) => void;
}) {
  const root = useRef<THREE.Group>(null);
  const seed = seeded(index, 4);
  const baseScale = 0.38 + node.intensity * 0.34;
  useFrame(({ clock }) => {
    if (!root.current || reducedMotion) return;
    root.current.rotation.y = clock.elapsedTime * (0.08 + seed * 0.1);
    root.current.position.y = node.position[1] + Math.sin(clock.elapsedTime * 0.35 + seed * 12) * 0.13;
  });
  const visible = phase === "overview" || active || phase === "departure" || phase === "travel" || phase === "approach";
  return (
    <group
      ref={root}
      name={`life-map-memory-${node.id}`}
      position={node.position}
      visible={visible}
      scale={active ? baseScale * 1.7 : baseScale}
      onClick={(event) => { event.stopPropagation(); onSelect(node); }}
    >
      <mesh castShadow>
        <icosahedronGeometry args={[0.72, 4]} />
        <meshPhysicalMaterial color={ICE} emissive={node.aura} emissiveIntensity={active ? 2.4 : 1.25} transmission={0.18} roughness={0.12} clearcoat={1} iridescence={0.38} />
      </mesh>
      <mesh scale={1.5}>
        <sphereGeometry args={[0.72, 48, 32]} />
        <meshBasicMaterial color={node.aura} transparent opacity={active ? 0.12 : 0.055} side={THREE.BackSide} toneMapped={false} />
      </mesh>
      {[0, 1].map((ring) => <mesh key={ring} rotation={[Math.PI / 2 + ring * 0.65, ring * 0.8, 0]} scale={1.25 + ring * 0.35}><torusGeometry args={[0.72, 0.016, 10, 120]} /><meshBasicMaterial color={ring ? GOLD : node.aura} transparent opacity={active ? 0.76 : 0.34} toneMapped={false} /></mesh>)}
      <pointLight color={node.aura} intensity={active ? 8 : 3.2} distance={active ? 15 : 8} decay={2} />
    </group>
  );
}

function ConstellationThreads({ nodes, selected }: { nodes: LifeMapNode[]; selected: LifeMapNode | null }) {
  const links = useMemo(() => {
    const byId = new Map(nodes.map((node) => [node.id, node]));
    const seen = new Set<string>();
    const result: Array<{ from: Point3; to: Point3; color: string }> = [];
    for (const node of nodes) {
      for (const targetId of node.connectedTo || []) {
        const target = byId.get(targetId);
        if (!target) continue;
        const key = [node.id, target.id].sort().join(":");
        if (seen.has(key)) continue;
        seen.add(key);
        result.push({ from: node.position, to: target.position, color: node.aura });
      }
    }
    return result;
  }, [nodes]);
  if (selected) return null;
  return <group name="life-map-constellation-lines">{links.map((link, index) => <Line key={index} points={[link.from, link.to]} color={link.color} transparent opacity={0.28} lineWidth={0.55} />)}</group>;
}

function ChapterIslands({ nodes, selected }: { nodes: LifeMapNode[]; selected: LifeMapNode | null }) {
  if (selected) return null;
  const centers = useMemo(() => {
    const groups = new Map<string, LifeMapNode[]>();
    nodes.forEach((node) => {
      const key = node.eraId || node.type;
      groups.set(key, [...(groups.get(key) || []), node]);
    });
    return [...groups.entries()].map(([id, group], index) => {
      const center = group.reduce((sum, node) => sum.add(new THREE.Vector3(...node.position)), new THREE.Vector3()).multiplyScalar(1 / group.length);
      return { id, center: center.toArray() as Point3, aura: group[0]?.aura || "#88dfff", index };
    });
  }, [nodes]);
  return (
    <group name="life-map-authored-chapter-regions">
      {centers.map((chapter) => (
        <group key={chapter.id} position={[chapter.center[0], chapter.center[1] - 1.05, chapter.center[2]]}>
          <mesh rotation={[-Math.PI / 2, 0, seeded(chapter.index, 2) * Math.PI]} scale={[2.2, 1.4, 1]}>
            <circleGeometry args={[1, 96]} />
            <meshPhysicalMaterial color="#102a38" emissive={chapter.aura} emissiveIntensity={0.12} roughness={0.72} metalness={0.08} transparent opacity={0.86} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
            <ringGeometry args={[1.28, 1.34, 100]} />
            <meshBasicMaterial color={chapter.aura} transparent opacity={0.24} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function MemoryWeather({ reducedMotion }: { reducedMotion: boolean }) {
  const root = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!root.current || reducedMotion) return;
    root.current.rotation.z = Math.sin(clock.elapsedTime * 0.04) * 0.04;
  });
  return (
    <group ref={root} name="life-map-emotional-weather" position={[0, 5.8, -20]}>
      {[-8, -4, 0, 4, 8].map((x, index) => {
        const curve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(x - 3, Math.sin(index) * 0.8, 0),
          new THREE.Vector3(x, 1.2 + Math.cos(index) * 0.5, -1.8),
          new THREE.Vector3(x + 3.2, Math.sin(index * 2) * 0.8, -0.2),
        ]);
        return <mesh key={x}><tubeGeometry args={[curve, 70, 0.055, 8, false]} /><meshBasicMaterial color={index % 2 ? "#a78bfa" : "#6fdcff"} transparent opacity={0.14} toneMapped={false} /></mesh>;
      })}
    </group>
  );
}

function ArrivalSanctuary({ selected, phase }: { selected: LifeMapNode | null; phase: LifeMapJourneyPhase }) {
  if (!selected || phase !== "arrival") return null;
  return (
    <group name="life-map-selected-arrival-sanctuary" position={selected.position}>
      <mesh position={[0, -1.12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.3, 4.4, 160]} />
        <meshBasicMaterial color={selected.aura} transparent opacity={0.13} toneMapped={false} />
      </mesh>
      {[2.2, 3.1, 4.1].map((radius, index) => <mesh key={radius} rotation={[Math.PI / 2, index * 0.7, 0]}><torusGeometry args={[radius, 0.025, 12, 160]} /><meshBasicMaterial color={index === 1 ? GOLD : selected.aura} transparent opacity={0.25 - index * 0.04} toneMapped={false} /></mesh>)}
      <pointLight color={selected.aura} intensity={12} distance={28} decay={2} />
    </group>
  );
}

function SpatialParallax({ reducedMotion }: { reducedMotion: boolean }) {
  const { camera, pointer } = useThree();
  const initial = useRef(camera.position.clone());
  useFrame((_, delta) => {
    if (reducedMotion) return;
    const x = initial.current.x + pointer.x * 0.42;
    const y = initial.current.y + pointer.y * 0.22;
    camera.position.x = THREE.MathUtils.damp(camera.position.x, x, 2.4, delta);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, y, 2.4, delta);
  });
  return null;
}

export function LifeMapProductionWorld({ nodes, selected, phase, profile, onSelect, cameraRig, webglRecovery }: {
  nodes: LifeMapNode[];
  selected: LifeMapNode | null;
  phase: LifeMapJourneyPhase;
  profile: SpatialQualityProfile;
  onSelect: (node: LifeMapNode) => void;
  cameraRig: ReactNode;
  webglRecovery: ReactNode;
}) {
  const starCount = profile.tier === "low" ? 620 : profile.tier === "medium" ? 1100 : 1900;
  return (
    <>
      <color attach="background" args={[DEEP]} />
      <fogExp2 attach="fog" args={["#071126", 0.015]} />
      <ambientLight intensity={0.62} color="#d6efff" />
      <hemisphereLight args={["#e5f7ff", "#02040a", 1.1]} />
      <directionalLight position={[9, 14, 10]} intensity={2.8} color="#dff6ff" castShadow={profile.shadows} shadow-mapSize={[2048, 2048]} />
      <directionalLight position={[-10, 8, -16]} intensity={1.35} color="#a78bfa" />
      {webglRecovery}
      {cameraRig}
      <SpatialParallax reducedMotion={profile.reducedMotion} />
      <Stars radius={120} depth={84} count={starCount} factor={2.15} saturation={0.22} fade speed={profile.reducedMotion ? 0 : 0.018} />
      <Sparkles count={profile.tier === "low" ? 120 : 300} scale={[46, 28, 70]} position={[0, 3, -16]} size={1.4} speed={profile.reducedMotion ? 0 : 0.12} opacity={0.34} color="#d9f7ff" />
      <LifeCore hidden={Boolean(selected)} reducedMotion={profile.reducedMotion} />
      <MemoryWeather reducedMotion={profile.reducedMotion} />
      <ChapterIslands nodes={nodes} selected={selected} />
      <ConstellationThreads nodes={nodes} selected={selected} />
      <group name="life-map-memory-artifact-families">
        {nodes.map((node, index) => <MemoryStar key={node.id} node={node} index={index} active={selected?.id === node.id} phase={phase} reducedMotion={profile.reducedMotion} onSelect={onSelect} />)}
      </group>
      <ArrivalSanctuary selected={selected} phase={phase} />
      <CinematicPostProcessing active={profile.postprocessing} reducedMotion={profile.reducedMotion} />
    </>
  );
}
