"use client";

import { Html, Line, Stars } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
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

type ArtifactProps = { node: LifeMapNode; active: boolean };
const GOLD = "#ffd98a";
const PALE_GOLD = "#fff4cf";
const CYAN = "#8de7ff";
const ICE = "#dcf7ff";
const DEEP = "#02050a";

function curveThrough(points: [number, number, number][]) {
  return new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)), false, "catmullrom", 0.28);
}

function AtmosphericCurrent({ points, color, opacity, width = 0.012 }: { points: [number, number, number][]; color: string; opacity: number; width?: number }) {
  const curve = useMemo(() => curveThrough(points), [points]);
  return <mesh>
    <tubeGeometry args={[curve, 64, width, 6, false]} />
    <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.66} roughness={0.32} metalness={0.34} transparent opacity={opacity} depthWrite={false} />
  </mesh>;
}

function AuthoredEnvironment({ selected }: { selected: LifeMapNode | null }) {
  return <group name="life-map-authored-environment" data-depth-band="far">
    <mesh><sphereGeometry args={[72, 32, 20]} /><meshBasicMaterial color={selected ? "#02050a" : "#06101a"} side={THREE.BackSide} /></mesh>
    <mesh position={[-11, 6, -34]} rotation={[0.06, 0.08, -0.16]} scale={[16, 8, 1]}><planeGeometry args={[1, 1]} /><meshBasicMaterial color="#12364d" transparent opacity={selected ? 0.035 : 0.12} depthWrite={false} blending={THREE.AdditiveBlending} /></mesh>
    <mesh position={[12, -1, -31]} rotation={[-0.02, -0.12, 0.16]} scale={[14, 7, 1]}><planeGeometry args={[1, 1]} /><meshBasicMaterial color="#3c2949" transparent opacity={selected ? 0.028 : 0.08} depthWrite={false} blending={THREE.AdditiveBlending} /></mesh>
    <mesh position={[0, -7.4, -19]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[23, 96]} /><meshBasicMaterial color="#07131d" transparent opacity={0.74} depthWrite={false} /></mesh>
  </group>;
}

function TemporalHorizon({ selected }: { selected: LifeMapNode | null }) {
  if (selected) return null;
  return <group name="life-map-temporal-horizon" data-depth-band="far">
    <AtmosphericCurrent points={[[-14, 4.5, -22], [-7, 5.4, -24], [0, 4.8, -25], [7, 5.6, -24], [14, 4.5, -22]]} color="#4f8199" opacity={0.1} width={0.018} />
    <AtmosphericCurrent points={[[-13, -1.5, -17], [-6, -0.8, -19], [0, -1.3, -20], [6, -0.6, -19], [13, -1.4, -17]]} color="#6f5c82" opacity={0.065} width={0.014} />
    {[-10, -5, 0, 5, 10].map((x, index) => <group key={x} position={[x, -3.2 + Math.abs(index - 2) * 0.12, -16.5 - Math.abs(index - 2) * 0.5]}>
      <mesh><boxGeometry args={[0.08, 0.9 + index * 0.1, 0.08]} /><meshStandardMaterial color="#0a1a25" emissive={index === 2 ? GOLD : CYAN} emissiveIntensity={index === 2 ? 0.36 : 0.12} roughness={0.34} metalness={0.64} /></mesh>
      <mesh position={[0, 0.56 + index * 0.05, 0]}><octahedronGeometry args={[0.085, 1]} /><meshBasicMaterial color={index === 2 ? PALE_GOLD : CYAN} transparent opacity={0.58} /></mesh>
    </group>)}
  </group>;
}

function LifeCore({ reducedMotion, tier, hidden }: { reducedMotion: boolean; tier: SpatialQualityProfile["tier"]; hidden: boolean }) {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!group.current || reducedMotion) return;
    group.current.rotation.y = clock.elapsedTime * 0.035;
    group.current.rotation.x = Math.sin(clock.elapsedTime * 0.12) * 0.025;
  });
  return <group ref={group} name="life-map-white-gold-life-core" position={LIFE_MAP_CORE_POSITION} visible={!hidden} data-life-core="white-gold-layered">
    <mesh castShadow rotation={[0.18, 0.4, 0.06]}><icosahedronGeometry args={[0.92, tier === "high" ? 3 : 2]} /><meshPhysicalMaterial color={PALE_GOLD} emissive={GOLD} emissiveIntensity={0.88} roughness={0.16} metalness={0.3} transmission={0.08} clearcoat={0.9} /></mesh>
    <mesh scale={[0.72, 1.18, 0.72]} rotation={[-0.28, 0.16, 0.2]}><octahedronGeometry args={[0.95, 1]} /><meshStandardMaterial color="#f5d787" emissive="#ffc55a" emissiveIntensity={1.12} wireframe transparent opacity={0.58} /></mesh>
    {[0, 1, 2, 3].map((index) => { const angle = index * Math.PI / 2; return <mesh key={index} position={[Math.cos(angle) * 1.25, Math.sin(index * 1.7) * 0.26, Math.sin(angle) * 0.72]} rotation={[0.1, angle, 0.1]}><tetrahedronGeometry args={[0.09, 1]} /><meshBasicMaterial color={index % 2 ? CYAN : PALE_GOLD} transparent opacity={0.6} /></mesh>; })}
    <pointLight color={GOLD} intensity={tier === "low" ? 7 : 11} distance={22} decay={2} />
  </group>;
}

