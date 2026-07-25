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
const GOLD = "#ffe2a0";
const CYAN = "#8cecff";
const DEEP = "#02050b";

function curveThrough(points: [number, number, number][]) {
  return new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)), false, "catmullrom", 0.28);
}

function AtmosphericCurrent({ points, color, opacity, width = 0.018 }: { points: [number, number, number][]; color: string; opacity: number; width?: number }) {
  const curve = useMemo(() => curveThrough(points), [points]);
  return <mesh>
    <tubeGeometry args={[curve, 72, width, 6, false]} />
    <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} roughness={0.28} metalness={0.45} transparent opacity={opacity} depthWrite={false} />
  </mesh>;
}

function AuthoredEnvironment({ selected }: { selected: LifeMapNode | null }) {
  return <group name="life-map-authored-environment" data-depth-band="far">
    <mesh><sphereGeometry args={[72, 32, 20]} /><meshBasicMaterial color={selected ? "#030812" : "#071421"} side={THREE.BackSide} /></mesh>
    <mesh position={[-13, 6, -34]} rotation={[0.08, 0.12, -0.24]} scale={[17, 10, 1]}><planeGeometry args={[1, 1]} /><meshBasicMaterial color="#163d5c" transparent opacity={selected ? 0.045 : 0.16} depthWrite={false} blending={THREE.AdditiveBlending} /></mesh>
    <mesh position={[14, -1, -30]} rotation={[-0.04, -0.18, 0.25]} scale={[15, 9, 1]}><planeGeometry args={[1, 1]} /><meshBasicMaterial color="#452b58" transparent opacity={selected ? 0.035 : 0.11} depthWrite={false} blending={THREE.AdditiveBlending} /></mesh>
    <mesh position={[0, 3.5, -42]} rotation={[0, 0, 0.02]} scale={[28, 5, 1]}><planeGeometry args={[1, 1]} /><meshBasicMaterial color="#163146" transparent opacity={selected ? 0.03 : 0.09} depthWrite={false} /></mesh>
    <mesh position={[0, -8.2, -22]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[24, 96]} /><meshBasicMaterial color="#071725" transparent opacity={0.82} depthWrite={false} /></mesh>
  </group>;
}

function TemporalHorizon({ selected }: { selected: LifeMapNode | null }) {
  if (selected) return null;
  return <group name="life-map-temporal-horizon" data-depth-band="far">
    <AtmosphericCurrent points={[[-15, 4.2, -20], [-8, 5.4, -23], [0, 4.7, -25], [8, 5.8, -23], [15, 4.4, -20]]} color="#5b87a0" opacity={0.12} width={0.024} />
    <AtmosphericCurrent points={[[-15, -1.8, -15], [-7, -0.9, -18], [0, -1.4, -20], [7, -0.5, -18], [15, -1.2, -15]]} color="#775e8a" opacity={0.08} width={0.018} />
    {[-11, -6, 0, 6, 11].map((x, index) => <group key={x} position={[x, -3.7 + Math.abs(index - 2) * 0.16, -16 - Math.abs(index - 2) * 0.9]}>
      <mesh><cylinderGeometry args={[0.035, 0.08, 1.2 + index * 0.08, 6]} /><meshStandardMaterial color="#0b1f2e" emissive={index === 2 ? GOLD : CYAN} emissiveIntensity={index === 2 ? 0.42 : 0.14} roughness={0.34} metalness={0.62} /></mesh>
      <mesh position={[0, 0.76 + index * 0.04, 0]}><octahedronGeometry args={[0.09, 1]} /><meshBasicMaterial color={index === 2 ? GOLD : CYAN} transparent opacity={0.52} /></mesh>
    </group>)}
  </group>;
}

