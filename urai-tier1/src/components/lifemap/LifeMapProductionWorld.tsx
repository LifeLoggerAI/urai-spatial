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

const GOLD = "#ffe2a0";
const CYAN = "#8cecff";
const GLASS = "#07111d";
const DEEP = "#02050b";
const INK = "#050b14";

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
    <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.9} roughness={0.2} metalness={0.68} transparent opacity={opacity} depthWrite={false} />
  </mesh>;
}

function EnvironmentBackdrop({ selected }: { selected: LifeMapNode | null }) {
  return <group name="life-map-authored-environment" data-depth-band="far">
    <mesh>
      <sphereGeometry args={[72, 32, 20]} />
      <meshBasicMaterial color={selected ? "#030812" : "#06101d"} side={THREE.BackSide} />
    </mesh>
    <mesh position={[-12, 7, -36]} scale={[15, 10, 1]}>
      <circleGeometry args={[1, 64]} />
      <meshBasicMaterial color="#123552" transparent opacity={selected ? 0.035 : 0.09} depthWrite={false} blending={THREE.AdditiveBlending} />
    </mesh>
    <mesh position={[13, -2, -30]} scale={[13, 8, 1]} rotation={[0, 0, -0.28]}>
      <circleGeometry args={[1, 64]} />
      <meshBasicMaterial color="#3a254f" transparent opacity={selected ? 0.025 : 0.065} depthWrite={false} blending={THREE.AdditiveBlending} />
    </mesh>
    <mesh position={[0, -8.5, -24]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[22, 96]} />
      <meshBasicMaterial color="#071727" transparent opacity={0.72} depthWrite={false} />
    </mesh>
    <mesh position={[0, -7.9, -17]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[7.5, 18, 128]} />
      <meshBasicMaterial color="#2d6980" transparent opacity={selected ? 0.025 : 0.075} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  </group>;
}

function LifeCore({ reducedMotion, tier, selected }: { reducedMotion: boolean; tier: SpatialQualityProfile["tier"]; selected: boolean }) {
  const core = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!core.current || reducedMotion) return;
    core.current.rotation.y = clock.elapsedTime * 0.038;
    core.current.rotation.x = Math.sin(clock.elapsedTime * 0.1) * 0.03;
  });
  return <group ref={core} name="life-map-white-gold-life-core" position={LIFE_MAP_CORE_POSITION} visible={!selected} data-life-core="white-gold-layered">
    <mesh castShadow rotation={[0.2, 0.45, 0.08]}>
      <icosahedronGeometry args={[0.62, tier === "high" ? 2 : 1]} />
      <meshPhysicalMaterial color="#fff6dd" emissive={GOLD} emissiveIntensity={0.85} roughness={0.2} metalness={0.34} transmission={0.08} clearcoat={0.7} clearcoatRoughness={0.2} />
    </mesh>
    <mesh scale={[0.72, 1.18, 0.72]} rotation={[-0.35, 0.18, 0.24]}>
      <octahedronGeometry args={[0.68, 1]} />
      <meshStandardMaterial color="#f7df9a" emissive="#ffc85c" emissiveIntensity={1.15} wireframe transparent opacity={0.72} />
    </mesh>
    <mesh rotation={[Math.PI / 2, 0.25, 0]}>
      <torusGeometry args={[1.08, 0.018, 8, 96]} />
      <meshBasicMaterial color={GOLD} transparent opacity={0.62} depthWrite={false} />
    </mesh>
    <mesh rotation={[Math.PI / 2.5, -0.4, 0.3]}>
      <torusGeometry args={[1.36, 0.012, 8, 96]} />
      <meshBasicMaterial color={CYAN} transparent opacity={0.24} depthWrite={false} />
    </mesh>
    <pointLight color={GOLD} intensity={tier === "low" ? 7 : 11} distance={20} decay={2} />
  </group>;
}

function LightBridges({ selected }: { selected: LifeMapNode | null }) {
  const origin = useMemo(() => new THREE.Vector3(...LIFE_MAP_CORE_POSITION), []);
  if (selected) return null;
  return <group name="life-map-light-bridges" data-depth-band="middle">
    {LIFE_MAP_CHAPTERS.map((chapter, index) => {
      const destination = new THREE.Vector3(...chapter.position);
      const control = origin.clone().lerp(destination, 0.52);
      control.y += 1.1 + index * 0.2;
      const points = new THREE.QuadraticBezierCurve3(origin, control, destination).getPoints(38);
      return <Line key={chapter.id} points={points} color={chapter.aura} lineWidth={0.7} transparent opacity={0.18} />;
    })}
  </group>;
}

