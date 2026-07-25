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
const VIOLET = "#c79bff";
const DEEP = "#02050a";

function curveThrough(points: [number, number, number][]) {
  return new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)), false, "catmullrom", 0.28);
}

function AtmosphericCurrent({ points, color, opacity, width = 0.012 }: { points: [number, number, number][]; color: string; opacity: number; width?: number }) {
  const curve = useMemo(() => curveThrough(points), [points]);
  return <mesh>
    <tubeGeometry args={[curve, 64, width, 6, false]} />
    <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.74} roughness={0.3} metalness={0.28} transparent opacity={opacity} depthWrite={false} />
  </mesh>;
}

function SoftField({ position, scale, rotation = [0, 0, 0], color, opacity }: { position: [number, number, number]; scale: [number, number, number]; rotation?: [number, number, number]; color: string; opacity: number }) {
  return <mesh position={position} scale={scale} rotation={rotation}>
    <circleGeometry args={[1, 64]} />
    <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
  </mesh>;
}

function AuthoredEnvironment({ selected }: { selected: LifeMapNode | null }) {
  return <group name="life-map-authored-environment" data-depth-band="far">
    <mesh><sphereGeometry args={[74, 36, 24]} /><meshBasicMaterial color={selected ? "#02060b" : "#06101a"} side={THREE.BackSide} /></mesh>
    <SoftField position={[-10, 6, -34]} scale={[17, 8.5, 1]} rotation={[0.06, 0.08, -0.14]} color="#174867" opacity={selected ? 0.05 : 0.16} />
    <SoftField position={[11, 0, -31]} scale={[15, 7.5, 1]} rotation={[-0.03, -0.12, 0.18]} color="#513668" opacity={selected ? 0.045 : 0.11} />
    <SoftField position={[0, -2, -27]} scale={[11, 4.5, 1]} rotation={[0, 0, 0]} color="#7a5a2e" opacity={selected ? 0.025 : 0.055} />
    <mesh position={[0, -7.1, -20]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[24, 96]} /><meshBasicMaterial color="#07141e" transparent opacity={0.78} depthWrite={false} /></mesh>
    <AtmosphericCurrent points={[[-17, 6, -30], [-8, 7.2, -34], [0, 6.4, -36], [8, 7.4, -34], [17, 6, -30]]} color="#3b7692" opacity={selected ? 0.035 : 0.1} width={0.025} />
  </group>;
}

function TemporalHorizon({ selected }: { selected: LifeMapNode | null }) {
  if (selected) return null;
  return <group name="life-map-temporal-horizon" data-depth-band="far">
    <AtmosphericCurrent points={[[-14, 4.4, -22], [-7, 5.2, -24], [0, 4.7, -25], [7, 5.4, -24], [14, 4.3, -22]]} color="#5f9bb7" opacity={0.13} width={0.018} />
    <AtmosphericCurrent points={[[-13, -1.4, -17], [-6, -0.7, -19], [0, -1.1, -20], [6, -0.5, -19], [13, -1.3, -17]]} color="#806b96" opacity={0.085} width={0.014} />
    {[-10, -5, 0, 5, 10].map((x, index) => <group key={x} position={[x, -2.75 + Math.abs(index - 2) * 0.12, -16.5 - Math.abs(index - 2) * 0.5]}>
      <mesh><cylinderGeometry args={[0.04, 0.07, 0.82 + index * 0.1, 6]} /><meshStandardMaterial color="#102432" emissive={index === 2 ? GOLD : CYAN} emissiveIntensity={index === 2 ? 0.5 : 0.18} roughness={0.34} metalness={0.58} /></mesh>
      <mesh position={[0, 0.52 + index * 0.05, 0]} rotation={[0.2, index * 0.45, 0]}><octahedronGeometry args={[0.08, 1]} /><meshBasicMaterial color={index === 2 ? PALE_GOLD : CYAN} transparent opacity={0.68} /></mesh>
    </group>)}
  </group>;
}