function LifeCore({ reducedMotion, tier, hidden }: { reducedMotion: boolean; tier: SpatialQualityProfile["tier"]; hidden: boolean }) {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!group.current || reducedMotion) return;
    group.current.rotation.y = clock.elapsedTime * 0.038;
    group.current.rotation.x = Math.sin(clock.elapsedTime * 0.1) * 0.03;
  });
  return <group ref={group} name="life-map-white-gold-life-core" position={LIFE_MAP_CORE_POSITION} visible={!hidden} data-life-core="white-gold-layered">
    <mesh castShadow rotation={[0.2, 0.45, 0.08]}><icosahedronGeometry args={[0.82, tier === "high" ? 2 : 1]} /><meshPhysicalMaterial color="#fff7df" emissive={GOLD} emissiveIntensity={1.05} roughness={0.18} metalness={0.36} transmission={0.1} clearcoat={0.82} /></mesh>
    <mesh scale={[0.8, 1.34, 0.8]} rotation={[-0.35, 0.18, 0.24]}><octahedronGeometry args={[0.82, 1]} /><meshStandardMaterial color="#f7df9a" emissive="#ffc85c" emissiveIntensity={1.34} wireframe transparent opacity={0.76} /></mesh>
    {[0, 1, 2].map((index) => <mesh key={index} position={[Math.cos(index * 2.1) * 1.2, Math.sin(index * 1.6) * 0.42, Math.sin(index * 2.1) * 0.82]} rotation={[0.2, index * 0.7, 0.1]}><tetrahedronGeometry args={[0.12, 1]} /><meshBasicMaterial color={index === 1 ? CYAN : GOLD} transparent opacity={0.72} /></mesh>)}
    <pointLight color={GOLD} intensity={tier === "low" ? 8 : 13} distance={24} decay={2} />
  </group>;
}

function LightBridges({ selected }: { selected: LifeMapNode | null }) {
  const origin = useMemo(() => new THREE.Vector3(...LIFE_MAP_CORE_POSITION), []);
  if (selected) return null;
  return <group name="life-map-light-bridges" data-depth-band="middle">{LIFE_MAP_CHAPTERS.map((chapter, index) => {
    const destination = new THREE.Vector3(...chapter.position);
    const control = origin.clone().lerp(destination, 0.52);
    control.y += 1.45 + index * 0.24;
    control.z -= 0.6;
    return <Line key={chapter.id} points={new THREE.QuadraticBezierCurve3(origin, control, destination).getPoints(42)} color={chapter.aura} lineWidth={0.9} transparent opacity={0.24} />;
  })}</group>;
}

function ChapterConstellations({ selected }: { selected: LifeMapNode | null }) {
  return <group name="life-map-authored-chapter-regions" data-scale="cosmic-overview" data-depth-band="middle" visible={!selected}>{LIFE_MAP_CHAPTERS.map((chapter, index) => <group key={chapter.id} name={`life-map-chapter-${chapter.id}`} position={chapter.position} rotation={chapter.rotation} data-chapter-region={chapter.id}>
    <mesh position={[0, 0, -0.48]} rotation={[0.08, index * 0.12, index % 2 ? -0.08 : 0.08]} scale={[2.2 + index * 0.2, 1.12 + index * 0.1, 1]}><planeGeometry args={[1, 1]} /><meshBasicMaterial color={chapter.aura} transparent opacity={0.055} depthWrite={false} side={THREE.DoubleSide} /></mesh>
    <mesh position={[0, -0.72, 0]} rotation={[-Math.PI / 2, 0, 0]}><cylinderGeometry args={[1.3, 1.8, 0.08, 8, 1, true]} /><meshStandardMaterial color="#0a1a27" emissive={chapter.aura} emissiveIntensity={0.12} metalness={0.54} roughness={0.38} transparent opacity={0.58} side={THREE.DoubleSide} /></mesh>
    {[0, 1, 2, 3, 4].map((point) => { const angle = point / 5 * Math.PI * 2 + index * 0.38; return <mesh key={point} position={[Math.cos(angle) * 1.28, Math.sin(angle * 1.6) * 0.42, Math.sin(angle) * 0.78]} name={`life-map-chapter-anchor-${chapter.id}-${point}`}><octahedronGeometry args={[0.09 + point * 0.008, 1]} /><meshStandardMaterial color={chapter.aura} emissive={chapter.aura} emissiveIntensity={0.78} roughness={0.2} metalness={0.68} transparent opacity={0.88} /></mesh>; })}
    <Html position={[0, 1.25, 0]} center distanceFactor={18}><span className="life-map-chapter-label">{chapter.title}</span></Html>
  </group>)}</group>;
}

function ForegroundObservatory({ selected }: { selected: LifeMapNode | null }) {
  if (selected) return null;
  return <group name="life-map-foreground-observatory" data-depth-band="near" position={[0, -3.0, 4.1]}>
    <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[1.7, 1, 1]}><cylinderGeometry args={[4.1, 5.2, 0.18, 8, 1, false, 0.38, Math.PI * 1.24]} /><meshStandardMaterial color="#0a1c29" emissive="#347189" emissiveIntensity={0.13} metalness={0.68} roughness={0.28} transparent opacity={0.84} /></mesh>
    <mesh position={[0, 0.12, -1.55]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.42, 0.7, 1]}><cylinderGeometry args={[2.7, 3.4, 0.08, 8]} /><meshStandardMaterial color="#07131e" emissive="#234a5d" emissiveIntensity={0.1} metalness={0.5} roughness={0.4} /></mesh>
    {[-4.2, -2.1, 2.1, 4.2].map((x, index) => <mesh key={x} position={[x, 0.62 + index % 2 * 0.18, -1.6 - Math.abs(x) * 0.1]} rotation={[0, 0, x < 0 ? -0.12 : 0.12]}><boxGeometry args={[0.13, 1.2, 0.16]} /><meshStandardMaterial color="#0a1b27" emissive={index % 2 ? CYAN : GOLD} emissiveIntensity={0.18} metalness={0.7} roughness={0.28} /></mesh>)}
  </group>;
}