function LightBridges({ selected }: { selected: LifeMapNode | null }) {
  const origin = useMemo(() => new THREE.Vector3(...LIFE_MAP_CORE_POSITION), []);
  if (selected) return null;
  return <group name="life-map-light-bridges" data-depth-band="middle">{LIFE_MAP_CHAPTERS.map((chapter, index) => {
    const destination = new THREE.Vector3(...chapter.position);
    const control = origin.clone().lerp(destination, 0.52);
    control.y += 1.05 + index * 0.15;
    control.z -= 0.45;
    return <Line key={chapter.id} points={new THREE.QuadraticBezierCurve3(origin, control, destination).getPoints(36)} color={chapter.aura} lineWidth={0.7} transparent opacity={0.18} />;
  })}</group>;
}

function ChapterConstellations({ selected }: { selected: LifeMapNode | null }) {
  if (selected) return null;
  return <group name="life-map-authored-chapter-regions" data-scale="cosmic-overview" data-depth-band="middle">{LIFE_MAP_CHAPTERS.map((chapter, index) => {
    const anchorPositions: [number, number, number][] = [[-1.0, 0.15, 0.2], [-0.35, 0.62, -0.35], [0.42, 0.28, -0.6], [1.02, -0.05, 0.1]];
    return <group key={chapter.id} name={`life-map-chapter-${chapter.id}`} position={chapter.position} rotation={chapter.rotation} data-chapter-region={chapter.id}>
      <mesh position={[0, -0.62, -0.08]} rotation={[-0.06, index * 0.08, 0]}><boxGeometry args={[2.5, 0.1, 1.35]} /><meshStandardMaterial color="#081723" emissive={chapter.aura} emissiveIntensity={0.08} metalness={0.52} roughness={0.38} transparent opacity={0.72} /></mesh>
      <mesh position={[0, -0.48, -0.2]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[2.15, 1.0]} /><meshBasicMaterial color={chapter.aura} transparent opacity={0.045} depthWrite={false} /></mesh>
      {anchorPositions.map((position, point) => <mesh key={point} position={position} name={`life-map-chapter-anchor-${chapter.id}-${point}`} rotation={[0.12, point * 0.42, point * 0.12]}><dodecahedronGeometry args={[0.11 + point * 0.012, 1]} /><meshStandardMaterial color={point === 1 ? ICE : chapter.aura} emissive={chapter.aura} emissiveIntensity={0.58} roughness={0.22} metalness={0.58} transparent opacity={0.9} /></mesh>)}
      <Line points={anchorPositions} color={chapter.aura} lineWidth={0.65} transparent opacity={0.26} />
      <mesh position={[-1.2, 0.2, -0.1]}><boxGeometry args={[0.05, 1.05, 0.05]} /><meshStandardMaterial color="#0b1b27" emissive={chapter.aura} emissiveIntensity={0.18} /></mesh>
      <Html position={[-1.02, 0.9, 0]} center distanceFactor={18}><span className="life-map-chapter-label">{chapter.title}</span></Html>
    </group>;
  })}</group>;
}