function LifeCore({ reducedMotion, tier, hidden }: { reducedMotion: boolean; tier: SpatialQualityProfile["tier"]; hidden: boolean }) {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!group.current || reducedMotion) return;
    group.current.rotation.y = clock.elapsedTime * 0.032;
    group.current.rotation.x = Math.sin(clock.elapsedTime * 0.12) * 0.022;
  });
  return <group ref={group} name="life-map-white-gold-life-core" position={LIFE_MAP_CORE_POSITION} visible={!hidden} data-life-core="white-gold-layered">
    <mesh castShadow rotation={[0.2, 0.34, 0.05]}><dodecahedronGeometry args={[0.72, tier === "high" ? 2 : 1]} /><meshPhysicalMaterial color={PALE_GOLD} emissive={GOLD} emissiveIntensity={0.78} roughness={0.17} metalness={0.28} transmission={0.12} thickness={0.5} clearcoat={0.95} /></mesh>
    <mesh scale={[0.52, 0.72, 0.5]} rotation={[-0.16, 0.48, 0.12]}><icosahedronGeometry args={[0.72, 1]} /><meshStandardMaterial color="#fff8db" emissive="#ffc85c" emissiveIntensity={1.5} transparent opacity={0.78} /></mesh>
    <mesh scale={[1.12, 1.12, 1.12]} rotation={[0.1, -0.25, 0.16]}><dodecahedronGeometry args={[0.72, 0]} /><meshBasicMaterial color={PALE_GOLD} wireframe transparent opacity={0.24} /></mesh>
    {[0, 1, 2, 3, 4].map((index) => { const angle = index * Math.PI * 0.4; return <mesh key={index} position={[Math.cos(angle) * 1.12, Math.sin(index * 1.3) * 0.28, Math.sin(angle) * 0.62]} rotation={[0.18, angle, 0.12]}><tetrahedronGeometry args={[0.07, 1]} /><meshBasicMaterial color={index % 2 ? CYAN : PALE_GOLD} transparent opacity={0.68} /></mesh>; })}
    <pointLight color={GOLD} intensity={tier === "low" ? 6 : 9} distance={20} decay={2} />
  </group>;
}

function LightBridges({ selected }: { selected: LifeMapNode | null }) {
  const origin = useMemo(() => new THREE.Vector3(...LIFE_MAP_CORE_POSITION), []);
  if (selected) return null;
  return <group name="life-map-light-bridges" data-depth-band="middle">{LIFE_MAP_CHAPTERS.map((chapter, index) => {
    const destination = new THREE.Vector3(...chapter.position);
    const control = origin.clone().lerp(destination, 0.52);
    control.y += 0.82 + index * 0.12;
    control.z -= 0.55;
    return <Line key={chapter.id} points={new THREE.QuadraticBezierCurve3(origin, control, destination).getPoints(42)} color={chapter.aura} lineWidth={0.72} transparent opacity={0.22} />;
  })}</group>;
}

function ChapterIsland({ aura, index }: { aura: string; index: number }) {
  return <group>
    <mesh position={[0, -0.52, 0]} rotation={[0, index * 0.16, 0]} scale={[1.45, 0.16, 0.84]}>
      <cylinderGeometry args={[1, 1.08, 0.3, 9, 1, false]} />
      <meshStandardMaterial color="#0a1a25" emissive={aura} emissiveIntensity={0.13} metalness={0.5} roughness={0.42} transparent opacity={0.92} />
    </mesh>
    <mesh position={[0, -0.43, 0]} rotation={[-Math.PI / 2, 0, index * 0.16]} scale={[1.12, 0.64, 1]}>
      <circleGeometry args={[1, 48]} />
      <meshBasicMaterial color={aura} transparent opacity={0.065} depthWrite={false} blending={THREE.AdditiveBlending} />
    </mesh>
    <AtmosphericCurrent points={[[-1.2, -0.22, 0.05], [-0.55, 0.02, -0.28], [0.1, -0.08, -0.42], [0.72, 0.08, -0.2], [1.18, -0.12, 0.02]]} color={aura} opacity={0.12} width={0.009} />
  </group>;
}

function ChapterConstellations({ selected }: { selected: LifeMapNode | null }) {
  if (selected) return null;
  return <group name="life-map-authored-chapter-regions" position={[0, -0.28, 0]} data-scale="cosmic-overview" data-depth-band="middle">{LIFE_MAP_CHAPTERS.map((chapter, index) => {
    const anchorPositions: [number, number, number][] = [[-0.92, 0.1, 0.18], [-0.32, 0.56, -0.28], [0.38, 0.24, -0.55], [0.94, -0.02, 0.08]];
    return <group key={chapter.id} name={`life-map-chapter-${chapter.id}`} position={chapter.position} rotation={chapter.rotation} data-chapter-region={chapter.id}>
      <ChapterIsland aura={chapter.aura} index={index} />
      {anchorPositions.map((position, point) => <mesh key={point} position={position} name={`life-map-chapter-anchor-${chapter.id}-${point}`} rotation={[0.12, point * 0.42, point * 0.12]}><dodecahedronGeometry args={[0.105 + point * 0.012, 1]} /><meshStandardMaterial color={point === 1 ? ICE : chapter.aura} emissive={chapter.aura} emissiveIntensity={0.66} roughness={0.2} metalness={0.52} transparent opacity={0.95} /></mesh>)}
      <Line points={anchorPositions} color={chapter.aura} lineWidth={0.7} transparent opacity={0.32} />
      <mesh position={[-1.08, 0.18, -0.04]} rotation={[0, 0, -0.06]}><cylinderGeometry args={[0.035, 0.06, 0.94, 6]} /><meshStandardMaterial color="#102532" emissive={chapter.aura} emissiveIntensity={0.25} /></mesh>
      <Html position={[-0.92, 0.84, 0]} center distanceFactor={18}><span className="life-map-chapter-label">{chapter.title}</span></Html>
    </group>;
  })}</group>;
}