function RelationshipObservatory({ selected }: { selected: LifeMapNode | null }) {
  return <group name="life-map-relationship-observatory" data-depth-band="middle" position={[5.9, 0.7, -7.2]} visible={!selected}>{[0, 1, 2, 3].map((index) => { const angle = index / 4 * Math.PI * 2; return <mesh key={index} position={[Math.cos(angle) * 1.45, Math.sin(angle * 1.7) * 0.44, Math.sin(angle) * 0.84]}><octahedronGeometry args={[0.16 + index * 0.018, 1]} /><meshStandardMaterial color="#d9f6ff" emissive="#83dfff" emissiveIntensity={0.58} roughness={0.18} metalness={0.55} /></mesh>; })}<AtmosphericCurrent points={[[-1.5, 0, 0], [-0.5, 0.62, -0.4], [0.6, -0.2, -0.8], [1.55, 0.22, 0]]} color="#a9e9ff" opacity={0.24} width={0.01} /></group>;
}

function GoalHorizon({ selected }: { selected: LifeMapNode | null }) {
  return <group name="life-map-goal-horizon" data-depth-band="far" position={[-7.5, 3.0, -16.5]} visible={!selected}><mesh rotation={[0, 0, -0.18]}><coneGeometry args={[0.72, 2.7, 5]} /><meshStandardMaterial color="#152634" emissive="#f0ce7b" emissiveIntensity={0.52} roughness={0.34} metalness={0.66} /></mesh><mesh position={[0, 1.78, 0]}><octahedronGeometry args={[0.25, 1]} /><meshStandardMaterial color="#fff0b0" emissive="#f4d681" emissiveIntensity={1.08} /></mesh></group>;
}

function AchievementMonument({ selected }: { selected: LifeMapNode | null }) {
  return <group name="life-map-achievement-monument" data-depth-band="far" position={[8.0, -0.2, -13.8]} visible={!selected}><mesh><cylinderGeometry args={[0.8, 1.2, 0.2, 8]} /><meshStandardMaterial color="#111c28" emissive="#c8a85c" emissiveIntensity={0.28} metalness={0.72} roughness={0.28} /></mesh><mesh position={[0, 0.82, 0]} rotation={[0.15, 0.25, 0.08]}><dodecahedronGeometry args={[0.5, 1]} /><meshPhysicalMaterial color="#f4d98e" emissive="#f2c65c" emissiveIntensity={0.9} roughness={0.18} metalness={0.52} /></mesh></group>;
}

function PrivacyVault({ selected }: { selected: LifeMapNode | null }) {
  return <group name="life-map-privacy-vault" data-depth-band="far" position={[-8.4, -0.9, -11.4]} visible={!selected}><mesh><dodecahedronGeometry args={[1.08, 0]} /><meshStandardMaterial color="#03050a" emissive="#3b294c" emissiveIntensity={0.18} metalness={0.9} roughness={0.18} /></mesh><mesh scale={1.14}><dodecahedronGeometry args={[1.08, 0]} /><meshBasicMaterial color="#7b6a94" wireframe transparent opacity={0.2} /></mesh></group>;
}

function EmotionalWeather({ reducedMotion, selected }: { reducedMotion: boolean; selected: LifeMapNode | null }) {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => { if (!group.current || reducedMotion) return; group.current.rotation.y = Math.sin(clock.elapsedTime * 0.03) * 0.08; group.current.position.y = 3.5 + Math.sin(clock.elapsedTime * 0.08) * 0.1; });
  return <group ref={group} name="life-map-emotional-weather" data-depth-band="far" position={[0, 3.5, -18]} visible={!selected}><AtmosphericCurrent points={[[-9, 0.2, 0], [-4, 1.2, -1], [0, 0.4, -2], [4, 1.1, -1], [9, 0, 0]]} color="#5b8eb5" opacity={0.1} width={0.026} /><AtmosphericCurrent points={[[-7, -0.5, -1], [-3, 0.3, -2], [1, -0.2, -2.8], [6, 0.4, -1]]} color="#8e6fb0" opacity={0.07} width={0.02} /></group>;
}