function ChapterConstellations({ selected }: { selected: LifeMapNode | null }) {
  return <group name="life-map-authored-chapter-regions" data-scale="cosmic-overview" data-depth-band="middle" visible={!selected}>
    {LIFE_MAP_CHAPTERS.map((chapter, index) => <group key={chapter.id} name={`life-map-chapter-${chapter.id}`} position={chapter.position} rotation={chapter.rotation} data-chapter-region={chapter.id}>
      <mesh rotation={[Math.PI / 2, index * 0.2, 0]}>
        <torusGeometry args={[Math.max(0.96, chapter.radius * 0.16), 0.012, 8, 72]} />
        <meshBasicMaterial color={chapter.aura} transparent opacity={0.2} depthWrite={false} />
      </mesh>
      {[0, 1, 2, 3].map((point) => {
        const angle = (point / 4) * Math.PI * 2 + index * 0.38;
        return <mesh key={point} position={[Math.cos(angle) * 1.04, Math.sin(angle * 1.6) * 0.34, Math.sin(angle) * 0.68]} name={`life-map-chapter-anchor-${chapter.id}-${point}`}>
          <octahedronGeometry args={[0.075, 1]} />
          <meshStandardMaterial color={chapter.aura} emissive={chapter.aura} emissiveIntensity={0.62} roughness={0.2} metalness={0.68} transparent opacity={0.82} />
        </mesh>;
      })}
      <Html position={[0, 1.08, 0]} center distanceFactor={19}><span className="life-map-chapter-label">{chapter.title}</span></Html>
    </group>)}
  </group>;
}

function ForegroundObservatory({ selected }: { selected: LifeMapNode | null }) {
  if (selected) return null;
  return <group name="life-map-foreground-observatory" data-depth-band="near" position={[0, -2.35, 2.9]}>
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[3.6, 6.6, 128, 1, 0.32, Math.PI * 0.74]} />
      <meshBasicMaterial color="#4f94aa" transparent opacity={0.09} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
    <mesh position={[0, -0.02, -1.6]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[2.7, 72]} />
      <meshBasicMaterial color="#0b1d2a" transparent opacity={0.62} depthWrite={false} />
    </mesh>
    <pointLight position={[0, 0.4, -2]} color="#7ddaf1" intensity={0.65} distance={9} />
  </group>;
}

function RelationshipObservatory({ selected }: { selected: LifeMapNode | null }) {
  return <group name="life-map-relationship-observatory" data-depth-band="middle" position={[5.7, 0.8, -7.6]} visible={!selected}>
    {[0, 1, 2].map((index) => {
      const angle = index / 3 * Math.PI * 2;
      return <mesh key={index} position={[Math.cos(angle) * 1.05, Math.sin(angle * 1.7) * 0.34, Math.sin(angle) * 0.68]}>
        <octahedronGeometry args={[0.14, 1]} />
        <meshStandardMaterial color="#d9f6ff" emissive="#83dfff" emissiveIntensity={0.48} roughness={0.18} metalness={0.55} />
      </mesh>;
    })}
    <Ribbon radius={1.34} lift={0.18} phase={1.2} color="#a9e9ff" opacity={0.16} width={0.007} />
  </group>;
}

function GoalHorizon({ selected }: { selected: LifeMapNode | null }) {
  return <group name="life-map-goal-horizon" data-depth-band="far" position={[-7.4, 3.1, -17]} visible={!selected}>
    <mesh rotation={[0, 0, -0.18]}><coneGeometry args={[0.62, 2.2, 5]} /><meshStandardMaterial color="#152634" emissive="#f0ce7b" emissiveIntensity={0.42} roughness={0.34} metalness={0.66} /></mesh>
    <mesh position={[0, 1.45, 0]}><octahedronGeometry args={[0.21, 1]} /><meshStandardMaterial color="#fff0b0" emissive="#f4d681" emissiveIntensity={0.95} /></mesh>
  </group>;
}

