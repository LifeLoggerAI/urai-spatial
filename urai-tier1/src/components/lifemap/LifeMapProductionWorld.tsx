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
  type LifeMapArtifactFamily,
  type LifeMapPathKind,
} from "./lifeMapVisualSystem";

export type LifeMapJourneyPhase = "overview" | "departure" | "travel" | "approach" | "arrival";

const GOLD = "#ffe2a0";
const CYAN = "#8cecff";
const GLASS = "#07111d";
const DEEP = "#02050b";

type ArtifactProps = { node: LifeMapNode; active: boolean };

function orbit(radius: number, lift: number, phase: number) {
  const points: THREE.Vector3[] = [];
  for (let index = 0; index < 48; index += 1) {
    const angle = (index / 47) * Math.PI * 2;
    points.push(new THREE.Vector3(
      Math.cos(angle) * radius,
      Math.sin(angle * 2 + phase) * lift,
      Math.sin(angle) * radius * 0.56,
    ));
  }
  return new THREE.CatmullRomCurve3(points, true, "catmullrom", 0.3);
}

function Ribbon({ radius, lift, phase, color, opacity = 0.45, width = 0.014 }: { radius: number; lift: number; phase: number; color: string; opacity?: number; width?: number }) {
  const curve = useMemo(() => orbit(radius, lift, phase), [lift, phase, radius]);
  return <mesh rotation={[0.16, phase * 0.18, -0.08]}>
    <tubeGeometry args={[curve, 96, width, 7, true]} />
    <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.15} roughness={0.16} metalness={0.78} transparent opacity={opacity} depthWrite={false} />
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
    <mesh castShadow><dodecahedronGeometry args={[0.82, tier === "high" ? 2 : 1]} /><meshPhysicalMaterial color="#fff0c8" emissive={GOLD} emissiveIntensity={1.1} roughness={0.16} metalness={0.28} transmission={0.12} /></mesh>
    <mesh scale={0.68} rotation={[0.4, 0.7, 0.2]}><icosahedronGeometry args={[1, 2]} /><meshStandardMaterial color="#fff8e8" emissive="#ffc85c" emissiveIntensity={1.6} wireframe /></mesh>
    <Ribbon radius={1.35} lift={0.22} phase={0.4} color={GOLD} opacity={0.66} width={0.022} />
    <Ribbon radius={1.72} lift={0.3} phase={1.8} color={CYAN} opacity={0.25} width={0.01} />
    <pointLight color={GOLD} intensity={tier === "low" ? 8 : 13} distance={22} decay={2} />
  </group>;
}

function LightBridges() {
  const origin = useMemo(() => new THREE.Vector3(...LIFE_MAP_CORE_POSITION), []);
  return <group name="life-map-light-bridges" data-depth-band="middle">
    {LIFE_MAP_CHAPTERS.map((chapter, index) => {
      const destination = new THREE.Vector3(...chapter.position);
      const control = origin.clone().lerp(destination, 0.52);
      control.y += 1.2 + index * 0.24;
      const points = new THREE.QuadraticBezierCurve3(origin, control, destination).getPoints(32);
      return <Line key={chapter.id} points={points} color={chapter.aura} lineWidth={0.55} transparent opacity={0.14} />;
    })}
  </group>;
}