function ArchiveParticles({ qualityTier, reducedMotion }: { qualityTier: SpatialQualityProfile["tier"]; reducedMotion: boolean }) {
  const particleCount = qualityTier === "low" ? 80 : qualityTier === "medium" ? 160 : 260;
  return <group name="life-map-archive-particles" data-depth-band="far"><Stars radius={52} depth={36} count={particleCount} factor={1.1} saturation={0.24} fade speed={reducedMotion ? 0 : 0.015} /></group>;
}

function VisualArtifact({ node, active }: ArtifactProps) { return <group name="life-map-artifact-visual"><mesh><boxGeometry args={[0.82, 0.58, 0.1]} /><meshPhysicalMaterial color="#122838" emissive={node.aura} emissiveIntensity={active ? 0.82 : 0.32} roughness={0.24} metalness={0.55} /></mesh><mesh position={[0, 0, 0.08]}><boxGeometry args={[0.54, 0.32, 0.04]} /><meshStandardMaterial color={node.aura} emissive={node.aura} emissiveIntensity={active ? 1.1 : 0.46} /></mesh></group>; }
function AudioArtifact({ node, active }: ArtifactProps) { return <group name="life-map-artifact-audio">{[-0.34, -0.17, 0, 0.17, 0.34].map((x, index) => <mesh key={x} position={[x, 0, 0]} scale={[1, 0.58 + Math.abs(2 - index) * 0.23, 1]}><boxGeometry args={[0.07, 0.55, 0.08]} /><meshStandardMaterial color={node.aura} emissive={node.aura} emissiveIntensity={active ? 0.95 : 0.4} /></mesh>)}</group>; }
function RelationshipArtifact({ node, active }: ArtifactProps) { const points: [number, number, number][] = [[-0.36, -0.08, 0], [0.36, 0.04, -0.08], [0, 0.42, -0.16], [-0.36, -0.08, 0]]; return <group name="life-map-artifact-relationship">{points.slice(0, 3).map((position, index) => <mesh key={index} position={position}><octahedronGeometry args={[0.2, 1]} /><meshPhysicalMaterial color="#dff8ff" emissive={node.aura} emissiveIntensity={active ? 1.02 : 0.44} /></mesh>)}<Line points={points} color={node.aura} transparent opacity={active ? 0.88 : 0.5} lineWidth={1.2} /></group>; }
function PlaceArtifact({ node, active }: ArtifactProps) { return <group name="life-map-artifact-place"><mesh position={[0, -0.2, 0]}><cylinderGeometry args={[0.48, 0.62, 0.18, 6]} /><meshStandardMaterial color="#183243" emissive={node.aura} emissiveIntensity={active ? 0.7 : 0.28} /></mesh><mesh position={[0, 0.18, 0]} rotation={[0, Math.PI / 4, 0]}><coneGeometry args={[0.45, 0.62, 4]} /><meshStandardMaterial color={node.aura} emissive={node.aura} emissiveIntensity={active ? 0.92 : 0.4} /></mesh></group>; }
function EmotionArtifact({ node, active }: ArtifactProps) { const petals: [number, number, number, number][] = [[-0.32, 0.1, 0, -0.42], [0.32, 0.08, -0.08, 0.42], [0, 0.38, -0.18, 0.08], [0, -0.2, 0.04, 0.18]]; return <group name="life-map-artifact-emotion"><mesh scale={[0.38, 0.72, 0.34]} rotation={[0.18, 0.42, 0.08]}><icosahedronGeometry args={[0.5, 2]} /><meshPhysicalMaterial color="#f2fbff" emissive={node.aura} emissiveIntensity={active ? 1.12 : 0.46} transmission={0.2} clearcoat={0.88} /></mesh>{petals.map(([x, y, z, rotation], index) => <mesh key={index} position={[x, y, z]} scale={[0.42, 0.78, 0.24]} rotation={[0.1, rotation, index * 0.32]}><dodecahedronGeometry args={[0.32, 1]} /><meshPhysicalMaterial color={index % 2 ? node.aura : "#dff8ff"} emissive={node.aura} emissiveIntensity={active ? 0.78 : 0.3} transmission={0.12} transparent opacity={active ? 0.76 : 0.48} /></mesh>)}<Line points={[[0, -0.55, 0], [0.06, 0, -0.12], [0, 0.7, -0.24]]} color="#f5fdff" lineWidth={1.2} transparent opacity={active ? 0.78 : 0.34} /></group>; }
function PatternArtifact({ node, active }: ArtifactProps) { return <group name="life-map-artifact-pattern">{[-0.42, 0, 0.42].map((x, index) => <mesh key={x} position={[x, index === 1 ? 0.22 : -0.08, -index * 0.09]} rotation={[0.12, index * 0.5, index * 0.2]}><boxGeometry args={[0.24, 0.56 + index * 0.12, 0.16]} /><meshStandardMaterial color={node.aura} emissive={node.aura} emissiveIntensity={active ? 0.88 : 0.34} transparent opacity={0.72} /></mesh>)}</group>; }
function AchievementArtifact({ node, active }: ArtifactProps) { return <group name="life-map-artifact-achievement"><mesh position={[0, -0.18, 0]}><cylinderGeometry args={[0.42, 0.56, 0.17, 8]} /><meshStandardMaterial color="#2a2415" emissive={node.aura} emissiveIntensity={0.3} metalness={0.76} /></mesh><mesh position={[0, 0.22, 0]}><dodecahedronGeometry args={[0.36, 1]} /><meshPhysicalMaterial color="#ffe8a6" emissive={node.aura} emissiveIntensity={active ? 1.14 : 0.5} /></mesh></group>; }
function GoalArtifact({ node, active }: ArtifactProps) { return <group name="life-map-artifact-goal"><mesh position={[0, -0.1, 0]}><cylinderGeometry args={[0.08, 0.12, 0.7, 10]} /><meshStandardMaterial color={node.aura} emissive={node.aura} emissiveIntensity={active ? 1.02 : 0.42} /></mesh><mesh position={[0, 0.43, 0]}><coneGeometry args={[0.24, 0.42, 5]} /><meshStandardMaterial color="#fff0bd" emissive={node.aura} emissiveIntensity={active ? 1.12 : 0.48} /></mesh></group>; }
function FutureArtifact({ node, active }: ArtifactProps) { return <group name="life-map-artifact-future"><mesh rotation={[0.3, 0.5, 0.1]}><tetrahedronGeometry args={[0.48, 1]} /><meshPhysicalMaterial color="#f6edce" emissive={node.aura} emissiveIntensity={active ? 1.02 : 0.4} transmission={0.18} /></mesh><mesh scale={1.22}><tetrahedronGeometry args={[0.48, 0]} /><meshBasicMaterial color={node.aura} wireframe transparent opacity={active ? 0.32 : 0.12} /></mesh></group>; }
function EverydayArtifact({ node, active }: ArtifactProps) { return <group name="life-map-artifact-everyday"><mesh><dodecahedronGeometry args={[0.36, 0]} /><meshStandardMaterial color="#b9dbe8" emissive={node.aura} emissiveIntensity={active ? 0.82 : 0.32} /></mesh><mesh scale={1.18}><dodecahedronGeometry args={[0.36, 0]} /><meshBasicMaterial color={node.aura} wireframe transparent opacity={active ? 0.22 : 0.09} /></mesh></group>; }
function ArchiveArtifact({ node, active }: ArtifactProps) { return <group name="life-map-artifact-archive">{[-0.18, 0, 0.18].map((y, index) => <mesh key={y} position={[0, y, index * -0.05]}><boxGeometry args={[0.64 - index * 0.08, 0.11, 0.42]} /><meshStandardMaterial color="#17202b" emissive={node.aura} emissiveIntensity={active ? 0.58 : 0.22} /></mesh>)}</group>; }
function ProtectedArtifact({ node, active }: ArtifactProps) { return <group name="life-map-artifact-protected"><mesh><dodecahedronGeometry args={[0.44, 1]} /><meshPhysicalMaterial color="#03050a" emissive="#39284b" emissiveIntensity={active ? 0.38 : 0.16} metalness={0.9} /></mesh><mesh scale={1.18}><dodecahedronGeometry args={[0.44, 0]} /><meshBasicMaterial color={node.aura} wireframe transparent opacity={active ? 0.3 : 0.14} /></mesh></group>; }

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
    const desired = active ? (phase === "arrival" ? 1.02 : 0.92) : related ? 0.34 : 0.54 + importance * 0.22;
    const scale = THREE.MathUtils.damp(group.current.scale.x, desired, active ? 4.8 : 3.2, delta);
    group.current.scale.setScalar(scale);
    group.current.visible = visible;
    group.current.rotation.y = Math.sin(clock.elapsedTime * 0.12 + index) * 0.05;
    group.current.position.y = node.position[1] + Math.sin(clock.elapsedTime * 0.22 + index) * (active ? 0.012 : 0.04);
  });
  return <group ref={group} position={node.position} visible={visible} name={`life-map-artifact-${resolveArtifactFamily(node)}-${node.id}`} data-artifact-family={resolveArtifactFamily(node)} data-importance={importance.toFixed(2)} data-chapter={chapter.id} data-semantic-label={semanticLabel}>
    <group onClick={(event) => { event.stopPropagation(); onSelect(node); }} onPointerOver={() => { document.body.style.cursor = "pointer"; }} onPointerOut={() => { document.body.style.cursor = ""; }}>
      <ArtifactShape node={node} active={active} />
      {active ? <group name="life-map-selected-artifact-halo" position={[0, 0, -0.46]}>{[-0.62, 0, 0.62].map((x, marker) => <mesh key={x} position={[x, -0.5 + marker * 0.08, -0.16]} rotation={[0.12, marker * 0.38, 0.2]}><tetrahedronGeometry args={[0.08, 1]} /><meshBasicMaterial color={marker === 1 ? "#f5fdff" : node.aura} transparent opacity={0.66} /></mesh>)}</group> : null}
    </group>
    <pointLight color={node.aura} intensity={active ? 4.2 : related ? 0.85 : 0.34 + importance * 0.55} distance={active ? 8 : 3.2} decay={2} />
  </group>;
}