function ForegroundObservatory({ selected }: { selected: LifeMapNode | null }) {
  if (selected) return null;
  return <group name="life-map-foreground-observatory" data-depth-band="near" position={[0, -2.65, 3.1]}>
    <mesh position={[0, 0, 0]}><boxGeometry args={[7.4, 0.12, 1.8]} /><meshStandardMaterial color="#07131d" emissive="#2f687d" emissiveIntensity={0.08} metalness={0.62} roughness={0.34} transparent opacity={0.86} /></mesh>
    <mesh position={[0, 0.1, -0.25]}><boxGeometry args={[4.6, 0.06, 0.72]} /><meshStandardMaterial color="#0a1d2a" emissive="#4b8399" emissiveIntensity={0.1} metalness={0.54} roughness={0.32} /></mesh>
    {[-3.1, -1.55, 1.55, 3.1].map((x, index) => <mesh key={x} position={[x, 0.48 + index % 2 * 0.1, -0.45]} rotation={[0, 0, x < 0 ? -0.05 : 0.05]}><boxGeometry args={[0.08, 0.86, 0.08]} /><meshStandardMaterial color="#0a1b27" emissive={index % 2 ? CYAN : GOLD} emissiveIntensity={0.14} metalness={0.68} roughness={0.28} /></mesh>)}
  </group>;
}

function RelationshipObservatory({ selected }: { selected: LifeMapNode | null }) {
  if (selected) return null;
  const positions: [number, number, number][] = [[-1.0, 0.08, 0.1], [-0.25, 0.55, -0.35], [0.55, 0.22, -0.55], [1.15, 0.4, 0.05]];
  return <group name="life-map-relationship-observatory" data-depth-band="middle" position={[5.8, 0.75, -7.2]}>{positions.map((position, index) => <mesh key={index} position={position}><octahedronGeometry args={[0.13 + index * 0.012, 1]} /><meshStandardMaterial color="#d9f6ff" emissive="#83dfff" emissiveIntensity={0.48} roughness={0.18} metalness={0.55} /></mesh>)}<Line points={positions} color="#a9e9ff" lineWidth={0.8} transparent opacity={0.3} /></group>;
}

function GoalHorizon({ selected }: { selected: LifeMapNode | null }) {
  if (selected) return null;
  return <group name="life-map-goal-horizon" data-depth-band="far" position={[-7.2, 2.6, -15.8]}><mesh rotation={[0, 0, -0.12]}><coneGeometry args={[0.5, 2.1, 5]} /><meshStandardMaterial color="#152634" emissive="#f0ce7b" emissiveIntensity={0.42} roughness={0.34} metalness={0.66} /></mesh><mesh position={[0, 1.36, 0]}><octahedronGeometry args={[0.18, 1]} /><meshStandardMaterial color="#fff0b0" emissive="#f4d681" emissiveIntensity={0.92} /></mesh></group>;
}

function AchievementMonument({ selected }: { selected: LifeMapNode | null }) {
  if (selected) return null;
  return <group name="life-map-achievement-monument" data-depth-band="far" position={[7.6, -0.2, -13.2]}><mesh><boxGeometry args={[1.25, 0.16, 1.0]} /><meshStandardMaterial color="#111c28" emissive="#c8a85c" emissiveIntensity={0.2} metalness={0.72} roughness={0.28} /></mesh><mesh position={[0, 0.72, 0]} rotation={[0.15, 0.25, 0.08]}><dodecahedronGeometry args={[0.4, 1]} /><meshPhysicalMaterial color="#f4d98e" emissive="#f2c65c" emissiveIntensity={0.72} roughness={0.18} metalness={0.52} /></mesh></group>;
}

function PrivacyVault({ selected }: { selected: LifeMapNode | null }) {
  if (selected) return null;
  return <group name="life-map-privacy-vault" data-depth-band="far" position={[-8.0, -0.8, -10.8]}><mesh><dodecahedronGeometry args={[0.78, 0]} /><meshStandardMaterial color="#03050a" emissive="#3b294c" emissiveIntensity={0.14} metalness={0.9} roughness={0.18} /></mesh><mesh scale={1.12}><dodecahedronGeometry args={[0.78, 0]} /><meshBasicMaterial color="#7b6a94" wireframe transparent opacity={0.16} /></mesh></group>;
}

function EmotionalWeather({ reducedMotion, selected }: { reducedMotion: boolean; selected: LifeMapNode | null }) {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!group.current || reducedMotion) return;
    group.current.rotation.y = Math.sin(clock.elapsedTime * 0.03) * 0.05;
    group.current.position.y = 3.2 + Math.sin(clock.elapsedTime * 0.08) * 0.08;
  });
  if (selected) return null;
  return <group ref={group} name="life-map-emotional-weather" data-depth-band="far" position={[0, 3.2, -17]}><AtmosphericCurrent points={[[-8, 0.2, 0], [-4, 0.9, -1], [0, 0.3, -1.8], [4, 0.8, -1], [8, 0, 0]]} color="#5b8eb5" opacity={0.08} width={0.018} /><AtmosphericCurrent points={[[-6, -0.45, -1], [-2.5, 0.2, -1.7], [1, -0.15, -2.2], [5.5, 0.3, -1]]} color="#8e6fb0" opacity={0.05} width={0.014} /></group>;
}