function ChapterConstellations({ selected }: { selected: LifeMapNode | null }) {
  return <group name="life-map-authored-chapter-regions" data-scale="cosmic-overview" data-depth-band="middle">
    {LIFE_MAP_CHAPTERS.map((chapter, index) => {
      const active = !selected || selected.eraId === chapter.id;
      const scale = active ? 1 : 0.78;
      return <group key={chapter.id} name={`life-map-chapter-${chapter.id}`} position={chapter.position} rotation={chapter.rotation} scale={scale} data-chapter-region={chapter.id}>
        <Ribbon radius={Math.max(1.1, chapter.radius * 0.19)} lift={0.16 + index * 0.025} phase={index * 0.7} color={chapter.aura} opacity={active ? 0.28 : 0.035} width={active ? 0.01 : 0.005} />
        {[0, 1, 2, 3].map((point) => {
          const angle = (point / 4) * Math.PI * 2 + index * 0.4;
          return <mesh key={point} position={[Math.cos(angle) * 1.05, Math.sin(angle * 1.6) * 0.36, Math.sin(angle) * 0.64]} name={`life-map-chapter-anchor-${chapter.id}-${point}`}>
            <octahedronGeometry args={[active ? 0.09 : 0.045, 1]} />
            <meshStandardMaterial color={chapter.aura} emissive={chapter.aura} emissiveIntensity={active ? 0.72 : 0.1} roughness={0.18} metalness={0.7} transparent opacity={active ? 0.88 : 0.14} />
          </mesh>;
        })}
        {!selected ? <Html position={[0, 1.05, 0]} center distanceFactor={18}><span className="life-map-chapter-label">{chapter.title}</span></Html> : null}
      </group>;
    })}
  </group>;
}

function ForegroundObservatory({ selected }: { selected: LifeMapNode | null }) {
  if (selected) return null;
  return <group name="life-map-foreground-observatory" data-depth-band="near" position={[0, -2.1, 4.8]}>
    <mesh rotation={[Math.PI / 2, 0, 0]}><ringGeometry args={[4.8, 5.02, 96, 1, 0.22, Math.PI * 0.56]} /><meshBasicMaterial color={CYAN} transparent opacity={0.09} side={THREE.DoubleSide} depthWrite={false} /></mesh>
    <mesh position={[0, 0.04, -0.25]}><cylinderGeometry args={[0.9, 1.35, 0.08, 48]} /><meshStandardMaterial color={GLASS} emissive="#173b50" emissiveIntensity={0.22} roughness={0.52} metalness={0.42} transparent opacity={0.5} /></mesh>
  </group>;
}

function RelationshipObservatory({ selected }: { selected: LifeMapNode | null }) {
  return <group name="life-map-relationship-observatory" data-depth-band="middle" position={[5.7, 0.8, -7.6]} visible={!selected || selected.type === "relationship"}>
    {[0, 1, 2].map((index) => {
      const angle = index / 3 * Math.PI * 2;
      return <mesh key={index} position={[Math.cos(angle) * 1.1, Math.sin(angle * 1.7) * 0.38, Math.sin(angle) * 0.72]}><octahedronGeometry args={[0.16, 1]} /><meshStandardMaterial color="#d9f6ff" emissive="#83dfff" emissiveIntensity={0.48} roughness={0.18} metalness={0.55} /></mesh>;
    })}
    <Ribbon radius={1.42} lift={0.22} phase={1.2} color="#a9e9ff" opacity={0.18} width={0.008} />
  </group>;
}

function GoalHorizon() {
  return <group name="life-map-goal-horizon" data-depth-band="far" position={[-7.4, 3.1, -17]}>
    <mesh rotation={[0, 0, -0.18]}><coneGeometry args={[0.72, 2.4, 5]} /><meshStandardMaterial color="#152634" emissive="#f0ce7b" emissiveIntensity={0.5} roughness={0.34} metalness={0.66} /></mesh>
    <mesh position={[0, 1.6, 0]}><octahedronGeometry args={[0.25, 1]} /><meshStandardMaterial color="#fff0b0" emissive="#f4d681" emissiveIntensity={1.1} /></mesh>
  </group>;
}

function AchievementMonument() {
  return <group name="life-map-achievement-monument" data-depth-band="far" position={[7.7, -0.1, -14]}>
    <mesh><cylinderGeometry args={[0.75, 1.1, 0.16, 8]} /><meshStandardMaterial color="#111c28" emissive="#c8a85c" emissiveIntensity={0.24} metalness={0.72} roughness={0.28} /></mesh>
    <mesh position={[0, 0.75, 0]} rotation={[0.15, 0.25, 0.08]}><dodecahedronGeometry args={[0.48, 1]} /><meshPhysicalMaterial color="#f4d98e" emissive="#f2c65c" emissiveIntensity={0.9} roughness={0.18} metalness={0.52} /></mesh>
  </group>;
}