function PathPulse({ curve, color, reducedMotion, offset }: { curve: THREE.QuadraticBezierCurve3; color: string; reducedMotion: boolean; offset: number }) {
  const pulse = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => { if (!pulse.current || reducedMotion) return; const t = (clock.elapsedTime * 0.06 + offset) % 1; pulse.current.position.copy(curve.getPoint(t)); });
  return <mesh ref={pulse} position={curve.getPoint(offset % 1)} name="life-map-living-pulse"><octahedronGeometry args={[0.05, 1]} /><meshBasicMaterial color={color} transparent opacity={0.74} /></mesh>;
}

function SemanticPath({ source, target, active, reducedMotion, index }: { source: LifeMapNode; target: LifeMapNode; active: boolean; reducedMotion: boolean; index: number }) {
  const start = useMemo(() => new THREE.Vector3(...source.position), [source.position]);
  const end = useMemo(() => new THREE.Vector3(...target.position), [target.position]);
  const curve = useMemo(() => { const middle = start.clone().lerp(end, 0.5); middle.y += Math.max(0.8, start.distanceTo(end) * 0.14); middle.z -= Math.min(1.4, start.distanceTo(end) * 0.06); return new THREE.QuadraticBezierCurve3(start, middle, end); }, [end, start]);
  const kind: LifeMapPathKind = resolvePathKind(source, target);
  const color = LIFE_MAP_PATH_PALETTE[kind];
  const opacity = active ? 0.58 : kind === "protected" ? 0.045 : 0.12;
  return <group data-path-kind={kind}><Line points={curve.getPoints(40)} color={color} lineWidth={active ? 1.45 : 0.6} transparent opacity={opacity} dashed={kind === "inferred" || kind === "corrected" || kind === "protected"} dashScale={1.5 + index * 0.03} />{active ? <PathPulse curve={curve} color={color} reducedMotion={reducedMotion} offset={(index * 0.19) % 1} /> : null}</group>;
}