function ForegroundObservatory({ selected }: { selected: LifeMapNode | null }) {
  if (selected) return null;
  return <group name="life-map-foreground-observatory" data-depth-band="near" position={[0, -1.66, 2.35]}>
    <mesh rotation={[0, 0, 0]} scale={[1.12, 1, 0.54]}><cylinderGeometry args={[3.15, 3.35, 0.12, 48, 1, false, 0, Math.PI]} /><meshStandardMaterial color="#071722" emissive="#39758c" emissiveIntensity={0.14} metalness={0.58} roughness={0.36} transparent opacity={0.9} /></mesh>
    <mesh position={[0, 0.08, -0.16]} scale={[0.82, 1, 0.4]}><cylinderGeometry args={[2.75, 2.9, 0.06, 48, 1, false, 0, Math.PI]} /><meshStandardMaterial color="#0c2431" emissive="#69a4b8" emissiveIntensity={0.16} metalness={0.48} roughness={0.38} /></mesh>
    {[-2.75, -1.38, 0, 1.38, 2.75].map((x, index) => <mesh key={x} position={[x, 0.45 + (index % 2) * 0.08, -0.3]} rotation={[0, 0, x * 0.012]}><cylinderGeometry args={[0.035, 0.055, 0.74, 6]} /><meshStandardMaterial color="#0c202c" emissive={index % 2 ? CYAN : GOLD} emissiveIntensity={0.22} metalness={0.62} roughness={0.28} /></mesh>)}
    <AtmosphericCurrent points={[[-3.05, 0.75, -0.34], [-1.5, 0.92, -0.45], [0, 0.84, -0.5], [1.5, 0.92, -0.45], [3.05, 0.75, -0.34]]} color={CYAN} opacity={0.13} width={0.01} />
  </group>;
}

function RelationshipObservatory({ selected }: { selected: LifeMapNode | null }) {
  if (selected) return null;
  const positions: [number, number, number][] = [[-0.92, 0.06, 0.08], [-0.22, 0.48, -0.3], [0.5, 0.2, -0.5], [1.02, 0.36, 0.04]];
  return <group name="life-map-relationship-observatory" data-depth-band="middle" position={[5.7, 0.55, -7.15]}>{positions.map((position, index) => <mesh key={index} position={position}><octahedronGeometry args={[0.12 + index * 0.01, 1]} /><meshStandardMaterial color="#d9f6ff" emissive="#83dfff" emissiveIntensity={0.56} roughness={0.18} metalness={0.5} /></mesh>)}<Line points={positions} color="#a9e9ff" lineWidth={0.85} transparent opacity={0.36} /></group>;
}

function GoalHorizon({ selected }: { selected: LifeMapNode | null }) {
  if (selected) return null;
  return <group name="life-map-goal-horizon" data-depth-band="far" position={[-6.8, 2.35, -15]}><mesh rotation={[0, 0, -0.1]}><coneGeometry args={[0.42, 1.75, 6]} /><meshStandardMaterial color="#172b3a" emissive="#f0ce7b" emissiveIntensity={0.44} roughness={0.34} metalness={0.62} /></mesh><mesh position={[0, 1.12, 0]}><octahedronGeometry args={[0.15, 1]} /><meshStandardMaterial color="#fff0b0" emissive="#f4d681" emissiveIntensity={0.92} /></mesh></group>;
}

function AchievementMonument({ selected }: { selected: LifeMapNode | null }) {
  if (selected) return null;
  return <group name="life-map-achievement-monument" data-depth-band="far" position={[7.1, -0.15, -12.7]}><mesh scale={[1.1, 0.14, 0.86]}><cylinderGeometry args={[0.8, 0.9, 0.3, 8]} /><meshStandardMaterial color="#151f29" emissive="#c8a85c" emissiveIntensity={0.22} metalness={0.68} roughness={0.3} /></mesh><mesh position={[0, 0.64, 0]} rotation={[0.15, 0.25, 0.08]}><dodecahedronGeometry args={[0.34, 1]} /><meshPhysicalMaterial color="#f4d98e" emissive="#f2c65c" emissiveIntensity={0.72} roughness={0.18} metalness={0.48} /></mesh></group>;
}