function ArchiveParticles({ qualityTier, reducedMotion }: { qualityTier: SpatialQualityProfile["tier"]; reducedMotion: boolean }) {
  const particleCount = qualityTier === "low" ? 80 : qualityTier === "medium" ? 160 : 260;
  return <group name="life-map-archive-particles" data-depth-band="far"><Stars radius={52} depth={36} count={particleCount} factor={1.05} saturation={0.2} fade speed={reducedMotion ? 0 : 0.012} /></group>;
}

function VisualArtifact({ node, active }: ArtifactProps) { return <group name="life-map-artifact-visual"><mesh><boxGeometry args={[0.72, 0.5, 0.1]} /><meshPhysicalMaterial color="#122838" emissive={node.aura} emissiveIntensity={active ? 0.72 : 0.28} roughness={0.24} metalness={0.55} /></mesh><mesh position={[0, 0, 0.08]}><boxGeometry args={[0.46, 0.26, 0.04]} /><meshStandardMaterial color={node.aura} emissive={node.aura} emissiveIntensity={active ? 0.95 : 0.4} /></mesh></group>; }
function AudioArtifact({ node, active }: ArtifactProps) { return <group name="life-map-artifact-audio">{[-0.3, -0.15, 0, 0.15, 0.3].map((x, index) => <mesh key={x} position={[x, 0, 0]} scale={[1, 0.52 + Math.abs(2 - index) * 0.2, 1]}><boxGeometry args={[0.06, 0.48, 0.07]} /><meshStandardMaterial color={node.aura} emissive={node.aura} emissiveIntensity={active ? 0.82 : 0.34} /></mesh>)}</group>; }
function RelationshipArtifact({ node, active }: ArtifactProps) { const points: [number, number, number][] = [[-0.32, -0.08, 0], [0.32, 0.04, -0.08], [0, 0.36, -0.16], [-0.32, -0.08, 0]]; return <group name="life-map-artifact-relationship">{points.slice(0, 3).map((position, index) => <mesh key={index} position={position}><octahedronGeometry args={[0.17, 1]} /><meshPhysicalMaterial color="#dff8ff" emissive={node.aura} emissiveIntensity={active ? 0.9 : 0.38} /></mesh>)}<Line points={points} color={node.aura} transparent opacity={active ? 0.78 : 0.44} lineWidth={1} /></group>; }
function PlaceArtifact({ node, active }: ArtifactProps) { return <group name="life-map-artifact-place"><mesh position={[0, -0.18, 0]}><boxGeometry args={[0.78, 0.14, 0.6]} /><meshStandardMaterial color="#183243" emissive={node.aura} emissiveIntensity={active ? 0.62 : 0.24} /></mesh><mesh position={[0, 0.17, 0]} rotation={[0, Math.PI / 4, 0]}><coneGeometry args={[0.38, 0.54, 4]} /><meshStandardMaterial color={node.aura} emissive={node.aura} emissiveIntensity={active ? 0.8 : 0.34} /></mesh></group>; }
function EmotionArtifact({ node, active }: ArtifactProps) { const petals: [number, number, number, number][] = [[-0.28, 0.08, 0, -0.36], [0.28, 0.06, -0.08, 0.36], [0, 0.34, -0.16, 0.06], [0, -0.18, 0.04, 0.14]]; return <group name="life-map-artifact-emotion"><mesh scale={[0.34, 0.62, 0.3]} rotation={[0.18, 0.42, 0.08]}><icosahedronGeometry args={[0.48, 2]} /><meshPhysicalMaterial color="#f2fbff" emissive={node.aura} emissiveIntensity={active ? 0.96 : 0.4} transmission={0.16} clearcoat={0.88} /></mesh>{petals.map(([x, y, z, rotation], index) => <mesh key={index} position={[x, y, z]} scale={[0.36, 0.66, 0.22]} rotation={[0.1, rotation, index * 0.28]}><dodecahedronGeometry args={[0.28, 1]} /><meshPhysicalMaterial color={index % 2 ? node.aura : ICE} emissive={node.aura} emissiveIntensity={active ? 0.66 : 0.26} transmission={0.1} transparent opacity={active ? 0.7 : 0.44} /></mesh>)}</group>; }
function PatternArtifact({ node, active }: ArtifactProps) { return <group name="life-map-artifact-pattern">{[-0.36, 0, 0.36].map((x, index) => <mesh key={x} position={[x, index === 1 ? 0.18 : -0.06, -index * 0.08]} rotation={[0.1, index * 0.44, index * 0.16]}><boxGeometry args={[0.2, 0.48 + index * 0.1, 0.14]} /><meshStandardMaterial color={node.aura} emissive={node.aura} emissiveIntensity={active ? 0.76 : 0.3} transparent opacity={0.72} /></mesh>)}</group>; }
function AchievementArtifact({ node, active }: ArtifactProps) { return <group name="life-map-artifact-achievement"><mesh position={[0, -0.16, 0]}><boxGeometry args={[0.8, 0.14, 0.66]} /><meshStandardMaterial color="#2a2415" emissive={node.aura} emissiveIntensity={0.24} metalness={0.76} /></mesh><mesh position={[0, 0.2, 0]}><dodecahedronGeometry args={[0.31, 1]} /><meshPhysicalMaterial color="#ffe8a6" emissive={node.aura} emissiveIntensity={active ? 0.98 : 0.42} /></mesh></group>; }
function GoalArtifact({ node, active }: ArtifactProps) { return <group name="life-map-artifact-goal"><mesh position={[0, -0.08, 0]}><boxGeometry args={[0.08, 0.62, 0.08]} /><meshStandardMaterial color={node.aura} emissive={node.aura} emissiveIntensity={active ? 0.9 : 0.36} /></mesh><mesh position={[0, 0.37, 0]}><coneGeometry args={[0.2, 0.34, 5]} /><meshStandardMaterial color="#fff0bd" emissive={node.aura} emissiveIntensity={active ? 0.96 : 0.42} /></mesh></group>; }
function FutureArtifact({ node, active }: ArtifactProps) { return <group name="life-map-artifact-future"><mesh rotation={[0.3, 0.5, 0.1]}><tetrahedronGeometry args={[0.4, 1]} /><meshPhysicalMaterial color="#f6edce" emissive={node.aura} emissiveIntensity={active ? 0.88 : 0.34} transmission={0.14} /></mesh><mesh scale={1.18}><tetrahedronGeometry args={[0.4, 0]} /><meshBasicMaterial color={node.aura} wireframe transparent opacity={active ? 0.26 : 0.1} /></mesh></group>; }
function EverydayArtifact({ node, active }: ArtifactProps) { return <group name="life-map-artifact-everyday"><mesh><dodecahedronGeometry args={[0.3, 0]} /><meshStandardMaterial color="#b9dbe8" emissive={node.aura} emissiveIntensity={active ? 0.7 : 0.28} /></mesh><mesh scale={1.15}><dodecahedronGeometry args={[0.3, 0]} /><meshBasicMaterial color={node.aura} wireframe transparent opacity={active ? 0.18 : 0.08} /></mesh></group>; }
function ArchiveArtifact({ node, active }: ArtifactProps) { return <group name="life-map-artifact-archive">{[-0.16, 0, 0.16].map((y, index) => <mesh key={y} position={[0, y, index * -0.05]}><boxGeometry args={[0.56 - index * 0.07, 0.1, 0.36]} /><meshStandardMaterial color="#17202b" emissive={node.aura} emissiveIntensity={active ? 0.5 : 0.2} /></mesh>)}</group>; }
function ProtectedArtifact({ node, active }: ArtifactProps) { return <group name="life-map-artifact-protected"><mesh><dodecahedronGeometry args={[0.36, 1]} /><meshPhysicalMaterial color="#03050a" emissive="#39284b" emissiveIntensity={active ? 0.3 : 0.12} metalness={0.9} /></mesh><mesh scale={1.15}><dodecahedronGeometry args={[0.36, 0]} /><meshBasicMaterial color={node.aura} wireframe transparent opacity={active ? 0.24 : 0.12} /></mesh></group>; }

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
  const visible = !selected || active || (related && phase !== "arrival");
  const importance = artifactImportance(node);
  const chapter = chapterForNode(node, index);
  const semanticLabel = artifactFamilyLabel(node);
  useFrame(({ clock }, delta) => {
    if (!group.current || reducedMotion) return;
    const desired = active ? (phase === "arrival" ? 1.18 : 0.96) : related ? 0.32 : 0.5 + importance * 0.2;
    const scale = THREE.MathUtils.damp(group.current.scale.x, desired, active ? 4.8 : 3.2, delta);
    group.current.scale.setScalar(scale);
    group.current.visible = visible;
    group.current.rotation.y = Math.sin(clock.elapsedTime * 0.12 + index) * 0.045;
    group.current.position.y = node.position[1] + Math.sin(clock.elapsedTime * 0.22 + index) * (active ? 0.01 : 0.035);
  });
  return <group ref={group} position={node.position} visible={visible} name={`life-map-artifact-${resolveArtifactFamily(node)}-${node.id}`} data-artifact-family={resolveArtifactFamily(node)} data-importance={importance.toFixed(2)} data-chapter={chapter.id} data-semantic-label={semanticLabel}>
    <group onClick={(event) => { event.stopPropagation(); onSelect(node); }} onPointerOver={() => { document.body.style.cursor = "pointer"; }} onPointerOut={() => { document.body.style.cursor = ""; }}>
      <ArtifactShape node={node} active={active} />
      {active ? <group name="life-map-selected-artifact-halo" position={[0, 0, -0.44]}>{[-0.48, 0, 0.48].map((x, marker) => <mesh key={x} position={[x, -0.42 + marker * 0.06, -0.12]} rotation={[0.1, marker * 0.32, 0.18]}><tetrahedronGeometry args={[0.06, 1]} /><meshBasicMaterial color={marker === 1 ? ICE : node.aura} transparent opacity={0.54} /></mesh>)}</group> : null}
    </group>
    <pointLight color={node.aura} intensity={active ? 3.2 : related ? 0.7 : 0.26 + importance * 0.42} distance={active ? 6 : 2.8} decay={2} />
  </group>;
}