function LivingPaths({ nodes, selected, reducedMotion, phase }: { nodes: LifeMapNode[]; selected: LifeMapNode | null; reducedMotion: boolean; phase: LifeMapJourneyPhase }) {
  const byId = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  if (selected && phase === "arrival") return null;
  return <group name="life-map-curved-semantic-paths" data-path-system="curved-semantic" data-depth-band="middle">{nodes.flatMap((source, sourceIndex) => source.connectedTo.slice(0, 3).map((targetId, targetIndex) => { const target = byId.get(targetId); if (!target || target.id < source.id) return null; const active = selected?.id === source.id || selected?.id === target.id; if (selected && !active) return null; return <SemanticPath key={`${source.id}-${target.id}`} source={source} target={target} active={active} reducedMotion={reducedMotion} index={sourceIndex * 3 + targetIndex} />; }))}</group>;
}

function SelectedRelationshipContext({ nodes, selected, reducedMotion, phase }: { nodes: LifeMapNode[]; selected: LifeMapNode | null; reducedMotion: boolean; phase: LifeMapJourneyPhase }) {
  if (!selected || phase !== "arrival") return null;
  const related = selected.connectedTo.map((id) => nodes.find((node) => node.id === id)).filter((node): node is LifeMapNode => Boolean(node)).slice(0, 3);
  return <group position={selected.position} name="life-map-selected-relationship-context" data-depth-band="middle">{related.map((node, index) => { const side = index % 2 === 0 ? -1 : 1; const end = new THREE.Vector3(side * (2.4 + index * 0.24), 0.24 + index * 0.34, -1.6 - index * 0.42); const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0.05, -0.3), new THREE.Vector3(end.x * 0.42, 0.9 + index * 0.2, end.z * 0.5), end); const color = LIFE_MAP_PATH_PALETTE[resolvePathKind(selected, node)]; return <group key={node.id}><Line points={curve.getPoints(30)} color={color} lineWidth={0.9} transparent opacity={0.34} /><mesh position={end} name={`life-map-related-witness-${node.id}`} rotation={[0.1, index * 0.48, 0.2]}><dodecahedronGeometry args={[0.15, 1]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.62} transparent opacity={0.9} /></mesh>{!reducedMotion ? <PathPulse curve={curve} color={color} reducedMotion={false} offset={index * 0.27} /> : null}</group>; })}</group>;
}

