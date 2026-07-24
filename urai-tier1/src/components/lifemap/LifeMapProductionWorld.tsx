"use client";

import { Html, Line, Stars } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import CinematicPostProcessing from "@/spatial/cinematic/CinematicPostProcessing";
import type { SpatialQualityProfile } from "@/spatial/performance/useAdaptiveSpatialQuality";
import type { LifeMapNode } from "./lifeMapData";
import { LIFE_MAP_CORE_POSITION } from "./lifeMapLayout";
import {
  LIFE_MAP_CHAPTERS,
  LIFE_MAP_PATH_PALETTE,
  artifactFamilyLabel,
  artifactImportance,
  chapterForNode,
  resolveArtifactFamily,
  resolvePathKind,
} from "./lifeMapVisualSystem";

export type LifeMapJourneyPhase = "overview" | "departure" | "travel" | "approach" | "arrival";

const GOLD = "#ffe2a0";
const CYAN = "#8cecff";
const GLASS = "#07111d";

function orbit(radius: number, lift: number, phase: number) {
  const points: THREE.Vector3[] = [];
  for (let index = 0; index < 48; index += 1) {
    const angle = (index / 47) * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle * 2 + phase) * lift, Math.sin(angle) * radius * 0.56));
  }
  return new THREE.CatmullRomCurve3(points, true, "catmullrom", 0.3);
}

function Ribbon({ radius, lift, phase, color, opacity = 0.45, width = 0.014 }: { radius: number; lift: number; phase: number; color: string; opacity?: number; width?: number }) {
  const curve = useMemo(() => orbit(radius, lift, phase), [lift, phase, radius]);
  return <mesh rotation={[0.16, phase * 0.18, -0.08]}>
    <tubeGeometry args={[curve, 96, width, 7, true]} />
    <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.15} roughness={0.16} metalness={0.78} transparent opacity={opacity} />
  </mesh>;
}

function LifeCore({ reducedMotion, tier }: { reducedMotion: boolean; tier: SpatialQualityProfile["tier"] }) {
  const core = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!core.current || reducedMotion) return;
    core.current.rotation.y = clock.elapsedTime * 0.045;
    core.current.rotation.x = Math.sin(clock.elapsedTime * 0.12) * 0.035;
  });
  return <group ref={core} name="life-map-white-gold-life-core" position={LIFE_MAP_CORE_POSITION} data-life-core="white-gold-layered">
    <mesh castShadow><dodecahedronGeometry args={[1.05, tier === "high" ? 2 : 1]} /><meshPhysicalMaterial color="#fff8e4" emissive={GOLD} emissiveIntensity={1.55} roughness={0.1} metalness={0.32} transmission={0.18} /></mesh>
    <mesh scale={0.7} rotation={[0.4, 0.7, 0.2]}><icosahedronGeometry args={[1, 2]} /><meshStandardMaterial color="#ffffff" emissive="#ffd16d" emissiveIntensity={2.1} wireframe /></mesh>
    <Ribbon radius={1.55} lift={0.28} phase={0.4} color={GOLD} opacity={0.76} width={0.026} />
    <Ribbon radius={1.95} lift={0.38} phase={1.8} color={CYAN} opacity={0.35} />
    <pointLight color={GOLD} intensity={tier === "low" ? 12 : 19} distance={26} decay={2} />
  </group>;
}

function ChapterConstellations({ selected }: { selected: LifeMapNode | null }) {
  return <group name="life-map-authored-chapter-regions" data-scale="cosmic-overview" data-depth-band="middle">
    {LIFE_MAP_CHAPTERS.map((chapter, index) => {
      const active = !selected || selected.eraId === chapter.id;
      const scale = active ? 1 : 0.72;
      return <group key={chapter.id} name={`life-map-chapter-${chapter.id}`} position={chapter.position} rotation={chapter.rotation} scale={scale} data-chapter-region={chapter.id}>
        <Ribbon radius={Math.max(1.2, chapter.radius * 0.2)} lift={0.18 + index * 0.025} phase={index * 0.7} color={chapter.aura} opacity={active ? 0.32 : 0.045} width={active ? 0.012 : 0.006} />
        {[0, 1, 2, 3].map((point) => {
          const angle = (point / 4) * Math.PI * 2 + index * 0.4;
          return <mesh key={point} position={[Math.cos(angle) * 1.15, Math.sin(angle * 1.6) * 0.42, Math.sin(angle) * 0.7]} name={`life-map-chapter-anchor-${chapter.id}-${point}`}>
            <octahedronGeometry args={[active ? 0.105 : 0.055, 1]} />
            <meshStandardMaterial color={chapter.aura} emissive={chapter.aura} emissiveIntensity={active ? 0.78 : 0.12} roughness={0.18} metalness={0.7} transparent opacity={active ? 0.92 : 0.18} />
          </mesh>;
        })}
        {!selected ? <Html position={[0, 1.2, 0]} center distanceFactor={17}><span className="life-map-chapter-label">{chapter.title}</span></Html> : null}
      </group>;
    })}
  </group>;
}