function PathPulse({ curve, color, reducedMotion, offset }: { curve: THREE.QuadraticBezierCurve3; color: string; reducedMotion: boolean; offset: number }) {
  const pulse = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!pulse.current || reducedMotion) return;
    const t = (clock.elapsedTime * 0.055 + offset) % 1;
    pulse.current.position.copy(curve.getPoint(t));
  });
  return <mesh ref={pulse} position={curve.getPoint(offset % 1)} name="life-map-living-pulse"><octahedronGeometry args={[0.04, 1]} /><meshBasicMaterial color={color} transparent opacity={0.66} /></mesh>;
}

function SemanticPath({ source, target, active, reducedMotion, index }: { source: LifeMapNode; target: LifeMapNode; active: boolean; reducedMotion: boolean; index: number }) {
  const start = useMemo(() => new THREE.Vector3(...source.position), [source.position]);
  const end = useMemo(() => new THREE.Vector3(...target.position), [target.position]);
  const curve = useMemo(() => { const middle = start.clone().lerp(end, 0.5); middle.y += Math.max(0.65, start.distanceTo(end) * 0.11); middle.z -= Math.min(1.0, start.distanceTo(end) * 0.05); return new THREE.QuadraticBezierCurve3(start, middle, end); }, [end, start]);
  const kind: LifeMapPathKind = resolvePathKind(source, target);
  const color = LIFE_MAP_PATH_PALETTE[kind];
  const opacity = active ? 0.42 : kind === "protected" ? 0.035 : 0.09;
  return <group data-path-kind={kind}><Line points={curve.getPoints(36)} color={color} lineWidth={active ? 1.1 : 0.48} transparent opacity={opacity} dashed={kind === "inferred" || kind === "corrected" || kind === "protected"} dashScale={1.5 + index * 0.03} />{active ? <PathPulse curve={curve} color={color} reducedMotion={reducedMotion} offset={(index * 0.19) % 1} /> : null}</group>;
}