function PrivacyVault({ selected }: { selected: LifeMapNode | null }) {
  if (selected) return null;
  return <group name="life-map-privacy-vault" data-depth-band="far" position={[-7.4, -0.55, -10.2]}><mesh><dodecahedronGeometry args={[0.66, 0]} /><meshStandardMaterial color="#04060a" emissive="#4b3560" emissiveIntensity={0.18} metalness={0.88} roughness={0.2} /></mesh><mesh scale={1.14}><dodecahedronGeometry args={[0.66, 0]} /><meshBasicMaterial color="#8e78aa" wireframe transparent opacity={0.19} /></mesh></group>;
}

function EmotionalWeather({ reducedMotion, selected }: { reducedMotion: boolean; selected: LifeMapNode | null }) {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!group.current || reducedMotion) return;
    group.current.rotation.y = Math.sin(clock.elapsedTime * 0.03) * 0.05;
    group.current.position.y = 3 + Math.sin(clock.elapsedTime * 0.08) * 0.08;
  });
  if (selected) return null;
  return <group ref={group} name="life-map-emotional-weather" data-depth-band="far" position={[0, 3, -17]}><AtmosphericCurrent points={[[-8, 0.2, 0], [-4, 0.9, -1], [0, 0.3, -1.8], [4, 0.8, -1], [8, 0, 0]]} color="#69a7d1" opacity={0.105} width={0.018} /><AtmosphericCurrent points={[[-6, -0.45, -1], [-2.5, 0.2, -1.7], [1, -0.15, -2.2], [5.5, 0.3, -1]]} color="#a07dc2" opacity={0.072} width={0.014} /></group>;
}

function ArchiveParticles({ qualityTier, reducedMotion }: { qualityTier: SpatialQualityProfile["tier"]; reducedMotion: boolean }) {
  const particleCount = qualityTier === "low" ? 80 : qualityTier === "medium" ? 150 : 240;
  return <group name="life-map-archive-particles" data-depth-band="far"><Stars radius={52} depth={36} count={particleCount} factor={1.12} saturation={0.28} fade speed={reducedMotion ? 0 : 0.012} /></group>;
}