function ArtifactShape({ node, active }: { node: LifeMapNode; active: boolean }) {
  const family = resolveArtifactFamily(node);
  if (family === "audio") return <group>{[-0.36, -0.18, 0, 0.18, 0.36].map((x, index) => <mesh key={x} position={[x, 0, 0]} scale={[1, 0.62 + Math.abs(2 - index) * 0.24, 1]}><capsuleGeometry args={[0.045, 0.38, 6, 12]} /><meshStandardMaterial color={node.aura} emissive={node.aura} emissiveIntensity={active ? 1.4 : 0.65} /></mesh>)}</group>;
  if (family === "relationship") return <group>{[[-0.3, 0, 0], [0.3, 0.04, -0.08], [0, 0.3, -0.16]].map((position, index) => <mesh key={index} position={position as [number, number, number]}><octahedronGeometry args={[0.22, 1]} /><meshPhysicalMaterial color="#f4fcff" emissive={node.aura} emissiveIntensity={active ? 1.1 : 0.48} roughness={0.1} transmission={0.18} /></mesh>)}<Line points={[[-0.3, 0, 0], [0.3, 0.04, -0.08], [0, 0.3, -0.16], [-0.3, 0, 0]]} color={node.aura} transparent opacity={0.8} /></group>;
  if (family === "protected") return <group><mesh><dodecahedronGeometry args={[0.48, 1]} /><meshPhysicalMaterial color="#04050a" emissive="#39284b" emissiveIntensity={0.22} metalness={0.9} /></mesh><mesh scale={1.18}><dodecahedronGeometry args={[0.48, 0]} /><meshBasicMaterial color={node.aura} wireframe transparent opacity={0.2} /></mesh></group>;
  return <group><mesh rotation={[0.32, 0.55, 0.12]}><dodecahedronGeometry args={[0.45, 1]} /><meshPhysicalMaterial color="#edfaff" emissive={node.aura} emissiveIntensity={active ? 1.4 : 0.58} roughness={0.12} metalness={0.35} transmission={0.24} /></mesh><mesh scale={1.22} rotation={[-0.22, 0.2, 0.42]}><icosahedronGeometry args={[0.45, 1]} /><meshBasicMaterial color={node.aura} wireframe transparent opacity={active ? 0.38 : 0.14} /></mesh></group>;
}

function MemoryArtifact({ node, index, selected, phase, reducedMotion, onSelect }: { node: LifeMapNode; index: number; selected: LifeMapNode | null; phase: LifeMapJourneyPhase; reducedMotion: boolean; onSelect: (node: LifeMapNode) => void }) {
  const group = useRef<THREE.Group>(null);
  const active = selected?.id === node.id;
  const related = Boolean(selected && (selected.connectedTo.includes(node.id) || node.connectedTo.includes(selected.id)));
  const visible = !selected || active || related;
  const importance = artifactImportance(node);
  const chapter = chapterForNode(node, index);
  useFrame(({ clock }, delta) => {
    if (!group.current) return;
    const desired = active ? (phase === "arrival" ? 2.35 : 1.7) : related ? 0.82 : 0.7 + importance * 0.38;
    const scale = THREE.MathUtils.damp(group.current.scale.x, desired, active ? 5.2 : 3.4, delta);
    group.current.scale.setScalar(scale);
    group.current.visible = visible;
    if (!reducedMotion) {
      group.current.rotation.y = Math.sin(clock.elapsedTime * 0.14 + index) * 0.11;
      group.current.position.y = node.position[1] + Math.sin(clock.elapsedTime * 0.25 + index) * (active ? 0.02 : 0.055);
    }
  });
  return <group ref={group} position={node.position} name={`life-map-artifact-${resolveArtifactFamily(node)}-${node.id}`} data-artifact-family={resolveArtifactFamily(node)} data-importance={importance.toFixed(2)} data-chapter={chapter.id}>
    <group onClick={(event) => { event.stopPropagation(); onSelect(node); }} onPointerOver={() => { document.body.style.cursor = "pointer"; }} onPointerOut={() => { document.body.style.cursor = ""; }}>
      <ArtifactShape node={node} active={active} />
      {active ? <group name="life-map-selected-artifact-halo"><Ribbon radius={0.84} lift={0.12} phase={0.5} color={node.aura} opacity={0.72} /><Ribbon radius={1.1} lift={0.17} phase={1.9} color="#ffffff" opacity={0.25} width={0.008} /></group> : null}
    </group>
    <pointLight color={node.aura} intensity={active ? 7.5 : related ? 2.2 : 0.55 + importance} distance={active ? 10 : 4} decay={2} />
    {active ? <Html position={[0, 0.96, 0]} center distanceFactor={13}><button className="life-map-world-label" data-active="true" data-family={resolveArtifactFamily(node)} onClick={() => onSelect(node)}><strong>{node.locked ? "Protected memory" : node.title}</strong><span>{node.locked ? "Private · sealed" : `${artifactFamilyLabel(node)} · ${node.dateLabel}`}</span></button></Html> : null}
  </group>;
}