function LivingPaths({ nodes, selected, reducedMotion, phase }: { nodes: LifeMapNode[]; selected: LifeMapNode | null; reducedMotion: boolean; phase: LifeMapJourneyPhase }) {
  const byId = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  if (selected && phase === "arrival") return null;
  return <group name="life-map-curved-semantic-paths" data-path-system="curved-semantic" data-depth-band="middle">{nodes.flatMap((source, sourceIndex) => source.connectedTo.slice(0, 3).map((targetId, targetIndex) => { const target = byId.get(targetId); if (!target || target.id < source.id) return null; const active = selected?.id === source.id || selected?.id === target.id; if (selected && !active) return null; return <SemanticPath key={`${source.id}-${target.id}`} source={source} target={target} active={active} reducedMotion={reducedMotion} index={sourceIndex * 3 + targetIndex} />; }))}</group>;
}

function SelectedRelationshipContext({ nodes, selected, reducedMotion, phase }: { nodes: LifeMapNode[]; selected: LifeMapNode | null; reducedMotion: boolean; phase: LifeMapJourneyPhase }) {
  if (!selected || phase !== "arrival") return null;
  const related = selected.connectedTo.map((id) => nodes.find((node) => node.id === id)).filter((node): node is LifeMapNode => Boolean(node)).slice(0, 3);
  return <group position={selected.position} name="life-map-selected-relationship-context" data-depth-band="middle">{related.map((node, index) => { const side = index % 2 === 0 ? -1 : 1; const end = new THREE.Vector3(side * (1.55 + index * 0.12), 0.12 + index * 0.28, -0.58 - index * 0.22); const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0.03, -0.2), new THREE.Vector3(end.x * 0.42, 0.5 + index * 0.12, end.z * 0.5), end); const color = LIFE_MAP_PATH_PALETTE[resolvePathKind(selected, node)]; return <group key={node.id}><Line points={curve.getPoints(28)} color={color} lineWidth={0.72} transparent opacity={0.26} /><mesh position={end} name={`life-map-related-witness-${node.id}`} rotation={[0.1, index * 0.42, 0.16]}><dodecahedronGeometry args={[0.11, 1]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} transparent opacity={0.82} /></mesh>{!reducedMotion ? <PathPulse curve={curve} color={color} reducedMotion={false} offset={index * 0.27} /> : null}</group>; })}</group>;
}