function PrivacyVault() {
  return <group name="life-map-privacy-vault" data-depth-band="far" position={[-8.2, -1.2, -11.8]}>
    <mesh><dodecahedronGeometry args={[1.1, 0]} /><meshStandardMaterial color="#03050a" emissive="#3b294c" emissiveIntensity={0.18} metalness={0.9} roughness={0.18} /></mesh>
    <mesh scale={1.12}><dodecahedronGeometry args={[1.1, 0]} /><meshBasicMaterial color="#7b6a94" wireframe transparent opacity={0.16} /></mesh>
  </group>;
}

function EmotionalWeather({ reducedMotion }: { reducedMotion: boolean }) {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!group.current || reducedMotion) return;
    group.current.rotation.y = Math.sin(clock.elapsedTime * 0.035) * 0.12;
    group.current.position.y = 3.7 + Math.sin(clock.elapsedTime * 0.09) * 0.12;
  });
  return <group ref={group} name="life-map-emotional-weather" data-depth-band="far" position={[0, 3.7, -20]}>
    <Ribbon radius={7.4} lift={0.7} phase={0.6} color="#5b8eb5" opacity={0.075} width={0.024} />
    <Ribbon radius={5.8} lift={0.5} phase={2.1} color="#8e6fb0" opacity={0.055} width={0.018} />
  </group>;
}

function ArchiveParticles({ qualityTier, reducedMotion }: { qualityTier: SpatialQualityProfile["tier"]; reducedMotion: boolean }) {
  const particleCount = qualityTier === "low" ? 80 : qualityTier === "medium" ? 160 : 260;
  return <group name="life-map-archive-particles" data-depth-band="far">
    <Stars radius={54} depth={38} count={particleCount} factor={1.25} saturation={0.24} fade speed={reducedMotion ? 0 : 0.018} />
  </group>;
}

function VisualArtifact({ node, active }: ArtifactProps) {
  return <group name="life-map-artifact-visual">
    <mesh><boxGeometry args={[0.72, 0.5, 0.08]} /><meshPhysicalMaterial color="#122838" emissive={node.aura} emissiveIntensity={active ? 0.72 : 0.3} roughness={0.24} metalness={0.55} transmission={0.08} /></mesh>
    <mesh position={[0, 0, 0.065]}><boxGeometry args={[0.52, 0.32, 0.035]} /><meshStandardMaterial color={node.aura} emissive={node.aura} emissiveIntensity={active ? 1.15 : 0.48} roughness={0.4} /></mesh>
    <mesh scale={1.12}><boxGeometry args={[0.72, 0.5, 0.08]} /><meshBasicMaterial color="#dff7ff" wireframe transparent opacity={active ? 0.28 : 0.1} /></mesh>
  </group>;
}

function AudioArtifact({ node, active }: ArtifactProps) {
  return <group name="life-map-artifact-audio">{[-0.36, -0.18, 0, 0.18, 0.36].map((x, index) => <mesh key={x} position={[x, 0, 0]} scale={[1, 0.62 + Math.abs(2 - index) * 0.24, 1]}><capsuleGeometry args={[0.045, 0.38, 6, 12]} /><meshStandardMaterial color={node.aura} emissive={node.aura} emissiveIntensity={active ? 1.3 : 0.58} roughness={0.2} /></mesh>)}</group>;
}

function RelationshipArtifact({ node, active }: ArtifactProps) {
  const points: [number, number, number][] = [[-0.32, -0.04, 0], [0.32, 0.02, -0.08], [0, 0.34, -0.16], [-0.32, -0.04, 0]];
  return <group name="life-map-artifact-relationship">
    {points.slice(0, 3).map((position, index) => <mesh key={index} position={position}><octahedronGeometry args={[0.2, 1]} /><meshPhysicalMaterial color="#dff8ff" emissive={node.aura} emissiveIntensity={active ? 1 : 0.42} roughness={0.14} transmission={0.12} /></mesh>)}
    <Line points={points} color={node.aura} transparent opacity={active ? 0.9 : 0.5} lineWidth={1.1} />
  </group>;
}