function VisualArtifact({ node, active }: ArtifactProps) { return <group name="life-map-artifact-visual"><mesh rotation={[0.08, 0.12, 0.02]}><boxGeometry args={[0.72, 0.48, 0.1]} /><meshPhysicalMaterial color="#173247" emissive={node.aura} emissiveIntensity={active ? 0.72 : 0.3} roughness={0.22} metalness={0.48} /></mesh><mesh position={[0, 0, 0.08]}><boxGeometry args={[0.46, 0.26, 0.04]} /><meshStandardMaterial color={node.aura} emissive={node.aura} emissiveIntensity={active ? 0.95 : 0.42} /></mesh></group>; }
function AudioArtifact({ node, active }: ArtifactProps) { return <group name="life-map-artifact-audio">{[-0.3, -0.15, 0, 0.15, 0.3].map((x, index) => <mesh key={x} position={[x, 0, 0]} scale={[1, 0.55 + Math.abs(2 - index) * 0.18, 1]}><boxGeometry args={[0.055, 0.46, 0.07]} /><meshStandardMaterial color={node.aura} emissive={node.aura} emissiveIntensity={active ? 0.84 : 0.36} /></mesh>)}</group>; }
function RelationshipArtifact({ node, active }: ArtifactProps) { const points: [number, number, number][] = [[-0.32, -0.08, 0], [0.32, 0.04, -0.08], [0, 0.36, -0.16], [-0.32, -0.08, 0]]; return <group name="life-map-artifact-relationship">{points.slice(0, 3).map((position, index) => <mesh key={index} position={position}><octahedronGeometry args={[0.16, 1]} /><meshPhysicalMaterial color="#dff8ff" emissive={node.aura} emissiveIntensity={active ? 0.9 : 0.4} /></mesh>)}<Line points={points} color={node.aura} transparent opacity={active ? 0.78 : 0.46} lineWidth={1} /></group>; }
function PlaceArtifact({ node, active }: ArtifactProps) { return <group name="life-map-artifact-place"><mesh position={[0, -0.16, 0]} scale={[1, 0.22, 0.82]}><cylinderGeometry args={[0.42, 0.48, 0.5, 7]} /><meshStandardMaterial color="#183746" emissive={node.aura} emissiveIntensity={active ? 0.62 : 0.26} /></mesh><mesh position={[0, 0.18, 0]} rotation={[0, Math.PI / 4, 0]}><coneGeometry args={[0.34, 0.5, 5]} /><meshStandardMaterial color={node.aura} emissive={node.aura} emissiveIntensity={active ? 0.8 : 0.36} /></mesh></group>; }
function EmotionArtifact({ node, active }: ArtifactProps) {
  const petals: [number, number, number, number, number][] = [[-0.34, 0.08, 0, -0.4, 0.36], [0.34, 0.05, -0.06, 0.4, 0.38], [-0.16, 0.34, -0.14, -0.16, 0.32], [0.2, 0.32, -0.12, 0.2, 0.3], [0, -0.22, 0.03, 0.08, 0.28]];
  return <group name="life-map-artifact-emotion">
    <mesh scale={[0.48, 0.68, 0.46]} rotation={[0.18, 0.38, 0.08]}><dodecahedronGeometry args={[0.48, 1]} /><meshPhysicalMaterial color="#dff7ff" emissive={node.aura} emissiveIntensity={active ? 0.9 : 0.38} transmission={0.16} roughness={0.16} clearcoat={0.92} /></mesh>
    <mesh scale={[0.2, 0.27, 0.2]}><icosahedronGeometry args={[0.48, 1]} /><meshStandardMaterial color={PALE_GOLD} emissive={GOLD} emissiveIntensity={active ? 1.5 : 0.72} /></mesh>
    {petals.map(([x, y, z, rotation, scale], index) => <mesh key={index} position={[x, y, z]} scale={[scale, scale * 1.45, scale * 0.55]} rotation={[0.12, rotation, index * 0.3]}><dodecahedronGeometry args={[0.42, 0]} /><meshPhysicalMaterial color={index % 2 ? node.aura : ICE} emissive={node.aura} emissiveIntensity={active ? 0.52 : 0.22} transmission={0.1} transparent opacity={active ? 0.72 : 0.5} roughness={0.24} /></mesh>)}
  </group>;
}
function PatternArtifact({ node, active }: ArtifactProps) { return <group name="life-map-artifact-pattern">{[-0.36, 0, 0.36].map((x, index) => <mesh key={x} position={[x, index === 1 ? 0.18 : -0.06, -index * 0.08]} rotation={[0.1, index * 0.44, index * 0.16]}><boxGeometry args={[0.18, 0.46 + index * 0.1, 0.14]} /><meshStandardMaterial color={node.aura} emissive={node.aura} emissiveIntensity={active ? 0.76 : 0.32} transparent opacity={0.76} /></mesh>)}</group>; }
function AchievementArtifact({ node, active }: ArtifactProps) { return <group name="life-map-artifact-achievement"><mesh position={[0, -0.16, 0]} scale={[1, 0.24, 0.82]}><cylinderGeometry args={[0.44, 0.5, 0.45, 8]} /><meshStandardMaterial color="#2a2415" emissive={node.aura} emissiveIntensity={0.26} metalness={0.74} /></mesh><mesh position={[0, 0.2, 0]}><dodecahedronGeometry args={[0.3, 1]} /><meshPhysicalMaterial color="#ffe8a6" emissive={node.aura} emissiveIntensity={active ? 0.98 : 0.44} /></mesh></group>; }
function GoalArtifact({ node, active }: ArtifactProps) { return <group name="life-map-artifact-goal"><mesh position={[0, -0.08, 0]}><cylinderGeometry args={[0.035, 0.06, 0.6, 6]} /><meshStandardMaterial color={node.aura} emissive={node.aura} emissiveIntensity={active ? 0.9 : 0.38} /></mesh><mesh position={[0, 0.35, 0]}><coneGeometry args={[0.18, 0.32, 5]} /><meshStandardMaterial color="#fff0bd" emissive={node.aura} emissiveIntensity={active ? 0.96 : 0.44} /></mesh></group>; }
function FutureArtifact({ node, active }: ArtifactProps) { return <group name="life-map-artifact-future"><mesh rotation={[0.3, 0.5, 0.1]}><tetrahedronGeometry args={[0.38, 1]} /><meshPhysicalMaterial color="#f6edce" emissive={node.aura} emissiveIntensity={active ? 0.88 : 0.36} transmission={0.14} /></mesh><mesh scale={1.18}><tetrahedronGeometry args={[0.38, 0]} /><meshBasicMaterial color={node.aura} wireframe transparent opacity={active ? 0.26 : 0.12} /></mesh></group>; }
function EverydayArtifact({ node, active }: ArtifactProps) { return <group name="life-map-artifact-everyday"><mesh><dodecahedronGeometry args={[0.29, 0]} /><meshStandardMaterial color="#b9dbe8" emissive={node.aura} emissiveIntensity={active ? 0.7 : 0.3} /></mesh><mesh scale={1.15}><dodecahedronGeometry args={[0.29, 0]} /><meshBasicMaterial color={node.aura} wireframe transparent opacity={active ? 0.18 : 0.09} /></mesh></group>; }
function ArchiveArtifact({ node, active }: ArtifactProps) { return <group name="life-map-artifact-archive">{[-0.16, 0, 0.16].map((y, index) => <mesh key={y} position={[0, y, index * -0.05]}><boxGeometry args={[0.54 - index * 0.07, 0.09, 0.34]} /><meshStandardMaterial color="#17202b" emissive={node.aura} emissiveIntensity={active ? 0.5 : 0.22} /></mesh>)}</group>; }
function ProtectedArtifact({ node, active }: ArtifactProps) { return <group name="life-map-artifact-protected"><mesh><dodecahedronGeometry args={[0.34, 1]} /><meshPhysicalMaterial color="#03050a" emissive="#49345e" emissiveIntensity={active ? 0.32 : 0.14} metalness={0.88} /></mesh><mesh scale={1.15}><dodecahedronGeometry args={[0.34, 0]} /><meshBasicMaterial color={node.aura} wireframe transparent opacity={active ? 0.24 : 0.12} /></mesh></group>; }

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
    const desired = active ? (phase === "arrival" ? 1.26 : 1.02) : related ? 0.38 : 0.66 + importance * 0.24;
    const scale = THREE.MathUtils.damp(group.current.scale.x, desired, active ? 4.8 : 3.2, delta);
    group.current.scale.setScalar(scale);
    group.current.visible = visible;
    group.current.rotation.y = Math.sin(clock.elapsedTime * 0.12 + index) * 0.045;
    group.current.position.y = node.position[1] + Math.sin(clock.elapsedTime * 0.22 + index) * (active ? 0.01 : 0.035);
  });
  return <group ref={group} position={node.position} visible={visible} name={`life-map-artifact-${resolveArtifactFamily(node)}-${node.id}`} data-artifact-family={resolveArtifactFamily(node)} data-importance={importance.toFixed(2)} data-chapter={chapter.id} data-semantic-label={semanticLabel}>
    <group onClick={(event) => { event.stopPropagation(); onSelect(node); }} onPointerOver={() => { document.body.style.cursor = "pointer"; }} onPointerOut={() => { document.body.style.cursor = ""; }}>
      <ArtifactShape node={node} active={active} />
      {active ? <group name="life-map-selected-artifact-halo" position={[0, 0, -0.44]}>{[-0.5, 0, 0.5].map((x, marker) => <mesh key={x} position={[x, -0.4 + marker * 0.06, -0.12]} rotation={[0.1, marker * 0.32, 0.18]}><tetrahedronGeometry args={[0.055, 1]} /><meshBasicMaterial color={marker === 1 ? ICE : node.aura} transparent opacity={0.5} /></mesh>)}</group> : null}
    </group>
    <pointLight color={node.aura} intensity={active ? 3.1 : related ? 0.7 : 0.28 + importance * 0.46} distance={active ? 6 : 3} decay={2} />
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
  const curve = useMemo(() => { const middle = start.clone().lerp(end, 0.5); middle.y += Math.max(0.65, start.distanceTo(end) * 0.11); middle.z -= Math.min(1, start.distanceTo(end) * 0.05); return new THREE.QuadraticBezierCurve3(start, middle, end); }, [end, start]);
  const kind: LifeMapPathKind = resolvePathKind(source, target);
  const color = LIFE_MAP_PATH_PALETTE[kind];
  const opacity = active ? 0.42 : kind === "protected" ? 0.035 : 0.11;
  return <group data-path-kind={kind}><Line points={curve.getPoints(36)} color={color} lineWidth={active ? 1.1 : 0.5} transparent opacity={opacity} dashed={kind === "inferred" || kind === "corrected" || kind === "protected"} dashScale={1.5 + index * 0.03} />{active ? <PathPulse curve={curve} color={color} reducedMotion={reducedMotion} offset={(index * 0.19) % 1} /> : null}</group>;
}