function AchievementMonument({ selected }: { selected: LifeMapNode | null }) {
  return <group name="life-map-achievement-monument" data-depth-band="far" position={[7.7, -0.1, -14]} visible={!selected}>
    <mesh><cylinderGeometry args={[0.68, 1, 0.14, 8]} /><meshStandardMaterial color="#111c28" emissive="#c8a85c" emissiveIntensity={0.22} metalness={0.72} roughness={0.28} /></mesh>
    <mesh position={[0, 0.68, 0]} rotation={[0.15, 0.25, 0.08]}><dodecahedronGeometry args={[0.42, 1]} /><meshPhysicalMaterial color="#f4d98e" emissive="#f2c65c" emissiveIntensity={0.78} roughness={0.18} metalness={0.52} /></mesh>
  </group>;
}

function PrivacyVault({ selected }: { selected: LifeMapNode | null }) {
  return <group name="life-map-privacy-vault" data-depth-band="far" position={[-8.2, -1.2, -11.8]} visible={!selected}>
    <mesh><dodecahedronGeometry args={[0.95, 0]} /><meshStandardMaterial color="#03050a" emissive="#3b294c" emissiveIntensity={0.16} metalness={0.9} roughness={0.18} /></mesh>
    <mesh scale={1.12}><dodecahedronGeometry args={[0.95, 0]} /><meshBasicMaterial color="#7b6a94" wireframe transparent opacity={0.15} /></mesh>
  </group>;
}

function EmotionalWeather({ reducedMotion, selected }: { reducedMotion: boolean; selected: LifeMapNode | null }) {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!group.current || reducedMotion) return;
    group.current.rotation.y = Math.sin(clock.elapsedTime * 0.03) * 0.1;
    group.current.position.y = 3.5 + Math.sin(clock.elapsedTime * 0.08) * 0.1;
  });
  return <group ref={group} name="life-map-emotional-weather" data-depth-band="far" position={[0, 3.5, -20]} visible={!selected}>
    <Ribbon radius={7.2} lift={0.62} phase={0.6} color="#5b8eb5" opacity={0.07} width={0.02} />
    <Ribbon radius={5.7} lift={0.44} phase={2.1} color="#8e6fb0" opacity={0.05} width={0.016} />
  </group>;
}

function ArchiveParticles({ qualityTier, reducedMotion }: { qualityTier: SpatialQualityProfile["tier"]; reducedMotion: boolean }) {
  const particleCount = qualityTier === "low" ? 80 : qualityTier === "medium" ? 160 : 260;
  return <group name="life-map-archive-particles" data-depth-band="far">
    <Stars radius={52} depth={36} count={particleCount} factor={1.1} saturation={0.24} fade speed={reducedMotion ? 0 : 0.015} />
  </group>;
}

function VisualArtifact({ node, active }: ArtifactProps) {
  return <group name="life-map-artifact-visual">
    <mesh><boxGeometry args={[0.72, 0.5, 0.08]} /><meshPhysicalMaterial color="#122838" emissive={node.aura} emissiveIntensity={active ? 0.66 : 0.28} roughness={0.24} metalness={0.55} transmission={0.08} /></mesh>
    <mesh position={[0, 0, 0.065]}><boxGeometry args={[0.5, 0.3, 0.035]} /><meshStandardMaterial color={node.aura} emissive={node.aura} emissiveIntensity={active ? 0.95 : 0.4} roughness={0.4} /></mesh>
    <mesh scale={1.1}><boxGeometry args={[0.72, 0.5, 0.08]} /><meshBasicMaterial color="#dff7ff" wireframe transparent opacity={active ? 0.24 : 0.08} /></mesh>
  </group>;
}

function AudioArtifact({ node, active }: ArtifactProps) {
  return <group name="life-map-artifact-audio">{[-0.32, -0.16, 0, 0.16, 0.32].map((x, index) => <mesh key={x} position={[x, 0, 0]} scale={[1, 0.58 + Math.abs(2 - index) * 0.21, 1]}><capsuleGeometry args={[0.04, 0.34, 6, 12]} /><meshStandardMaterial color={node.aura} emissive={node.aura} emissiveIntensity={active ? 1.05 : 0.5} roughness={0.2} /></mesh>)}</group>;
}