function ArrivalSanctuary({ selected, phase, reducedMotion }: { selected: LifeMapNode | null; phase: LifeMapJourneyPhase; reducedMotion: boolean }) {
  const chamber = useRef<THREE.Group>(null);
  useFrame(({ clock }) => { if (!chamber.current || reducedMotion) return; chamber.current.rotation.y = Math.sin(clock.elapsedTime * 0.08) * 0.012; });
  if (!selected || (phase !== "approach" && phase !== "arrival")) return null;
  const family = resolveArtifactFamily(selected);
  const opacity = phase === "arrival" ? 1 : 0.42;
  const warm = family === "achievement" || family === "goal" || family === "future";
  const chamberColor = warm ? GOLD : selected.aura;
  return <group ref={chamber} position={selected.position} name="life-map-intimate-memory-chamber" data-scale="intimate" data-depth-band="near" data-chamber-family={family}>
    <group name="life-map-chamber-threshold" position={[0, 0, -0.92]}><mesh position={[-1.28, 0.24, 0]} rotation={[0, 0.04, -0.03]}><boxGeometry args={[0.09, 2.05, 0.12]} /><meshStandardMaterial color="#0a1c29" emissive={chamberColor} emissiveIntensity={0.16 * opacity} metalness={0.68} roughness={0.28} /></mesh><mesh position={[1.28, 0.24, 0]} rotation={[0, -0.04, 0.03]}><boxGeometry args={[0.09, 2.05, 0.12]} /><meshStandardMaterial color="#0a1c29" emissive={chamberColor} emissiveIntensity={0.16 * opacity} metalness={0.68} roughness={0.28} /></mesh><mesh position={[0, 1.24, 0]}><boxGeometry args={[2.62, 0.09, 0.12]} /><meshStandardMaterial color="#0a1c29" emissive={chamberColor} emissiveIntensity={0.13 * opacity} metalness={0.68} roughness={0.28} /></mesh></group>
    <group name="life-map-chamber-floor" position={[0, -0.68, 0.25]}>{[0, 1, 2, 3].map((index) => <mesh key={index} position={[0, -index * 0.01, index * 0.42]}><boxGeometry args={[1.7 - index * 0.16, 0.06, 0.32]} /><meshStandardMaterial color={index === 0 ? "#102b3a" : "#071620"} emissive={chamberColor} emissiveIntensity={(0.08 + index * 0.018) * opacity} metalness={0.56} roughness={0.36} transparent opacity={0.88} /></mesh>)}</group>
    <group name="life-map-chamber-memory-veils" position={[0, 0.12, -1.36]}><mesh position={[-0.82, 0.08, 0]} rotation={[0, 0.18, -0.04]} scale={[0.68, 2.2, 1]}><planeGeometry args={[1, 1]} /><meshBasicMaterial color={chamberColor} transparent opacity={0.045 * opacity} side={THREE.DoubleSide} depthWrite={false} /></mesh><mesh position={[0, 0.22, -0.12]} scale={[0.86, 2.45, 1]}><planeGeometry args={[1, 1]} /><meshBasicMaterial color={ICE} transparent opacity={0.028 * opacity} side={THREE.DoubleSide} depthWrite={false} /></mesh><mesh position={[0.82, 0.06, 0]} rotation={[0, -0.18, 0.04]} scale={[0.68, 2.2, 1]}><planeGeometry args={[1, 1]} /><meshBasicMaterial color={chamberColor} transparent opacity={0.045 * opacity} side={THREE.DoubleSide} depthWrite={false} /></mesh></group>
    <group name="life-map-chamber-temporal-residue">{[-0.92, -0.52, 0.52, 0.92].map((x, index) => <mesh key={x} position={[x, -0.02 + index * 0.14, -0.72 - index * 0.06]} rotation={[0.1, index * 0.34, x < 0 ? -0.12 : 0.12]}><tetrahedronGeometry args={[0.09 + index * 0.008, 1]} /><meshStandardMaterial color={index % 2 ? ICE : chamberColor} emissive={chamberColor} emissiveIntensity={0.32 * opacity} transparent opacity={0.52 * opacity} /></mesh>)}</group>
    <AtmosphericCurrent points={[[-1.48, -0.15, -0.52], [-0.72, 0.46, -1.0], [0, 0.12, -1.18], [0.72, 0.46, -1.0], [1.48, -0.15, -0.52]]} color={chamberColor} opacity={0.12 * opacity} width={0.009} />
    <pointLight color={chamberColor} intensity={phase === "arrival" ? 2.8 : 1.0} distance={6} decay={2} position={[0, 0.25, 0.6]} /><pointLight color={ICE} intensity={phase === "arrival" ? 0.9 : 0.3} distance={4} decay={2} position={[0, 1.25, -0.8]} />
  </group>;
}