function LivingPaths({ nodes, selected, reducedMotion, phase }: { nodes: LifeMapNode[]; selected: LifeMapNode | null; reducedMotion: boolean; phase: LifeMapJourneyPhase }) {
  const byId = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  if (selected && phase === "arrival") return null;
  return <group name="life-map-curved-semantic-paths" data-path-system="curved-semantic" data-depth-band="middle">{nodes.flatMap((source, sourceIndex) => source.connectedTo.slice(0, 3).map((targetId, targetIndex) => { const target = byId.get(targetId); if (!target || target.id < source.id) return null; const active = selected?.id === source.id || selected?.id === target.id; if (selected && !active) return null; return <SemanticPath key={`${source.id}-${target.id}`} source={source} target={target} active={active} reducedMotion={reducedMotion} index={sourceIndex * 3 + targetIndex} />; }))}</group>;
}

function SelectedRelationshipContext({ nodes, selected, reducedMotion, phase }: { nodes: LifeMapNode[]; selected: LifeMapNode | null; reducedMotion: boolean; phase: LifeMapJourneyPhase }) {
  if (!selected || phase !== "arrival") return null;
  const related = selected.connectedTo.map((id) => nodes.find((node) => node.id === id)).filter((node): node is LifeMapNode => Boolean(node)).slice(0, 3);
  return <group position={selected.position} name="life-map-selected-relationship-context" data-depth-band="middle">{related.map((node, index) => { const side = index % 2 === 0 ? -1 : 1; const end = new THREE.Vector3(side * (1.72 + index * 0.14), 0.18 + index * 0.3, -0.72 - index * 0.2); const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0.05, -0.25), new THREE.Vector3(end.x * 0.44, 0.56 + index * 0.12, end.z * 0.5), end); const color = LIFE_MAP_PATH_PALETTE[resolvePathKind(selected, node)]; return <group key={node.id}><Line points={curve.getPoints(28)} color={color} lineWidth={0.72} transparent opacity={0.24} /><mesh position={end} name={`life-map-related-witness-${node.id}`} rotation={[0.1, index * 0.42, 0.16]}><dodecahedronGeometry args={[0.1, 1]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} transparent opacity={0.82} /></mesh>{!reducedMotion ? <PathPulse curve={curve} color={color} reducedMotion={false} offset={index * 0.27} /> : null}</group>; })}</group>;
}