function RelationshipArtifact({ node, active }: ArtifactProps) {
  const points: [number, number, number][] = [[-0.3, -0.04, 0], [0.3, 0.02, -0.08], [0, 0.32, -0.16], [-0.3, -0.04, 0]];
  return <group name="life-map-artifact-relationship">
    {points.slice(0, 3).map((position, index) => <mesh key={index} position={position}><octahedronGeometry args={[0.18, 1]} /><meshPhysicalMaterial color="#dff8ff" emissive={node.aura} emissiveIntensity={active ? 0.9 : 0.38} roughness={0.14} transmission={0.12} /></mesh>)}
    <Line points={points} color={node.aura} transparent opacity={active ? 0.82 : 0.46} lineWidth={1} />
  </group>;
}

function PlaceArtifact({ node, active }: ArtifactProps) {
  return <group name="life-map-artifact-place">
    <mesh position={[0, -0.18, 0]}><cylinderGeometry args={[0.42, 0.52, 0.16, 6]} /><meshStandardMaterial color="#183243" emissive={node.aura} emissiveIntensity={active ? 0.62 : 0.24} roughness={0.48} metalness={0.38} /></mesh>
    <mesh position={[0, 0.16, 0]} rotation={[0, Math.PI / 4, 0]}><coneGeometry args={[0.4, 0.54, 4]} /><meshStandardMaterial color={node.aura} emissive={node.aura} emissiveIntensity={active ? 0.82 : 0.36} roughness={0.32} /></mesh>
  </group>;
}

function EmotionArtifact({ node, active }: ArtifactProps) {
  return <group name="life-map-artifact-emotion">
    <mesh scale={[0.76, 1.08, 0.68]} rotation={[0.18, 0.42, 0.08]}><octahedronGeometry args={[0.46, 2]} /><meshPhysicalMaterial color="#e8f7ff" emissive={node.aura} emissiveIntensity={active ? 0.88 : 0.38} roughness={0.18} metalness={0.18} transmission={0.16} clearcoat={0.8} /></mesh>
    <mesh scale={[0.42, 0.64, 0.38]} rotation={[-0.24, -0.3, 0.18]}><icosahedronGeometry args={[0.48, 1]} /><meshStandardMaterial color={node.aura} emissive={node.aura} emissiveIntensity={active ? 1.05 : 0.42} transparent opacity={0.78} /></mesh>
    {[[-0.46, 0.02, -0.08], [0.46, 0.04, -0.12], [0, 0.5, -0.16]] as [number, number, number][]}.map((position, index) => <mesh key={index} position={position}><octahedronGeometry args={[0.08, 1]} /><meshBasicMaterial color={node.aura} transparent opacity={active ? 0.86 : 0.42} /></mesh>)}
  </group>;
}

function PatternArtifact({ node, active }: ArtifactProps) {
  return <group name="life-map-artifact-pattern">
    {[0.26, 0.39, 0.52].map((radius, index) => <mesh key={radius} rotation={[Math.PI / 2 + index * 0.14, index * 0.36, 0]}><torusGeometry args={[radius, 0.024 + index * 0.005, 8, 52]} /><meshStandardMaterial color={node.aura} emissive={node.aura} emissiveIntensity={active ? 0.78 : 0.3} transparent opacity={0.68 - index * 0.1} /></mesh>)}
  </group>;
}

function AchievementArtifact({ node, active }: ArtifactProps) {
  return <group name="life-map-artifact-achievement">
    <mesh position={[0, -0.16, 0]}><cylinderGeometry args={[0.36, 0.48, 0.15, 8]} /><meshStandardMaterial color="#2a2415" emissive={node.aura} emissiveIntensity={0.26} metalness={0.76} roughness={0.24} /></mesh>
    <mesh position={[0, 0.2, 0]} rotation={[0.2, 0.3, 0.1]}><dodecahedronGeometry args={[0.31, 1]} /><meshPhysicalMaterial color="#ffe8a6" emissive={node.aura} emissiveIntensity={active ? 1.02 : 0.44} roughness={0.16} metalness={0.52} /></mesh>
  </group>;
}

function GoalArtifact({ node, active }: ArtifactProps) {
  return <group name="life-map-artifact-goal">
    <mesh position={[0, -0.08, 0]}><cylinderGeometry args={[0.075, 0.11, 0.6, 10]} /><meshStandardMaterial color={node.aura} emissive={node.aura} emissiveIntensity={active ? 0.92 : 0.38} metalness={0.62} /></mesh>
    <mesh position={[0, 0.37, 0]}><coneGeometry args={[0.21, 0.36, 5]} /><meshStandardMaterial color="#fff0bd" emissive={node.aura} emissiveIntensity={active ? 1 : 0.44} /></mesh>
  </group>;
}