export function LifeMapProductionWorld({ nodes, selected, phase, profile, onSelect, cameraRig, webglRecovery }: { nodes: LifeMapNode[]; selected: LifeMapNode | null; phase: LifeMapJourneyPhase; profile: SpatialQualityProfile; onSelect: (node: LifeMapNode) => void; cameraRig: ReactNode; webglRecovery: ReactNode }) {
  const { size } = useThree();
  const qualityTier = profile.tier;
  const starCount = profile.tier === "low" ? 420 : profile.tier === "medium" ? 760 : 1200;
  const portrait = size.height > size.width;
  const stageScale: [number, number, number] = selected ? [1, 1, 1] : portrait ? [0.48, 0.84, 0.74] : [1.12, 1.08, 1.04];
  const stagePosition: [number, number, number] = selected ? [0, 0, 0] : portrait ? [0, -0.16, 1.45] : [0, -0.04, 1.75];
  return <>
    <color attach="background" args={[DEEP]} /><fog attach="fog" args={[DEEP, 15, 70]} />
    <ambientLight intensity={0.42} color="#b7eaff" /><directionalLight position={[7, 10, 8]} intensity={1.35} color="#d8f4ff" castShadow={profile.shadows} /><hemisphereLight args={["#c8f3ff", "#02040a", 0.52]} />
    {webglRecovery}{cameraRig}<AuthoredEnvironment selected={selected} /><TemporalHorizon selected={selected} />
    <group name="life-map-world-stage" scale={stageScale} position={stagePosition}>
      <LifeCore reducedMotion={profile.reducedMotion} tier={profile.tier} hidden={Boolean(selected)} /><LightBridges selected={selected} /><ChapterConstellations selected={selected} /><ForegroundObservatory selected={selected} /><RelationshipObservatory selected={selected} /><GoalHorizon selected={selected} /><AchievementMonument selected={selected} /><PrivacyVault selected={selected} /><EmotionalWeather reducedMotion={profile.reducedMotion} selected={selected} />
      <LivingPaths nodes={nodes} selected={selected} reducedMotion={profile.reducedMotion} phase={phase} />
      <group name="life-map-memory-artifact-families" data-depth-band="middle">{nodes.map((node, index) => <MemoryArtifact key={node.id} node={node} index={index} selected={selected} phase={phase} reducedMotion={profile.reducedMotion} onSelect={onSelect} />)}</group>
      <SelectedRelationshipContext nodes={nodes} selected={selected} reducedMotion={profile.reducedMotion} phase={phase} /><ArrivalSanctuary selected={selected} phase={phase} reducedMotion={profile.reducedMotion} />
    </group>
    <ArchiveParticles qualityTier={qualityTier} reducedMotion={profile.reducedMotion} /><group name="life-map-far-future-horizon" data-depth-band="far"><Stars radius={78} depth={58} count={starCount} factor={1.38} saturation={0.18} fade speed={profile.reducedMotion ? 0 : 0.018} /></group>
    <CinematicPostProcessing active={profile.postprocessing} reducedMotion={profile.reducedMotion} />
  </>;
}