function ArrivalSanctuary({ selected, phase, reducedMotion }: { selected: LifeMapNode | null; phase: LifeMapJourneyPhase; reducedMotion: boolean }) {
  const chamber = useRef<THREE.Group>(null);
  useFrame(({ clock }) => { if (!chamber.current || reducedMotion) return; chamber.current.rotation.y = Math.sin(clock.elapsedTime * 0.08) * 0.01; });
  if (!selected || (phase !== "approach" && phase !== "arrival")) return null;
  const family = resolveArtifactFamily(selected);
  const opacity = phase === "arrival" ? 1 : 0.42;
  const warm = family === "achievement" || family === "goal" || family === "future";
  const chamberColor = warm ? GOLD : selected.aura;
  return <group ref={chamber} position={selected.position} name="life-map-intimate-memory-chamber" data-scale="intimate" data-depth-band="near" data-chamber-family={family}>
    <SoftField position={[0, 0.24, -2.05]} scale={[2.35, 2.05, 1]} color="#0b2432" opacity={0.34 * opacity} />
    <SoftField position={[0, 0.28, -1.96]} scale={[1.58, 1.42, 1]} color={chamberColor} opacity={0.055 * opacity} />
    <group name="life-map-chamber-threshold" position={[0, 0, -1.18]}>
      <mesh position={[-1.18, 0.18, 0]} rotation={[0, 0.03, -0.05]}><cylinderGeometry args={[0.055, 0.11, 1.72, 6]} /><meshStandardMaterial color="#102937" emissive={chamberColor} emissiveIntensity={0.22 * opacity} metalness={0.58} roughness={0.32} /></mesh>
      <mesh position={[1.18, 0.18, 0]} rotation={[0, -0.03, 0.05]}><cylinderGeometry args={[0.055, 0.11, 1.72, 6]} /><meshStandardMaterial color="#102937" emissive={chamberColor} emissiveIntensity={0.22 * opacity} metalness={0.58} roughness={0.32} /></mesh>
      <AtmosphericCurrent points={[[-1.18, 1.03, 0], [-0.62, 1.4, -0.08], [0, 1.54, -0.12], [0.62, 1.4, -0.08], [1.18, 1.03, 0]]} color={chamberColor} opacity={0.42 * opacity} width={0.022} />
    </group>
    <group name="life-map-chamber-floor" position={[0, -0.68, 0.34]}>{[0, 1, 2, 3].map((index) => <mesh key={index} position={[(index % 2 ? 1 : -1) * 0.04, -index * 0.005, index * 0.42]} rotation={[0, (index % 2 ? 1 : -1) * 0.05, 0]} scale={[0.95 - index * 0.06, 0.13, 0.46 - index * 0.02]}><cylinderGeometry args={[0.72, 0.78, 0.28, 8]} /><meshStandardMaterial color={index === 0 ? "#123244" : "#0a1d29"} emissive={chamberColor} emissiveIntensity={(0.1 + index * 0.016) * opacity} metalness={0.5} roughness={0.38} transparent opacity={0.92} /></mesh>)}</group>
    <group name="life-map-chamber-memory-veils" position={[0, 0.2, -1.52]}>
      <mesh position={[-0.76, 0.06, 0]} rotation={[0, 0.22, -0.04]} scale={[0.58, 2.25, 1]}><planeGeometry args={[1, 1]} /><meshBasicMaterial color={chamberColor} transparent opacity={0.045 * opacity} side={THREE.DoubleSide} depthWrite={false} /></mesh>
      <mesh position={[0, 0.18, -0.1]} scale={[0.72, 2.5, 1]}><planeGeometry args={[1, 1]} /><meshBasicMaterial color={ICE} transparent opacity={0.025 * opacity} side={THREE.DoubleSide} depthWrite={false} /></mesh>
      <mesh position={[0.76, 0.04, 0]} rotation={[0, -0.22, 0.04]} scale={[0.58, 2.25, 1]}><planeGeometry args={[1, 1]} /><meshBasicMaterial color={chamberColor} transparent opacity={0.045 * opacity} side={THREE.DoubleSide} depthWrite={false} /></mesh>
    </group>
    <group name="life-map-chamber-temporal-residue">{[-0.94, -0.56, 0.56, 0.94].map((x, index) => <mesh key={x} position={[x, -0.02 + index * 0.14, -0.82 - index * 0.05]} rotation={[0.1, index * 0.34, x < 0 ? -0.12 : 0.12]}><tetrahedronGeometry args={[0.075 + index * 0.007, 1]} /><meshStandardMaterial color={index % 2 ? ICE : chamberColor} emissive={chamberColor} emissiveIntensity={0.34 * opacity} transparent opacity={0.5 * opacity} /></mesh>)}</group>
    <AtmosphericCurrent points={[[-1.5, -0.12, -0.58], [-0.76, 0.48, -1.04], [0, 0.18, -1.28], [0.76, 0.48, -1.04], [1.5, -0.12, -0.58]]} color={chamberColor} opacity={0.14 * opacity} width={0.009} />
    <pointLight color={chamberColor} intensity={phase === "arrival" ? 2.6 : 0.95} distance={6} decay={2} position={[0, 0.2, 0.7]} />
    <pointLight color={ICE} intensity={phase === "arrival" ? 0.8 : 0.28} distance={4} decay={2} position={[0, 1.2, -0.8]} />
  </group>;
}