function FutureArtifact({ node, active }: ArtifactProps) {
  return <group name="life-map-artifact-future">
    <mesh rotation={[0.3, 0.5, 0.1]}><tetrahedronGeometry args={[0.42, 1]} /><meshPhysicalMaterial color="#f6edce" emissive={node.aura} emissiveIntensity={active ? 0.9 : 0.36} roughness={0.12} metalness={0.38} transmission={0.18} /></mesh>
    <mesh scale={1.2} rotation={[-0.25, 0.12, 0.3]}><tetrahedronGeometry args={[0.42, 0]} /><meshBasicMaterial color={node.aura} wireframe transparent opacity={active ? 0.3 : 0.1} /></mesh>
  </group>;
}

function EverydayArtifact({ node, active }: ArtifactProps) {
  return <group name="life-map-artifact-everyday">
    <mesh rotation={[0.2, 0.4, 0.08]}><dodecahedronGeometry args={[0.31, 0]} /><meshStandardMaterial color="#b9dbe8" emissive={node.aura} emissiveIntensity={active ? 0.72 : 0.28} roughness={0.42} metalness={0.2} /></mesh>
    <mesh scale={1.16}><dodecahedronGeometry args={[0.31, 0]} /><meshBasicMaterial color={node.aura} wireframe transparent opacity={active ? 0.18 : 0.07} /></mesh>
  </group>;
}

function ArchiveArtifact({ node, active }: ArtifactProps) {
  return <group name="life-map-artifact-archive">
    {[-0.16, 0, 0.16].map((y, index) => <mesh key={y} position={[0, y, index * -0.04]} rotation={[0.08, 0.22, 0]}><boxGeometry args={[0.56 - index * 0.07, 0.1, 0.38]} /><meshStandardMaterial color="#17202b" emissive={node.aura} emissiveIntensity={active ? 0.5 : 0.18} roughness={0.5} metalness={0.42} /></mesh>)}
    <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.46, 0.021, 8, 48]} /><meshBasicMaterial color={node.aura} transparent opacity={active ? 0.34 : 0.12} /></mesh>
  </group>;
}

function ProtectedArtifact({ node, active }: ArtifactProps) {
  return <group name="life-map-artifact-protected">
    <mesh><dodecahedronGeometry args={[0.38, 1]} /><meshPhysicalMaterial color="#03050a" emissive="#39284b" emissiveIntensity={active ? 0.32 : 0.14} metalness={0.9} roughness={0.18} /></mesh>
    <mesh scale={1.16}><dodecahedronGeometry args={[0.38, 0]} /><meshBasicMaterial color={node.aura} wireframe transparent opacity={active ? 0.26 : 0.12} /></mesh>
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
  const visible = !selected || active || (related && phase !== "arrival");
  const importance = artifactImportance(node);
  const chapter = chapterForNode(node, index);
  const semanticLabel = artifactFamilyLabel(node);
  useFrame(({ clock }, delta) => {
    if (!group.current || reducedMotion) return;
    const desired = active ? (phase === "arrival" ? 0.78 : 0.9) : related ? 0.28 : 0.46 + importance * 0.2;
    const scale = THREE.MathUtils.damp(group.current.scale.x, desired, active ? 4.8 : 3.2, delta);
    group.current.scale.setScalar(scale);
    group.current.visible = visible;
    group.current.rotation.y = Math.sin(clock.elapsedTime * 0.12 + index) * 0.055;
    group.current.position.y = node.position[1] + Math.sin(clock.elapsedTime * 0.22 + index) * (active ? 0.01 : 0.035);
  });
  return <group ref={group} position={node.position} visible={visible} name={`life-map-artifact-${resolveArtifactFamily(node)}-${node.id}`} data-artifact-family={resolveArtifactFamily(node)} data-importance={importance.toFixed(2)} data-chapter={chapter.id} data-semantic-label={semanticLabel}>
    <group onClick={(event) => { event.stopPropagation(); onSelect(node); }} onPointerOver={() => { document.body.style.cursor = "pointer"; }} onPointerOut={() => { document.body.style.cursor = ""; }}>
      <ArtifactShape node={node} active={active} />
      {active ? <group name="life-map-selected-artifact-halo" position={[0, 0, -0.5]}>
        <mesh><ringGeometry args={[0.72, 0.78, 72]} /><meshBasicMaterial color={node.aura} transparent opacity={0.24} side={THREE.DoubleSide} depthWrite={false} /></mesh>
        <mesh rotation={[0, 0, Math.PI / 4]}><ringGeometry args={[0.9, 0.92, 72, 1, 0.3, Math.PI * 1.4]} /><meshBasicMaterial color="#dff8ff" transparent opacity={0.16} side={THREE.DoubleSide} depthWrite={false} /></mesh>
      </group> : null}
    </group>
    <pointLight color={node.aura} intensity={active ? 3.2 : related ? 0.7 : 0.28 + importance * 0.5} distance={active ? 6 : 2.8} decay={2} />
  </group>;
}