function ArrivalSanctuary({ selected, phase, reducedMotion }: { selected: LifeMapNode | null; phase: LifeMapJourneyPhase; reducedMotion: boolean }) {
  const chamber = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!chamber.current || reducedMotion || !selected || phase !== "arrival") return;
    chamber.current.position.y = selected.position[1] + Math.sin(clock.elapsedTime * 0.18) * 0.018;
  });
  if (!selected || (phase !== "approach" && phase !== "arrival")) return null;
  const family = resolveArtifactFamily(selected);
  const opacity = phase === "arrival" ? 1 : 0.48;
  const warm = family === "achievement" || family === "goal" || family === "future";
  const chamberColor = warm ? GOLD : selected.aura;
  return <group ref={chamber} position={selected.position} name="life-map-intimate-memory-chamber" data-scale="intimate" data-depth-band="near" data-chamber-family={family}>
    <group name="life-map-chamber-threshold" position={[0, 0, 0.9]}>
      <mesh position={[-1.72, 0.34, -0.4]} rotation={[0, 0.08, -0.08]}><boxGeometry args={[0.18, 2.7, 0.22]} /><meshStandardMaterial color="#0a1c29" emissive={chamberColor} emissiveIntensity={0.24 * opacity} metalness={0.72} roughness={0.24} /></mesh>
      <mesh position={[1.72, 0.34, -0.4]} rotation={[0, -0.08, 0.08]}><boxGeometry args={[0.18, 2.7, 0.22]} /><meshStandardMaterial color="#0a1c29" emissive={chamberColor} emissiveIntensity={0.24 * opacity} metalness={0.72} roughness={0.24} /></mesh>
      <mesh position={[0, 1.66, -0.42]}><boxGeometry args={[3.2, 0.16, 0.24]} /><meshStandardMaterial color="#0a1c29" emissive={chamberColor} emissiveIntensity={0.18 * opacity} metalness={0.7} roughness={0.28} /></mesh>
    </group>
    <group name="life-map-chamber-floor" position={[0, -0.86, 0.2]}>{[-1.7, -0.85, 0, 0.85, 1.7].map((z, index) => <mesh key={z} position={[0, -index * 0.012, z]} rotation={[-Math.PI / 2, index * 0.18, 0]} scale={[1.7 - index * 0.12, 1, 1]}><cylinderGeometry args={[0.66, 0.78, 0.06, 6]} /><meshStandardMaterial color={index === 2 ? "#102c3d" : "#081722"} emissive={chamberColor} emissiveIntensity={(0.12 + index * 0.025) * opacity} metalness={0.58} roughness={0.34} transparent opacity={0.9} /></mesh>)}</group>
    <group name="life-map-chamber-memory-veils" position={[0, 0, -1.78]}>
      <mesh position={[-1.06, 0.2, 0]} rotation={[0, 0.24, -0.08]} scale={[1.05, 2.8, 1]}><planeGeometry args={[1, 1]} /><meshBasicMaterial color={chamberColor} transparent opacity={0.075 * opacity} side={THREE.DoubleSide} depthWrite={false} /></mesh>
      <mesh position={[0, 0.42, -0.24]} scale={[1.38, 3.2, 1]}><planeGeometry args={[1, 1]} /><meshBasicMaterial color="#dff8ff" transparent opacity={0.045 * opacity} side={THREE.DoubleSide} depthWrite={false} /></mesh>
      <mesh position={[1.06, 0.16, 0]} rotation={[0, -0.24, 0.08]} scale={[1.05, 2.8, 1]}><planeGeometry args={[1, 1]} /><meshBasicMaterial color={chamberColor} transparent opacity={0.075 * opacity} side={THREE.DoubleSide} depthWrite={false} /></mesh>
    </group>
    <group name="life-map-chamber-temporal-residue">{[-1.28, -0.72, 0.72, 1.28].map((x, index) => <mesh key={x} position={[x, -0.1 + index * 0.2, -1.16 - index * 0.1]} rotation={[0.12, index * 0.4, x < 0 ? -0.18 : 0.18]}><tetrahedronGeometry args={[0.14 + index * 0.012, 1]} /><meshStandardMaterial color={index % 2 ? "#dff8ff" : chamberColor} emissive={chamberColor} emissiveIntensity={0.42 * opacity} transparent opacity={0.62 * opacity} /></mesh>)}</group>
    <AtmosphericCurrent points={[[-2.1, -0.25, -0.8], [-1.1, 0.72, -1.55], [0, 0.2, -1.92], [1.1, 0.72, -1.55], [2.1, -0.25, -0.8]]} color={chamberColor} opacity={0.18 * opacity} width={0.014} />
    <pointLight color={chamberColor} intensity={phase === "arrival" ? 4.4 : 1.8} distance={8} decay={2} position={[0, 0.4, 0.5]} />
    <pointLight color="#dff8ff" intensity={phase === "arrival" ? 1.8 : 0.6} distance={5} decay={2} position={[0, 1.8, -1.2]} />
  </group>;
}