function PlaceArtifact({ node, active }: ArtifactProps) {
  return <group name="life-map-artifact-place">
    <mesh position={[0, -0.18, 0]}><cylinderGeometry args={[0.46, 0.56, 0.18, 6]} /><meshStandardMaterial color="#183243" emissive={node.aura} emissiveIntensity={active ? 0.72 : 0.28} roughness={0.48} metalness={0.38} /></mesh>
    <mesh position={[0, 0.17, 0]} rotation={[0, Math.PI / 4, 0]}><coneGeometry args={[0.44, 0.58, 4]} /><meshStandardMaterial color={node.aura} emissive={node.aura} emissiveIntensity={active ? 0.95 : 0.4} roughness={0.32} /></mesh>
  </group>;
}

function EmotionArtifact({ node, active }: ArtifactProps) {
  return <group name="life-map-artifact-emotion">
    <mesh rotation={[0.35, 0.2, 0.18]}><torusKnotGeometry args={[0.28, 0.075, 72, 10, 2, 3]} /><meshPhysicalMaterial color={node.aura} emissive={node.aura} emissiveIntensity={active ? 1.2 : 0.48} roughness={0.16} metalness={0.28} transmission={0.15} /></mesh>
  </group>;
}

function PatternArtifact({ node, active }: ArtifactProps) {
  return <group name="life-map-artifact-pattern">
    {[0.28, 0.42, 0.56].map((radius, index) => <mesh key={radius} rotation={[Math.PI / 2 + index * 0.14, index * 0.36, 0]}><torusGeometry args={[radius, 0.028 + index * 0.006, 8, 52]} /><meshStandardMaterial color={node.aura} emissive={node.aura} emissiveIntensity={active ? 0.9 : 0.34} transparent opacity={0.72 - index * 0.12} /></mesh>)}
  </group>;
}

function AchievementArtifact({ node, active }: ArtifactProps) {
  return <group name="life-map-artifact-achievement">
    <mesh position={[0, -0.16, 0]}><cylinderGeometry args={[0.38, 0.5, 0.16, 8]} /><meshStandardMaterial color="#2a2415" emissive={node.aura} emissiveIntensity={0.3} metalness={0.76} roughness={0.24} /></mesh>
    <mesh position={[0, 0.22, 0]} rotation={[0.2, 0.3, 0.1]}><dodecahedronGeometry args={[0.34, 1]} /><meshPhysicalMaterial color="#ffe8a6" emissive={node.aura} emissiveIntensity={active ? 1.25 : 0.5} roughness={0.16} metalness={0.52} /></mesh>
  </group>;
}

function GoalArtifact({ node, active }: ArtifactProps) {
  return <group name="life-map-artifact-goal">
    <mesh position={[0, -0.08, 0]}><cylinderGeometry args={[0.085, 0.12, 0.66, 10]} /><meshStandardMaterial color={node.aura} emissive={node.aura} emissiveIntensity={active ? 1.1 : 0.44} metalness={0.62} /></mesh>
    <mesh position={[0, 0.42, 0]}><coneGeometry args={[0.24, 0.42, 5]} /><meshStandardMaterial color="#fff0bd" emissive={node.aura} emissiveIntensity={active ? 1.2 : 0.5} /></mesh>
  </group>;
}

function FutureArtifact({ node, active }: ArtifactProps) {
  return <group name="life-map-artifact-future">
    <mesh rotation={[0.3, 0.5, 0.1]}><tetrahedronGeometry args={[0.46, 1]} /><meshPhysicalMaterial color="#f6edce" emissive={node.aura} emissiveIntensity={active ? 1.08 : 0.4} roughness={0.12} metalness={0.38} transmission={0.18} /></mesh>
    <mesh scale={1.22} rotation={[-0.25, 0.12, 0.3]}><tetrahedronGeometry args={[0.46, 0]} /><meshBasicMaterial color={node.aura} wireframe transparent opacity={active ? 0.34 : 0.12} /></mesh>
  </group>;
}