function PathPulse({ curve, color, reducedMotion, offset }: { curve: THREE.QuadraticBezierCurve3; color: string; reducedMotion: boolean; offset: number }) {
  const pulse = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!pulse.current || reducedMotion) return;
    const t = (clock.elapsedTime * 0.06 + offset) % 1;
    pulse.current.position.copy(curve.getPoint(t));
  });
  return <mesh ref={pulse} position={curve.getPoint(offset % 1)} name="life-map-living-pulse">
    <octahedronGeometry args={[0.045, 1]} />
    <meshBasicMaterial color={color} transparent opacity={0.68} />
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
  const opacity = active ? 0.5 : kind === "protected" ? 0.04 : 0.08;
  return <group data-path-kind={kind}>
    <Line points={points} color={color} lineWidth={active ? 1.2 : 0.48} transparent opacity={opacity} dashed={kind === "inferred" || kind === "corrected" || kind === "protected"} dashScale={1.5 + index * 0.03} />
    {active ? <PathPulse curve={curve} color={color} reducedMotion={reducedMotion} offset={(index * 0.19) % 1} /> : null}
  </group>;
}

function LivingPaths({ nodes, selected, reducedMotion, phase }: { nodes: LifeMapNode[]; selected: LifeMapNode | null; reducedMotion: boolean; phase: LifeMapJourneyPhase }) {
  const byId = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  if (selected && phase === "arrival") return null;
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

function SelectedRelationshipContext({ nodes, selected, reducedMotion, phase }: { nodes: LifeMapNode[]; selected: LifeMapNode | null; reducedMotion: boolean; phase: LifeMapJourneyPhase }) {
  if (!selected || phase !== "arrival") return null;
  const related = selected.connectedTo.map((id) => nodes.find((node) => node.id === id)).filter((node): node is LifeMapNode => Boolean(node)).slice(0, 3);
  return <group position={selected.position} name="life-map-selected-relationship-context" data-depth-band="middle">
    {related.map((node, index) => {
      const angle = -0.8 + index * 0.8;
      const end = new THREE.Vector3(Math.cos(angle) * 2.2, 0.35 + index * 0.22, -1.2 - Math.abs(Math.sin(angle)) * 0.6);
      const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0, -0.25), new THREE.Vector3(end.x * 0.5, 0.85, end.z * 0.5), end);
      const color = LIFE_MAP_PATH_PALETTE[resolvePathKind(selected, node)];
      return <group key={node.id}>
        <Line points={curve.getPoints(28)} color={color} lineWidth={0.72} transparent opacity={0.24} />
        <mesh position={end} name={`life-map-related-witness-${node.id}`}>
          <octahedronGeometry args={[0.11, 1]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.48} roughness={0.22} metalness={0.46} transparent opacity={0.82} />
        </mesh>
        {!reducedMotion ? <PathPulse curve={curve} color={color} reducedMotion={false} offset={index * 0.27} /> : null}
      </group>;
    })}
  </group>;
}