export function LifeMapProductionWorld({ nodes, selected, phase, profile, onSelect, cameraRig, webglRecovery }: { nodes: LifeMapNode[]; selected: LifeMapNode | null; phase: LifeMapJourneyPhase; profile: SpatialQualityProfile; onSelect: (node: LifeMapNode) => void; cameraRig: ReactNode; webglRecovery: ReactNode }) {
  const { size } = useThree();
  const qualityTier = profile.tier;
  const starCount = profile.tier === "low" ? 420 : profile.tier === "medium" ? 760 : 1200;
  const portrait = size.height > size.width;
  const stageScale: [number, number, number] = selected ? (portrait ? [0.82, 0.9, 0.9] : [1.08, 1.08, 1.08]) : portrait ? [0.62, 0.9, 0.84] : [1.34, 1.24, 1.18];
  const stagePosition: [number, number, number] = selected ? (portrait ? [0, -0.05, 0.45] : [0, 0.08, 0.35]) : portrait ? [0, 0.08, 1.8] : [0, 0.02, 2.1];
  return <>
    <color attach="background" args={[DEEP]} /><fog attach="fog" args={[DEEP, 13, 68]} />
    <ambientLight intensity={0.48} color="#b7eaff" /><directionalLight position={[7, 10, 8]} intensity={1.72} color="#d8f4ff" castShadow={profile.shadows} /><hemisphereLight args={["#c8f3ff", "#02040a", 0.62]} />
    {webglRecovery}{cameraRig}<AuthoredEnvironment selected={selected} /><TemporalHorizon selected={selected} />
    <group name="life-map-world-stage" scale={stageScale} position={stagePosition}>
      <LifeCore reducedMotion={profile.reducedMotion} tier={profile.tier} hidden={Boolean(selected)} /><LightBridges selected={selected} /><ChapterConstellations selected={selected} /><ForegroundObservatory selected={selected} /><RelationshipObservatory selected={selected} /><GoalHorizon selected={selected} /><AchievementMonument selected={selected} /><PrivacyVault selected={selected} /><EmotionalWeather reducedMotion={profile.reducedMotion} selected={selected} />
      <LivingPaths nodes={nodes} selected={selected} reducedMotion={profile.reducedMotion} phase={phase} />
      <group name="life-map-memory-artifact-families" data-depth-band="middle">{nodes.map((node, index) => <MemoryArtifact key={node.id} node={node} index={index} selected={selected} phase={phase} reducedMotion={profile.reducedMotion} onSelect={onSelect} />)}</group>
      <SelectedRelationshipContext nodes={nodes} selected={selected} reducedMotion={profile.reducedMotion} phase={phase} /><ArrivalSanctuary selected={selected} phase={phase} reducedMotion={profile.reducedMotion} />
    </group>
    <ArchiveParticles qualityTier={qualityTier} reducedMotion={profile.reducedMotion} /><group name="life-map-far-future-horizon" data-depth-band="far"><Stars radius={78} depth={58} count={starCount} factor={1.45} saturation={0.2} fade speed={profile.reducedMotion ? 0 : 0.022} /></group>
    <CinematicPostProcessing active={profile.postprocessing} reducedMotion={profile.reducedMotion} />
  </>;
}