function EverydayArtifact({ node, active }: ArtifactProps) {
  return <group name="life-map-artifact-everyday">
    <mesh rotation={[0.2, 0.4, 0.08]}><dodecahedronGeometry args={[0.34, 0]} /><meshStandardMaterial color="#b9dbe8" emissive={node.aura} emissiveIntensity={active ? 0.86 : 0.32} roughness={0.42} metalness={0.2} /></mesh>
    <mesh scale={1.18}><dodecahedronGeometry args={[0.34, 0]} /><meshBasicMaterial color={node.aura} wireframe transparent opacity={active ? 0.22 : 0.08} /></mesh>
  </group>;
}

function ArchiveArtifact({ node, active }: ArtifactProps) {
  return <group name="life-map-artifact-archive">
    {[-0.18, 0, 0.18].map((y, index) => <mesh key={y} position={[0, y, index * -0.04]} rotation={[0.08, 0.22, 0]}><boxGeometry args={[0.62 - index * 0.08, 0.12, 0.42]} /><meshStandardMaterial color="#17202b" emissive={node.aura} emissiveIntensity={active ? 0.58 : 0.2} roughness={0.5} metalness={0.42} /></mesh>)}
    <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.52, 0.025, 8, 48]} /><meshBasicMaterial color={node.aura} transparent opacity={active ? 0.4 : 0.14} /></mesh>
  </group>;
}

function ProtectedArtifact({ node, active }: ArtifactProps) {
  return <group name="life-map-artifact-protected">
    <mesh><dodecahedronGeometry args={[0.42, 1]} /><meshPhysicalMaterial color="#03050a" emissive="#39284b" emissiveIntensity={active ? 0.38 : 0.16} metalness={0.9} roughness={0.18} /></mesh>
    <mesh scale={1.18}><dodecahedronGeometry args={[0.42, 0]} /><meshBasicMaterial color={node.aura} wireframe transparent opacity={active ? 0.32 : 0.14} /></mesh>
  </group>;
}

function ArtifactShape({ node, active }: ArtifactProps) {
  const family: LifeMapArtifactFamily = resolveArtifactFamily(node);
  if (family === "visual") return <VisualArtifact node={node} active={active} />;
  if (family === "audio") return <AudioArtifact node={node} active={active} />;
  if (family === "relationship") return <RelationshipArtifact node={node} active={active} />;
  if (family === "place") return <PlaceArtifact node={node} active={active} />;
  if (family === "emotion") return <EmotionArtifact node={node} active={active} />;
  if (family === "pattern") return <PatternArtifact node={node} active={active} />;
  if (family === "achievement") return <AchievementArtifact node={node} active={active} />;
  if (family === "goal") return <GoalArtifact node={node} active={active} />;
  if (family === "future") return <FutureArtifact node={node} active={active} />;
  if (family === "archive") return <ArchiveArtifact node={node} active={active} />;
  if (family === "protected") return <ProtectedArtifact node={node} active={active} />;
  return <EverydayArtifact node={node} active={active} />;
}