function LivingPaths({ nodes, selected, reducedMotion }: { nodes: LifeMapNode[]; selected: LifeMapNode | null; reducedMotion: boolean }) {
  const byId = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  return <group name="life-map-curved-semantic-paths" data-path-system="curved-semantic" data-depth-band="middle">
    {nodes.flatMap((source, sourceIndex) => source.connectedTo.slice(0, 3).map((targetId, targetIndex) => {
      const target = byId.get(targetId);
      if (!target || target.id < source.id) return null;
      const active = selected?.id === source.id || selected?.id === target.id;
      if (selected && !active) return null;
      const start = new THREE.Vector3(...source.position);
      const end = new THREE.Vector3(...target.position);
      const middle = start.clone().lerp(end, 0.5); middle.y += Math.max(0.7, start.distanceTo(end) * 0.14);
      const points = new THREE.QuadraticBezierCurve3(start, middle, end).getPoints(40);
      const color = LIFE_MAP_PATH_PALETTE[resolvePathKind(source, target)];
      return <Line key={`${source.id}-${target.id}`} points={points} color={color} lineWidth={active ? 2.2 : 0.65} transparent opacity={active ? 0.74 : 0.1} dashed={!reducedMotion && !active} dashScale={1.5 + sourceIndex * 0.02 + targetIndex * 0.02} />;
    }))}
  </group>;
}

function ArrivalSanctuary({ selected, phase }: { selected: LifeMapNode | null; phase: LifeMapJourneyPhase }) {
  if (!selected || (phase !== "approach" && phase !== "arrival")) return null;
  const opacity = phase === "arrival" ? 0.44 : 0.2;
  return <group position={selected.position} name="life-map-intimate-memory-chamber" data-scale="intimate" data-depth-band="near">
    <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.92, 0]}><ringGeometry args={[1.38, 1.72, 64]} /><meshBasicMaterial color={selected.aura} transparent opacity={opacity} side={THREE.DoubleSide} depthWrite={false} /></mesh>
    <Ribbon radius={1.48} lift={0.12} phase={0.8} color={selected.aura} opacity={opacity * 0.9} width={0.01} />
    {[0, 1, 2, 3].map((index) => { const angle = index / 4 * Math.PI * 2; return <mesh key={index} position={[Math.cos(angle) * 1.72, -0.68, Math.sin(angle) * 1.72]} name={`life-map-sanctuary-marker-${index}`}><cylinderGeometry args={[0.035, 0.08, 0.38, 12]} /><meshStandardMaterial color={GLASS} emissive={selected.aura} emissiveIntensity={0.35} transparent opacity={opacity} /></mesh>; })}
    <pointLight color={selected.aura} intensity={phase === "arrival" ? 7 : 3} distance={10} />
  </group>;
}

export function LifeMapProductionWorld({ nodes, selected, phase, profile, onSelect, cameraRig, webglRecovery }: { nodes: LifeMapNode[]; selected: LifeMapNode | null; phase: LifeMapJourneyPhase; profile: SpatialQualityProfile; onSelect: (node: LifeMapNode) => void; cameraRig: ReactNode; webglRecovery: ReactNode }) {
  return <>
    <color attach="background" args={["#02050b"]} />
    <fog attach="fog" args={["#02050b", 14, 62]} />
    <ambientLight intensity={0.3} color="#a7e5ff" />
    <directionalLight position={[7, 10, 8]} intensity={2.2} color="#ddf7ff" castShadow={profile.shadows} />
    <hemisphereLight args={["#c8f3ff", "#02040a", 0.45]} />
    {webglRecovery}{cameraRig}
    <LifeCore reducedMotion={profile.reducedMotion} tier={profile.tier} />
    <ChapterConstellations selected={selected} />
    <LivingPaths nodes={nodes} selected={selected} reducedMotion={profile.reducedMotion} />
    <group name="life-map-memory-artifact-families" data-depth-band="middle">{nodes.map((node, index) => <MemoryArtifact key={node.id} node={node} index={index} selected={selected} phase={phase} reducedMotion={profile.reducedMotion} onSelect={onSelect} />)}</group>
    <ArrivalSanctuary selected={selected} phase={phase} />
    <group name="life-map-far-future-horizon" data-depth-band="far"><Stars radius={78} depth={58} count={profile.tier === "low" ? 480 : profile.tier === "medium" ? 820 : 1280} factor={2} saturation={0.16} fade speed={profile.reducedMotion ? 0 : 0.035} /></group>
    <CinematicPostProcessing active={profile.postprocessing} reducedMotion={profile.reducedMotion} />
  </>;
}