function ArrivalSanctuary({ selected, phase }: { selected: LifeMapNode | null; phase: LifeMapJourneyPhase }) {
  if (!selected || (phase !== "approach" && phase !== "arrival")) return null;
  const opacity = phase === "arrival" ? 0.26 : 0.1;
  return <group position={selected.position} name="life-map-intimate-memory-chamber" data-scale="intimate" data-depth-band="near">
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.82, 0]}><ringGeometry args={[1.45, 1.72, 96]} /><meshBasicMaterial color={selected.aura} transparent opacity={opacity} side={THREE.DoubleSide} depthWrite={false} /></mesh>
    <mesh position={[0, 0, -1.15]}><ringGeometry args={[1.3, 1.42, 96]} /><meshBasicMaterial color="#dff8ff" transparent opacity={opacity * 0.52} side={THREE.DoubleSide} depthWrite={false} /></mesh>
    <mesh position={[0, 0, -1.2]}><circleGeometry args={[1.28, 96]} /><meshBasicMaterial color="#0a1c2a" transparent opacity={0.42} depthWrite={false} /></mesh>
    {[0, 1, 2, 3].map((index) => { const angle = index / 4 * Math.PI * 2; return <mesh key={index} position={[Math.cos(angle) * 1.86, -0.66, Math.sin(angle) * 1.86 - 0.18]} name={`life-map-sanctuary-marker-${index}`}><cylinderGeometry args={[0.018, 0.045, 0.18, 10]} /><meshStandardMaterial color={GLASS} emissive={selected.aura} emissiveIntensity={0.32} transparent opacity={opacity * 1.8} /></mesh>; })}
    <pointLight color={selected.aura} intensity={phase === "arrival" ? 2.7 : 1.2} distance={6} />
  </group>;
}

export function LifeMapProductionWorld({ nodes, selected, phase, profile, onSelect, cameraRig, webglRecovery }: { nodes: LifeMapNode[]; selected: LifeMapNode | null; phase: LifeMapJourneyPhase; profile: SpatialQualityProfile; onSelect: (node: LifeMapNode) => void; cameraRig: ReactNode; webglRecovery: ReactNode }) {
  const { size } = useThree();
  const qualityTier = profile.tier;
  const starCount = profile.tier === "low" ? 420 : profile.tier === "medium" ? 760 : 1200;
  const portrait = size.height > size.width;
  const stageScale: [number, number, number] = selected ? [1, 1, 1] : portrait ? [0.72, 0.82, 0.84] : [1.12, 1.12, 1.12];
  const stagePosition: [number, number, number] = selected ? [0, 0, 0] : portrait ? [0, 0.38, 1.15] : [0, 0.42, 1.05];
  return <>
    <color attach="background" args={[DEEP]} />
    <fog attach="fog" args={[DEEP, 11, 60]} />
    <ambientLight intensity={0.36} color="#b7eaff" />
    <directionalLight position={[7, 10, 8]} intensity={1.45} color="#d8f4ff" castShadow={profile.shadows} />
    <hemisphereLight args={["#c8f3ff", "#02040a", 0.5]} />
    {webglRecovery}{cameraRig}
    <EnvironmentBackdrop selected={selected} />
    <group name="life-map-world-stage" scale={stageScale} position={stagePosition}>
      <LifeCore reducedMotion={profile.reducedMotion} tier={profile.tier} selected={Boolean(selected)} />
      <LightBridges selected={selected} />
      <ChapterConstellations selected={selected} />
      <ForegroundObservatory selected={selected} />
      <RelationshipObservatory selected={selected} />
      <GoalHorizon selected={selected} />
      <AchievementMonument selected={selected} />
      <PrivacyVault selected={selected} />
      <EmotionalWeather reducedMotion={profile.reducedMotion} selected={selected} />
      <LivingPaths nodes={nodes} selected={selected} reducedMotion={profile.reducedMotion} phase={phase} />
      <group name="life-map-memory-artifact-families" data-depth-band="middle">{nodes.map((node, index) => <MemoryArtifact key={node.id} node={node} index={index} selected={selected} phase={phase} reducedMotion={profile.reducedMotion} onSelect={onSelect} />)}</group>
      <SelectedRelationshipContext nodes={nodes} selected={selected} reducedMotion={profile.reducedMotion} phase={phase} />
      <ArrivalSanctuary selected={selected} phase={phase} />
    </group>
    <ArchiveParticles qualityTier={qualityTier} reducedMotion={profile.reducedMotion} />
    <group name="life-map-far-future-horizon" data-depth-band="far"><Stars radius={78} depth={58} count={starCount} factor={1.45} saturation={0.2} fade speed={profile.reducedMotion ? 0 : 0.022} /></group>
    <CinematicPostProcessing active={profile.postprocessing} reducedMotion={profile.reducedMotion} />
  </>;
}