function MemoryArtifact({ node, index, selected, phase, reducedMotion, onSelect }: { node: LifeMapNode; index: number; selected: LifeMapNode | null; phase: LifeMapJourneyPhase; reducedMotion: boolean; onSelect: (node: LifeMapNode) => void }) {
  const group = useRef<THREE.Group>(null);
  const active = selected?.id === node.id;
  const related = Boolean(selected && (selected.connectedTo.includes(node.id) || node.connectedTo.includes(selected.id)));
  const visible = !selected || active || related;
  const importance = artifactImportance(node);
  const chapter = chapterForNode(node, index);
  useFrame(({ clock }, delta) => {
    if (!group.current || reducedMotion) return;
    const desired = active ? (phase === "arrival" ? 1.28 : 1.12) : related ? 0.72 : 0.52 + importance * 0.28;
    const scale = THREE.MathUtils.damp(group.current.scale.x, desired, active ? 4.8 : 3.2, delta);
    group.current.scale.setScalar(scale);
    group.current.visible = visible;
    group.current.rotation.y = Math.sin(clock.elapsedTime * 0.14 + index) * 0.08;
    group.current.position.y = node.position[1] + Math.sin(clock.elapsedTime * 0.25 + index) * (active ? 0.015 : 0.045);
  });
  return <group ref={group} position={node.position} visible={visible} name={`life-map-artifact-${resolveArtifactFamily(node)}-${node.id}`} data-artifact-family={resolveArtifactFamily(node)} data-importance={importance.toFixed(2)} data-chapter={chapter.id}>
    <group onClick={(event) => { event.stopPropagation(); onSelect(node); }} onPointerOver={() => { document.body.style.cursor = "pointer"; }} onPointerOut={() => { document.body.style.cursor = ""; }}>
      <ArtifactShape node={node} active={active} />
      {active ? <group name="life-map-selected-artifact-halo"><Ribbon radius={0.68} lift={0.08} phase={0.5} color={node.aura} opacity={0.54} width={0.009} /><Ribbon radius={0.88} lift={0.11} phase={1.9} color="#dff8ff" opacity={0.16} width={0.006} /></group> : null}
    </group>
    <pointLight color={node.aura} intensity={active ? 4.6 : related ? 1.5 : 0.35 + importance * 0.6} distance={active ? 7 : 3.2} decay={2} />
    {active ? <Html position={[0, 0.92, 0]} center distanceFactor={15}><button className="life-map-world-label" data-active="true" data-family={resolveArtifactFamily(node)} onClick={() => onSelect(node)}><strong>{node.locked ? "Protected memory" : node.title}</strong><span>{node.locked ? "Private · sealed" : `${artifactFamilyLabel(node)} · ${node.dateLabel}`}</span></button></Html> : null}
  </group>;
}

function PathPulse({ curve, color, reducedMotion, offset }: { curve: THREE.QuadraticBezierCurve3; color: string; reducedMotion: boolean; offset: number }) {
  const pulse = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!pulse.current || reducedMotion) return;
    const t = (clock.elapsedTime * 0.07 + offset) % 1;
    pulse.current.position.copy(curve.getPoint(t));
  });
  return <mesh ref={pulse} position={curve.getPoint(offset % 1)} name="life-map-living-pulse">
    <octahedronGeometry args={[0.055, 1]} />
    <meshBasicMaterial color={color} transparent opacity={0.74} />
  </mesh>;
}

function SemanticPath({ source, target, active, reducedMotion, index }: { source: LifeMapNode; target: LifeMapNode; active: boolean; reducedMotion: boolean; index: number }) {
  const start = useMemo(() => new THREE.Vector3(...source.position), [source.position]);
  const end = useMemo(() => new THREE.Vector3(...target.position), [target.position]);
  const curve = useMemo(() => {
    const middle = start.clone().lerp(end, 0.5);
    middle.y += Math.max(0.7, start.distanceTo(end) * 0.14);
    middle.z -= Math.min(1.4, start.distanceTo(end) * 0.06);
    return new THREE.QuadraticBezierCurve3(start, middle, end);
  }, [end, start]);
  const points = useMemo(() => curve.getPoints(40), [curve]);
  const kind: LifeMapPathKind = resolvePathKind(source, target);
  const color = LIFE_MAP_PATH_PALETTE[kind];
  const opacity = active ? 0.68 : kind === "protected" ? 0.055 : 0.1;
  return <group data-path-kind={kind}>
    <Line points={points} color={color} lineWidth={active ? 1.8 : 0.6} transparent opacity={opacity} dashed={kind === "inferred" || kind === "corrected" || kind === "protected"} dashScale={1.5 + index * 0.03} />
    {active ? <PathPulse curve={curve} color={color} reducedMotion={reducedMotion} offset={(index * 0.19) % 1} /> : null}
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
      return <SemanticPath key={`${source.id}-${target.id}`} source={source} target={target} active={active} reducedMotion={reducedMotion} index={sourceIndex * 3 + targetIndex} />;
    }))}
  </group>;
}