export function LifeMapProductionWorld({ nodes, selected, phase, profile, onSelect, cameraRig, webglRecovery }: { nodes: LifeMapNode[]; selected: LifeMapNode | null; phase: LifeMapJourneyPhase; profile: SpatialQualityProfile; onSelect: (node: LifeMapNode) => void; cameraRig: ReactNode; webglRecovery: ReactNode }) {
  const { size } = useThree();
  const qualityTier = profile.tier;
  const starCount = profile.tier === "low" ? 420 : profile.tier === "medium" ? 760 : 1160;
  const portrait = size.height > size.width;
  const stageScale: [number, number, number] = selected ? [1, 1, 1] : portrait ? [0.38, 0.92, 0.78] : [1.18, 1.16, 1.1];
  const stagePosition: [number, number, number] = selected ? [0, 0, 0] : portrait ? [0, -0.42, 1.25] : [0, -0.32, 1.15];
  return <>
    <color attach="background" args={[DEEP]} /><fog attach="fog" args={[DEEP, 16, 72]} />
    <ambientLight intensity={0.52} color="#b7eaff" /><directionalLight position={[7, 10, 8]} intensity={1.45} color="#d8f4ff" castShadow={profile.shadows} /><hemisphereLight args={["#c8f3ff", "#02040a", 0.58]} />
    {webglRecovery}{cameraRig}<AuthoredEnvironment selected={selected} /><TemporalHorizon selected={selected} />
    <group name="life-map-world-stage" scale={stageScale} position={stagePosition}>
      <LifeCore reducedMotion={profile.reducedMotion} tier={profile.tier} hidden={Boolean(selected)} /><LightBridges selected={selected} /><ChapterConstellations selected={selected} /><ForegroundObservatory selected={selected} /><RelationshipObservatory selected={selected} /><GoalHorizon selected={selected} /><AchievementMonument selected={selected} /><PrivacyVault selected={selected} /><EmotionalWeather reducedMotion={profile.reducedMotion} selected={selected} />
      <LivingPaths nodes={nodes} selected={selected} reducedMotion={profile.reducedMotion} phase={phase} />
      <group name="life-map-memory-artifact-families" data-depth-band="middle">{nodes.map((node, index) => <MemoryArtifact key={node.id} node={node} index={index} selected={selected} phase={phase} reducedMotion={profile.reducedMotion} onSelect={onSelect} />)}</group>
      <SelectedRelationshipContext nodes={nodes} selected={selected} reducedMotion={profile.reducedMotion} phase={phase} /><ArrivalSanctuary selected={selected} phase={phase} reducedMotion={profile.reducedMotion} />
    </group>
    <ArchiveParticles qualityTier={qualityTier} reducedMotion={profile.reducedMotion} /><group name="life-map-far-future-horizon" data-depth-band="far"><Stars radius={78} depth={58} count={starCount} factor={1.42} saturation={0.22} fade speed={profile.reducedMotion ? 0 : 0.018} /></group>
    <CinematicPostProcessing active={profile.postprocessing} reducedMotion={profile.reducedMotion} />
  </>;
}