function ArrivalSanctuary({ selected, phase }: { selected: LifeMapNode | null; phase: LifeMapJourneyPhase }) {
  if (!selected || (phase !== "approach" && phase !== "arrival")) return null;
  const opacity = phase === "arrival" ? 0.28 : 0.12;
  return <group position={selected.position} name="life-map-intimate-memory-chamber" data-scale="intimate" data-depth-band="near">
    <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.74, 0]}><ringGeometry args={[1.02, 1.16, 64]} /><meshBasicMaterial color={selected.aura} transparent opacity={opacity} side={THREE.DoubleSide} depthWrite={false} /></mesh>
    {[0, 1, 2, 3].map((index) => { const angle = index / 4 * Math.PI * 2; return <mesh key={index} position={[Math.cos(angle) * 1.28, -0.62, Math.sin(angle) * 1.28]} name={`life-map-sanctuary-marker-${index}`}><cylinderGeometry args={[0.025, 0.055, 0.22, 10]} /><meshStandardMaterial color={GLASS} emissive={selected.aura} emissiveIntensity={0.22} transparent opacity={opacity} /></mesh>; })}
    <pointLight color={selected.aura} intensity={phase === "arrival" ? 3.4 : 1.6} distance={7} />
  </group>;
}

export function LifeMapProductionWorld({ nodes, selected, phase, profile, onSelect, cameraRig, webglRecovery }: { nodes: LifeMapNode[]; selected: LifeMapNode | null; phase: LifeMapJourneyPhase; profile: SpatialQualityProfile; onSelect: (node: LifeMapNode) => void; cameraRig: ReactNode; webglRecovery: ReactNode }) {
  const qualityTier = profile.tier;
  const starCount = profile.tier === "low" ? 420 : profile.tier === "medium" ? 760 : 1200;
  return <>
    <color attach="background" args={[DEEP]} />
    <fog attach="fog" args={[DEEP, 12, 58]} />
    <ambientLight intensity={0.24} color="#a7e5ff" />
    <directionalLight position={[7, 10, 8]} intensity={1.7} color="#d8f4ff" castShadow={profile.shadows} />
    <hemisphereLight args={["#c8f3ff", "#02040a", 0.36]} />
    {webglRecovery}{cameraRig}
    <LifeCore reducedMotion={profile.reducedMotion} tier={profile.tier} />
    <LightBridges />
    <ChapterConstellations selected={selected} />
    <ForegroundObservatory selected={selected} />
    <RelationshipObservatory selected={selected} />
    <GoalHorizon />
    <AchievementMonument />
    <PrivacyVault />
    <EmotionalWeather reducedMotion={profile.reducedMotion} />
    <LivingPaths nodes={nodes} selected={selected} reducedMotion={profile.reducedMotion} />
    <group name="life-map-memory-artifact-families" data-depth-band="middle">{nodes.map((node, index) => <MemoryArtifact key={node.id} node={node} index={index} selected={selected} phase={phase} reducedMotion={profile.reducedMotion} onSelect={onSelect} />)}</group>
    <ArrivalSanctuary selected={selected} phase={phase} />
    <ArchiveParticles qualityTier={qualityTier} reducedMotion={profile.reducedMotion} />
    <group name="life-map-far-future-horizon" data-depth-band="far"><Stars radius={78} depth={58} count={starCount} factor={1.7} saturation={0.18} fade speed={profile.reducedMotion ? 0 : 0.028} /></group>
    <CinematicPostProcessing active={profile.postprocessing} reducedMotion={profile.reducedMotion} />
  </>;
}
