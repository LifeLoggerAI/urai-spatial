"use client";

import { Line, Stars } from "@react-three/drei";
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
type Point3 = [number, number, number];

const GOLD = "#ffd98a";
const PALE_GOLD = "#fff4cf";
const CYAN = "#8de7ff";
const ICE = "#dcf7ff";
const DEEP = "#02050a";
const Y_AXIS = new THREE.Vector3(0, 1, 0);

function curveThrough(points: Point3[]) {
  return new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)), false, "catmullrom", 0.28);
}

function organicShape(seed: number, radiusX = 1, radiusY = 0.72, points = 18) {
  const shape = new THREE.Shape();
  for (let index = 0; index <= points; index += 1) {
    const angle = (index / points) * Math.PI * 2;
    const irregularity = 1 + Math.sin(angle * 3 + seed * 0.91) * 0.12 + Math.sin(angle * 5 - seed * 0.47) * 0.06;
    const x = Math.cos(angle) * radiusX * irregularity;
    const y = Math.sin(angle) * radiusY * (1 + Math.cos(angle * 2 + seed) * 0.08);
    if (index === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

function ribbonGeometry(points: Point3[], halfWidth: number) {
  const curve = curveThrough(points);
  const samples = curve.getPoints(56);
  const positions: number[] = [];
  const indices: number[] = [];
  for (let index = 0; index < samples.length; index += 1) {
    const tangent = curve.getTangent(index / Math.max(1, samples.length - 1)).normalize();
    const side = new THREE.Vector3().crossVectors(Y_AXIS, tangent).normalize();
    if (side.lengthSq() < 0.01) side.set(1, 0, 0);
    const taper = Math.sin((index / Math.max(1, samples.length - 1)) * Math.PI) * 0.14 + 0.86;
    const left = samples[index].clone().addScaledVector(side, halfWidth * taper);
    const right = samples[index].clone().addScaledVector(side, -halfWidth * taper);
    positions.push(left.x, left.y, left.z, right.x, right.y, right.z);
    if (index < samples.length - 1) {
      const base = index * 2;
      indices.push(base, base + 2, base + 1, base + 2, base + 3, base + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function AtmosphericCurrent({ points, color, opacity, width = 0.012 }: { points: Point3[]; color: string; opacity: number; width?: number }) {
  const curve = useMemo(() => curveThrough(points), [points]);
  return <mesh>
    <tubeGeometry args={[curve, 64, width, 6, false]} />
    <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.74} roughness={0.3} metalness={0.28} transparent opacity={opacity} depthWrite={false} />
  </mesh>;
}

function MemoryRibbon({ points, color, opacity, width, emissive = 0.24 }: { points: Point3[]; color: string; opacity: number; width: number; emissive?: number }) {
  const geometry = useMemo(() => ribbonGeometry(points, width), [points, width]);
  return <mesh geometry={geometry}>
    <meshStandardMaterial color={color} emissive={color} emissiveIntensity={emissive} roughness={0.46} metalness={0.18} transparent opacity={opacity} depthWrite={false} side={THREE.DoubleSide} />
  </mesh>;
}

function SoftField({ position, scale, rotation = [0, 0, 0], color, opacity }: { position: Point3; scale: Point3; rotation?: Point3; color: string; opacity: number }) {
  return <mesh position={position} scale={scale} rotation={rotation}>
    <circleGeometry args={[1, 64]} />
    <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
  </mesh>;
}

function OrganicSurface({ seed, position = [0, 0, 0], rotation = [-Math.PI / 2, 0, 0], scale = [1, 1, 1], color, aura, opacity = 0.9, depth = 0.12, emissive = 0.12 }: { seed: number; position?: Point3; rotation?: Point3; scale?: Point3; color: string; aura: string; opacity?: number; depth?: number; emissive?: number }) {
  const shape = useMemo(() => organicShape(seed), [seed]);
  const settings = useMemo(() => ({ depth, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: Math.min(0.06, depth * 0.35), bevelThickness: Math.min(0.04, depth * 0.28), curveSegments: 16 }), [depth]);
  return <mesh position={position} rotation={rotation} scale={scale} castShadow receiveShadow>
    <extrudeGeometry args={[shape, settings]} />
    <meshPhysicalMaterial color={color} emissive={aura} emissiveIntensity={emissive} roughness={0.46} metalness={0.22} transparent opacity={opacity} clearcoat={0.42} clearcoatRoughness={0.5} />
  </mesh>;
}

function OrganicVeil({ seed, position, rotation, scale, color, opacity }: { seed: number; position: Point3; rotation: Point3; scale: Point3; color: string; opacity: number }) {
  const shape = useMemo(() => organicShape(seed, 1, 0.78, 20), [seed]);
  return <mesh position={position} rotation={rotation} scale={scale}>
    <shapeGeometry args={[shape, 12]} />
    <meshBasicMaterial color={color} transparent opacity={opacity} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
  </mesh>;
}

function AuthoredEnvironment({ selected }: { selected: LifeMapNode | null }) {
  return <group name="life-map-authored-environment" data-depth-band="far">
    <mesh><sphereGeometry args={[74, 36, 24]} /><meshBasicMaterial color={selected ? "#02060b" : "#06101a"} side={THREE.BackSide} /></mesh>
    <SoftField position={[-10, 6, -34]} scale={[18, 9, 1]} rotation={[0.06, 0.08, -0.14]} color="#174867" opacity={selected ? 0.05 : 0.18} />
    <SoftField position={[11, 0, -31]} scale={[16, 8, 1]} rotation={[-0.03, -0.12, 0.18]} color="#513668" opacity={selected ? 0.045 : 0.12} />
    <SoftField position={[0, -2, -27]} scale={[12, 5, 1]} color="#7a5a2e" opacity={selected ? 0.025 : 0.06} />
    <mesh position={[0, -7.1, -20]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[24, 96]} /><meshBasicMaterial color="#07141e" transparent opacity={0.82} depthWrite={false} /></mesh>
    <AtmosphericCurrent points={[[-18, 6, -30], [-8, 7.4, -34], [0, 6.5, -36], [8, 7.5, -34], [18, 6, -30]]} color="#3b7692" opacity={selected ? 0.035 : 0.11} width={0.026} />
  </group>;
}

function TemporalLandscape({ selected }: { selected: LifeMapNode | null }) {
  if (selected) return null;
  return <group name="life-map-temporal-landscape" data-depth-band="middle">
    <MemoryRibbon points={[[-7.2, -2.1, 3.7], [-4.4, -1.5, 0.5], [-2.2, -0.9, -2.6], [0, -1.2, -5.1], [3.1, -0.5, -7.6], [6.8, 0.4, -11.8]]} color="#163342" opacity={0.7} width={1.55} emissive={0.08} />
    <MemoryRibbon points={[[7, -0.1, -12], [3.8, 0.4, -8.4], [0.4, -0.6, -5.3], [-2.8, 0.1, -3.8], [-5.8, 1.1, -5.5]]} color="#24465a" opacity={0.36} width={0.72} emissive={0.16} />
    <MemoryRibbon points={[[-6.8, 1.6, -6.2], [-3.4, 1.2, -4.4], [0.2, 0.45, -4.8], [3.7, 1.0, -7.4], [6.4, 1.7, -11.6]]} color="#6c5278" opacity={0.18} width={0.24} emissive={0.3} />
  </group>;
}

function TemporalHorizon({ selected }: { selected: LifeMapNode | null }) {
  if (selected) return null;
  return <group name="life-map-temporal-horizon" data-depth-band="far">
    <AtmosphericCurrent points={[[-14, 4.4, -22], [-7, 5.2, -24], [0, 4.7, -25], [7, 5.4, -24], [14, 4.3, -22]]} color="#5f9bb7" opacity={0.14} width={0.018} />
    <AtmosphericCurrent points={[[-13, -1.4, -17], [-6, -0.7, -19], [0, -1.1, -20], [6, -0.5, -19], [13, -1.3, -17]]} color="#806b96" opacity={0.09} width={0.014} />
    {[-10, -5, 0, 5, 10].map((x, index) => <group key={x} position={[x, -2.75 + Math.abs(index - 2) * 0.12, -16.5 - Math.abs(index - 2) * 0.5]}>
      <mesh><cylinderGeometry args={[0.025, 0.055, 0.7 + index * 0.09, 6]} /><meshStandardMaterial color="#102432" emissive={index === 2 ? GOLD : CYAN} emissiveIntensity={index === 2 ? 0.44 : 0.16} roughness={0.4} metalness={0.48} /></mesh>
      <mesh position={[0, 0.46 + index * 0.04, 0]} rotation={[0.2, index * 0.45, 0]}><octahedronGeometry args={[0.06, 1]} /><meshBasicMaterial color={index === 2 ? PALE_GOLD : CYAN} transparent opacity={0.62} /></mesh>
    </group>)}
  </group>;
}

function LifeCore({ reducedMotion, tier, hidden }: { reducedMotion: boolean; tier: SpatialQualityProfile["tier"]; hidden: boolean }) {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!group.current || reducedMotion) return;
    group.current.rotation.y = Math.sin(clock.elapsedTime * 0.18) * 0.08;
    group.current.position.y = LIFE_MAP_CORE_POSITION[1] + Math.sin(clock.elapsedTime * 0.34) * 0.05;
  });
  const strands = [
    { color: PALE_GOLD, offset: 0, radius: 0.54 },
    { color: CYAN, offset: Math.PI * 0.67, radius: 0.48 },
    { color: "#c7a5ff", offset: Math.PI * 1.33, radius: 0.44 },
  ];
  return <group ref={group} name="life-map-white-gold-life-core" position={LIFE_MAP_CORE_POSITION} visible={!hidden} data-life-core="white-gold-layered">
    {strands.map((strand, strandIndex) => {
      const points: Point3[] = Array.from({ length: 9 }, (_, index) => {
        const t = index / 8;
        const angle = t * Math.PI * 2.6 + strand.offset;
        return [Math.cos(angle) * strand.radius * (0.72 + Math.sin(t * Math.PI) * 0.34), -0.92 + t * 1.84, Math.sin(angle) * strand.radius * 0.66];
      });
      return <AtmosphericCurrent key={strandIndex} points={points} color={strand.color} opacity={0.82} width={tier === "low" ? 0.032 : 0.04} />;
    })}
    <mesh scale={[0.38, 0.72, 0.38]} rotation={[0.22, 0.38, 0.08]}><dodecahedronGeometry args={[0.5, 1]} /><meshPhysicalMaterial color="#fff6d8" emissive={GOLD} emissiveIntensity={1.3} transmission={0.18} roughness={0.16} clearcoat={0.92} /></mesh>
    <pointLight color={GOLD} intensity={tier === "low" ? 5 : 8} distance={18} decay={2} />
  </group>;
}

function LightBridges({ selected }: { selected: LifeMapNode | null }) {
  const origin = useMemo(() => new THREE.Vector3(...LIFE_MAP_CORE_POSITION), []);
  if (selected) return null;
  return <group name="life-map-light-bridges" data-depth-band="middle">{LIFE_MAP_CHAPTERS.map((chapter, index) => {
    const destination = new THREE.Vector3(...chapter.position);
    const control = origin.clone().lerp(destination, 0.52);
    control.y += 0.72 + index * 0.11;
    control.z -= 0.62;
    return <Line key={chapter.id} points={new THREE.QuadraticBezierCurve3(origin, control, destination).getPoints(42)} color={chapter.aura} lineWidth={0.62} transparent opacity={0.2} />;
  })}</group>;
}

function BecomingSignature({ aura }: { aura: string }) {
  return <group name="life-map-chapter-signature-becoming">
    {[-0.62, 0, 0.62].map((x, index) => <OrganicVeil key={x} seed={11 + index} position={[x, 0.12 + index * 0.08, -0.18 - index * 0.05]} rotation={[-0.12, index * 0.34 - 0.34, index * 0.1]} scale={[0.7, 0.48, 0.7]} color={index === 1 ? ICE : aura} opacity={0.2} />)}
    <AtmosphericCurrent points={[[-1.05, -0.06, 0.18], [-0.48, 0.34, -0.12], [0, 0.62, -0.3], [0.5, 0.34, -0.1], [1.08, -0.04, 0.15]]} color={aura} opacity={0.3} width={0.012} />
  </group>;
}

function ReturnSignature({ aura }: { aura: string }) {
  return <group name="life-map-chapter-signature-return">
    <MemoryRibbon points={[[-1.2, -0.05, 0.2], [-0.8, 0.18, -0.2], [-0.42, 0.45, -0.42], [-0.12, 0.64, -0.55]]} color={aura} opacity={0.32} width={0.09} emissive={0.42} />
    <MemoryRibbon points={[[1.15, -0.08, 0.16], [0.76, 0.16, -0.2], [0.4, 0.42, -0.44], [0.12, 0.64, -0.56]]} color={ICE} opacity={0.28} width={0.08} emissive={0.38} />
    {[-0.55, 0, 0.58].map((x, index) => <mesh key={x} position={[x, -0.06 + index * 0.16, -0.3 - index * 0.08]} rotation={[0.18, index * 0.48, 0.12]}><tetrahedronGeometry args={[0.07 + index * 0.01, 1]} /><meshStandardMaterial color={index === 1 ? PALE_GOLD : aura} emissive={aura} emissiveIntensity={0.48} transparent opacity={0.72} /></mesh>)}
  </group>;
}

function ConnectionSignature({ aura }: { aura: string }) {
  const strands: Point3[][] = [
    [[-1.15, -0.06, 0.12], [-0.58, 0.32, -0.22], [0, 0.12, -0.5], [0.62, 0.46, -0.28], [1.18, 0.08, 0.08]],
    [[-1.08, 0.2, -0.04], [-0.48, -0.02, -0.34], [0.08, 0.45, -0.48], [0.68, 0.12, -0.18], [1.08, 0.3, 0.02]],
  ];
  return <group name="life-map-chapter-signature-connection">
    {strands.map((points, index) => <AtmosphericCurrent key={index} points={points} color={index ? ICE : aura} opacity={0.34} width={0.012} />)}
    {[-0.86, -0.08, 0.74].map((x, index) => <mesh key={x} position={[x, 0.08 + index * 0.14, -0.22]} rotation={[0.16, index * 0.5, 0.08]}><dodecahedronGeometry args={[0.075, 1]} /><meshStandardMaterial color={ICE} emissive={aura} emissiveIntensity={0.58} /></mesh>)}
  </group>;
}

function FutureSignature({ aura }: { aura: string }) {
  return <group name="life-map-chapter-signature-future">
    {[-0.62, 0, 0.62].map((x, index) => <OrganicVeil key={x} seed={31 + index} position={[x, 0.34 + index * 0.16, -0.3 - index * 0.12]} rotation={[0.02, index * 0.22 - 0.22, index * 0.04]} scale={[0.48, 1.15 + index * 0.2, 1]} color={index === 1 ? PALE_GOLD : aura} opacity={0.11 + index * 0.025} />)}
    <AtmosphericCurrent points={[[-1.05, -0.12, 0.1], [-0.46, 0.22, -0.35], [0, 0.78, -0.66], [0.52, 1.16, -0.84], [1.12, 1.48, -1.08]]} color={PALE_GOLD} opacity={0.28} width={0.014} />
  </group>;
}

function ChapterTerritory({ id, aura, index }: { id: string; aura: string; index: number }) {
  return <group>
    <OrganicSurface seed={index + 4} position={[0, -0.58, 0]} rotation={[-Math.PI / 2, 0, index * 0.18]} scale={[1.58, 1.02, 1]} color="#0a1a25" aura={aura} opacity={0.92} depth={0.11} emissive={0.11} />
    <OrganicSurface seed={index + 14} position={[0.08, -0.48, -0.08]} rotation={[-Math.PI / 2, 0, -index * 0.12]} scale={[1.18, 0.76, 1]} color="#102936" aura={aura} opacity={0.54} depth={0.04} emissive={0.16} />
    <MemoryRibbon points={[[-1.35, -0.46, 0.2], [-0.78, -0.32, -0.08], [0, -0.4, -0.34], [0.76, -0.26, -0.08], [1.38, -0.42, 0.18]]} color={aura} opacity={0.14} width={0.09} emissive={0.3} />
    {id === "spring-becoming" ? <BecomingSignature aura={aura} /> : id === "threshold-return" ? <ReturnSignature aura={aura} /> : id === "relationship-orbit" ? <ConnectionSignature aura={aura} /> : <FutureSignature aura={aura} />}
  </group>;
}

function ChapterConstellations({ selected }: { selected: LifeMapNode | null }) {
  if (selected) return null;
  return <group name="life-map-authored-chapter-regions" position={[0, -0.18, 0]} data-scale="cosmic-overview" data-depth-band="middle">{LIFE_MAP_CHAPTERS.map((chapter, index) => {
    const anchorPositions: Point3[] = [[-0.92, 0.1, 0.18], [-0.32, 0.56, -0.28], [0.38, 0.24, -0.55], [0.94, -0.02, 0.08]];
    return <group key={chapter.id} name={`life-map-chapter-${chapter.id}`} position={chapter.position} rotation={chapter.rotation} data-chapter-region={chapter.id}>
      <ChapterTerritory id={chapter.id} aura={chapter.aura} index={index} />
      {anchorPositions.map((position, point) => <mesh key={point} position={position} name={`life-map-chapter-anchor-${chapter.id}-${point}`} rotation={[0.12, point * 0.42, point * 0.12]}><dodecahedronGeometry args={[0.08 + point * 0.01, 1]} /><meshStandardMaterial color={point === 1 ? ICE : chapter.aura} emissive={chapter.aura} emissiveIntensity={0.58} roughness={0.25} metalness={0.42} transparent opacity={0.92} /></mesh>)}
      <Line points={anchorPositions} color={chapter.aura} lineWidth={0.62} transparent opacity={0.28} />
    </group>;
  })}</group>;
}

function ForegroundObservatory({ selected }: { selected: LifeMapNode | null }) {
  if (selected) return null;
  return <group name="life-map-foreground-observatory" data-depth-band="near" position={[0, -1.58, 2.65]}>
    <OrganicSurface seed={71} position={[0, -0.08, 0]} scale={[4.1, 1.15, 1]} color="#071722" aura="#4d879d" opacity={0.94} depth={0.11} emissive={0.1} />
    <OrganicSurface seed={74} position={[0, 0.02, -0.24]} scale={[2.85, 0.66, 1]} color="#0c2431" aura="#75b4c8" opacity={0.72} depth={0.05} emissive={0.14} />
    <AtmosphericCurrent points={[[-3.4, 0.18, -0.22], [-1.8, 0.42, -0.4], [0, 0.32, -0.52], [1.8, 0.44, -0.4], [3.4, 0.2, -0.22]]} color={CYAN} opacity={0.14} width={0.01} />
  </group>;
}

function RelationshipObservatory({ selected }: { selected: LifeMapNode | null }) {
  if (selected) return null;
  const positions: Point3[] = [[-0.92, 0.06, 0.08], [-0.22, 0.48, -0.3], [0.5, 0.2, -0.5], [1.02, 0.36, 0.04]];
  return <group name="life-map-relationship-observatory" data-depth-band="middle" position={[5.5, 0.5, -7.05]}>{positions.map((position, index) => <mesh key={index} position={position}><dodecahedronGeometry args={[0.09 + index * 0.008, 1]} /><meshStandardMaterial color="#d9f6ff" emissive="#83dfff" emissiveIntensity={0.48} roughness={0.24} metalness={0.42} /></mesh>)}<Line points={positions} color="#a9e9ff" lineWidth={0.72} transparent opacity={0.34} /></group>;
}

function GoalHorizon({ selected }: { selected: LifeMapNode | null }) {
  if (selected) return null;
  return <group name="life-map-goal-horizon" data-depth-band="far" position={[-6.6, 2.25, -14.8]}>
    <OrganicVeil seed={91} position={[0, 0.4, 0]} rotation={[0.04, -0.18, -0.08]} scale={[0.65, 1.55, 1]} color={GOLD} opacity={0.13} />
    <AtmosphericCurrent points={[[0, -0.5, 0], [-0.08, 0, -0.08], [0.06, 0.6, -0.16], [0.22, 1.18, -0.28]]} color={PALE_GOLD} opacity={0.44} width={0.016} />
  </group>;
}

function AchievementMonument({ selected }: { selected: LifeMapNode | null }) {
  if (selected) return null;
  return <group name="life-map-achievement-monument" data-depth-band="far" position={[7, -0.1, -12.5]}>
    {[0, 1, 2].map((index) => <OrganicSurface key={index} seed={102 + index} position={[index * 0.16 - 0.16, index * 0.25 - 0.42, -index * 0.12]} rotation={[-Math.PI / 2, 0, index * 0.12]} scale={[0.72 - index * 0.08, 0.48 - index * 0.04, 1]} color={index === 2 ? "#3c3019" : "#161f27"} aura={GOLD} opacity={0.86} depth={0.1} emissive={0.18 + index * 0.07} />)}
    <AtmosphericCurrent points={[[-0.42, -0.2, 0], [-0.18, 0.2, -0.12], [0.1, 0.62, -0.24], [0.34, 1.0, -0.36]]} color={PALE_GOLD} opacity={0.35} width={0.014} />
  </group>;
}

function PrivacyVault({ selected }: { selected: LifeMapNode | null }) {
  if (selected) return null;
  return <group name="life-map-privacy-vault" data-depth-band="far" position={[-7.2, -0.55, -10]}>
    {[0, 1, 2].map((index) => <OrganicVeil key={index} seed={121 + index} position={[0, 0.05, -index * 0.12]} rotation={[0.08, index * 0.18 - 0.18, 0]} scale={[0.78 - index * 0.1, 0.92 - index * 0.08, 1]} color={index === 1 ? "#59456d" : "#211a2a"} opacity={0.15 + index * 0.035} />)}
    <mesh position={[0, 0.02, 0.1]} scale={[0.34, 0.58, 0.3]}><dodecahedronGeometry args={[0.48, 1]} /><meshPhysicalMaterial color="#03050a" emissive="#49345e" emissiveIntensity={0.18} roughness={0.22} metalness={0.84} /></mesh>
  </group>;
}

function EmotionalWeather({ reducedMotion, selected }: { reducedMotion: boolean; selected: LifeMapNode | null }) {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!group.current || reducedMotion) return;
    group.current.rotation.y = Math.sin(clock.elapsedTime * 0.03) * 0.04;
    group.current.position.y = 3 + Math.sin(clock.elapsedTime * 0.08) * 0.08;
  });
  if (selected) return null;
  return <group ref={group} name="life-map-emotional-weather" data-depth-band="far" position={[0, 3, -17]}><MemoryRibbon points={[[-8, 0.2, 0], [-4, 0.9, -1], [0, 0.3, -1.8], [4, 0.8, -1], [8, 0, 0]]} color="#69a7d1" opacity={0.08} width={0.42} emissive={0.15} /><MemoryRibbon points={[[-6, -0.45, -1], [-2.5, 0.2, -1.7], [1, -0.15, -2.2], [5.5, 0.3, -1]]} color="#a07dc2" opacity={0.055} width={0.3} emissive={0.14} /></group>;
}

function ArchiveParticles({ qualityTier, reducedMotion }: { qualityTier: SpatialQualityProfile["tier"]; reducedMotion: boolean }) {
  const particleCount = qualityTier === "low" ? 80 : qualityTier === "medium" ? 150 : 240;
  return <group name="life-map-archive-particles" data-depth-band="far"><Stars radius={52} depth={36} count={particleCount} factor={1.12} saturation={0.28} fade speed={reducedMotion ? 0 : 0.012} /></group>;
}

function nodeTemporalState(node: LifeMapNode) {
  const timestamp = node.occurredAt ? Date.parse(node.occurredAt) : Number.NaN;
  const ageDays = Number.isFinite(timestamp) ? Math.max(0, (Date.now() - timestamp) / 86_400_000) : 90;
  const tags = new Set((node.tags || []).map((tag) => tag.toLowerCase()));
  return {
    recent: ageDays <= 45 || node.dateLabel.toLowerCase().includes("now"),
    dormant: ageDays >= 180 || node.type === "legacy",
    recurring: node.type === "ritual" || tags.has("pattern") || tags.has("habit") || tags.has("recurring"),
    private: node.privacyLevel === "hidden" || node.locked === true,
  };
}

function VisualArtifact({ node, active }: ArtifactProps) {
  return <group name="life-map-artifact-visual">
    {[-0.16, 0, 0.16].map((z, index) => <OrganicVeil key={z} seed={141 + index} position={[index * 0.1 - 0.1, index * 0.08 - 0.04, z]} rotation={[0.02, index * 0.16 - 0.16, index * 0.05]} scale={[0.52 - index * 0.05, 0.36 - index * 0.025, 1]} color={index === 1 ? ICE : node.aura} opacity={active ? 0.34 : 0.17} />)}
    <pointLight color={node.aura} intensity={active ? 1.2 : 0.35} distance={2.2} />
  </group>;
}

function AudioArtifact({ node, active }: ArtifactProps) {
  const waves: Point3[][] = [-0.22, 0, 0.22].map((z, band) => Array.from({ length: 7 }, (_, index) => {
    const x = -0.42 + index * 0.14;
    return [x, Math.sin(index * 1.1 + band) * (0.12 + band * 0.025), z];
  }));
  return <group name="life-map-artifact-audio">{waves.map((points, index) => <AtmosphericCurrent key={index} points={points} color={index === 1 ? ICE : node.aura} opacity={active ? 0.72 : 0.36} width={0.018} />)}</group>;
}

function RelationshipArtifact({ node, active }: ArtifactProps) {
  const points: Point3[] = [[-0.34, -0.08, 0], [0.34, 0.04, -0.08], [0, 0.38, -0.18], [-0.34, -0.08, 0]];
  return <group name="life-map-artifact-relationship">{points.slice(0, 3).map((position, index) => <mesh key={index} position={position}><dodecahedronGeometry args={[0.12, 1]} /><meshPhysicalMaterial color="#dff8ff" emissive={node.aura} emissiveIntensity={active ? 0.88 : 0.38} roughness={0.2} /></mesh>)}<Line points={points} color={node.aura} transparent opacity={active ? 0.72 : 0.42} lineWidth={0.9} /></group>;
}

function PlaceArtifact({ node, active }: ArtifactProps) {
  return <group name="life-map-artifact-place">
    {[0, 1, 2].map((index) => <OrganicSurface key={index} seed={161 + index} position={[0, -0.2 + index * 0.08, -index * 0.04]} scale={[0.48 - index * 0.06, 0.34 - index * 0.04, 1]} color={index === 2 ? "#1e4659" : "#112b38"} aura={node.aura} opacity={0.8} depth={0.05} emissive={active ? 0.26 : 0.12} />)}
    <AtmosphericCurrent points={[[0, -0.05, 0], [-0.08, 0.2, -0.08], [0.05, 0.44, -0.16]]} color={node.aura} opacity={active ? 0.58 : 0.28} width={0.02} />
  </group>;
}

function EmotionArtifact({ node, active }: ArtifactProps) {
  return <group name="life-map-artifact-emotion">
    <mesh scale={[0.24, 0.34, 0.24]} rotation={[0.18, 0.38, 0.08]}><dodecahedronGeometry args={[0.5, 1]} /><meshPhysicalMaterial color="#fff7dc" emissive={GOLD} emissiveIntensity={active ? 1.4 : 0.62} transmission={0.16} roughness={0.16} clearcoat={0.92} /></mesh>
    {[-0.42, -0.16, 0.16, 0.42].map((x, index) => <OrganicVeil key={x} seed={181 + index} position={[x, 0.02 + Math.abs(x) * 0.22, -0.08 - index * 0.03]} rotation={[0.1, x * 0.8, index * 0.34]} scale={[0.32, 0.48, 1]} color={index % 2 ? node.aura : ICE} opacity={active ? 0.34 : 0.18} />)}
  </group>;
}

function PatternArtifact({ node, active }: ArtifactProps) {
  const bands: Point3[][] = [-0.2, 0, 0.2].map((z, band) => Array.from({ length: 7 }, (_, index) => [-0.46 + index * 0.15, Math.sin(index * 1.7 + band) * 0.12 + band * 0.04, z] as Point3));
  return <group name="life-map-artifact-pattern">{bands.map((points, index) => <MemoryRibbon key={index} points={points} color={index === 1 ? ICE : node.aura} opacity={active ? 0.54 : 0.28} width={0.045} emissive={0.34} />)}</group>;
}

function AchievementArtifact({ node, active }: ArtifactProps) {
  return <group name="life-map-artifact-achievement">
    {[0, 1, 2].map((index) => <OrganicSurface key={index} seed={201 + index} position={[index * 0.08 - 0.08, -0.22 + index * 0.16, -index * 0.05]} scale={[0.44 - index * 0.05, 0.3 - index * 0.035, 1]} color={index === 2 ? "#4b391d" : "#1e2424"} aura={GOLD} opacity={0.9} depth={0.06} emissive={active ? 0.34 : 0.16} />)}
    <AtmosphericCurrent points={[[-0.28, -0.12, 0], [-0.08, 0.12, -0.08], [0.12, 0.34, -0.16], [0.28, 0.54, -0.24]]} color={PALE_GOLD} opacity={active ? 0.62 : 0.32} width={0.018} />
  </group>;
}

function GoalArtifact({ node, active }: ArtifactProps) {
  return <group name="life-map-artifact-goal"><OrganicVeil seed={221} position={[0, 0.08, 0]} rotation={[0.05, -0.18, -0.08]} scale={[0.42, 0.72, 1]} color={PALE_GOLD} opacity={active ? 0.28 : 0.15} /><AtmosphericCurrent points={[[0, -0.32, 0], [-0.06, -0.04, -0.08], [0.08, 0.28, -0.16], [0.24, 0.58, -0.24]]} color={node.aura} opacity={active ? 0.7 : 0.36} width={0.018} /></group>;
}

function FutureArtifact({ node, active }: ArtifactProps) {
  return <group name="life-map-artifact-future">{[-0.28, 0, 0.28].map((x, index) => <OrganicVeil key={x} seed={231 + index} position={[x, 0.08 + index * 0.08, -index * 0.06]} rotation={[0.02, index * 0.2 - 0.2, 0]} scale={[0.26, 0.62 + index * 0.08, 1]} color={index === 1 ? PALE_GOLD : node.aura} opacity={active ? 0.28 : 0.14} />)}</group>;
}

function EverydayArtifact({ node, active }: ArtifactProps) {
  return <group name="life-map-artifact-everyday"><OrganicSurface seed={241} position={[0, -0.12, 0]} scale={[0.38, 0.3, 1]} color="#15303d" aura={node.aura} opacity={0.84} depth={0.07} emissive={active ? 0.28 : 0.12} /><SoftField position={[0, 0.04, -0.18]} scale={[0.46, 0.34, 1]} color={node.aura} opacity={active ? 0.12 : 0.055} /></group>;
}

function ArchiveArtifact({ node, active }: ArtifactProps) {
  return <group name="life-map-artifact-archive">{[0, 1, 2, 3].map((index) => <OrganicSurface key={index} seed={251 + index} position={[index * 0.035 - 0.05, -0.22 + index * 0.1, -index * 0.045]} scale={[0.46 - index * 0.035, 0.3 - index * 0.025, 1]} color="#141e28" aura={node.aura} opacity={0.72} depth={0.045} emissive={active ? 0.18 : 0.08} />)}</group>;
}

function ProtectedArtifact({ node, active }: ArtifactProps) {
  return <group name="life-map-artifact-protected">{[0, 1, 2].map((index) => <OrganicVeil key={index} seed={271 + index} position={[0, 0, -index * 0.08]} rotation={[0.08, index * 0.2 - 0.2, 0]} scale={[0.48 - index * 0.08, 0.58 - index * 0.06, 1]} color={index === 1 ? "#5d4b72" : "#1c1624"} opacity={(active ? 0.24 : 0.13) + index * 0.025} />)}<mesh scale={[0.22, 0.4, 0.2]}><dodecahedronGeometry args={[0.48, 1]} /><meshPhysicalMaterial color="#03050a" emissive="#49345e" emissiveIntensity={active ? 0.28 : 0.12} metalness={0.84} roughness={0.22} /></mesh></group>;
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
  const temporal = nodeTemporalState(node);
  useFrame(({ clock }, delta) => {
    if (!group.current || reducedMotion) return;
    const desired = active ? (phase === "arrival" ? 1.52 : 1.16) : related ? 0.36 : 0.62 + importance * 0.28;
    const scale = THREE.MathUtils.damp(group.current.scale.x, desired, active ? 4.8 : 3.2, delta);
    group.current.scale.setScalar(scale);
    group.current.visible = visible;
    group.current.rotation.y = Math.sin(clock.elapsedTime * (temporal.recent ? 0.18 : 0.09) + index) * (temporal.dormant ? 0.018 : 0.038);
    group.current.position.y = node.position[1] + Math.sin(clock.elapsedTime * (temporal.recent ? 0.32 : 0.18) + index) * (active ? 0.012 : temporal.dormant ? 0.016 : 0.032);
  });
  return <group ref={group} position={node.position} visible={visible} name={`life-map-artifact-${resolveArtifactFamily(node)}-${node.id}`} data-artifact-family={resolveArtifactFamily(node)} data-importance={importance.toFixed(2)} data-chapter={chapter.id} data-semantic-label={semanticLabel} data-temporal-state={temporal.recent ? "recent" : temporal.dormant ? "dormant" : "active"}>
    <group onClick={(event) => { event.stopPropagation(); onSelect(node); }} onPointerOver={() => { document.body.style.cursor = "pointer"; }} onPointerOut={() => { document.body.style.cursor = ""; }}>
      <ArtifactShape node={node} active={active} />
      {active ? <group name="life-map-selected-artifact-halo" position={[0, 0, -0.42]}><OrganicVeil seed={291} position={[0, -0.08, 0]} rotation={[0, 0, 0]} scale={[0.9, 0.72, 1]} color={node.aura} opacity={0.08} /></group> : null}
    </group>
    <pointLight color={node.aura} intensity={active ? 3.4 : related ? 0.62 : 0.22 + importance * 0.4} distance={active ? 6.5 : 3} decay={2} />
  </group>;
}

function PathPulse({ curve, color, reducedMotion, offset }: { curve: THREE.QuadraticBezierCurve3; color: string; reducedMotion: boolean; offset: number }) {
  const pulse = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!pulse.current || reducedMotion) return;
    const t = (clock.elapsedTime * 0.055 + offset) % 1;
    pulse.current.position.copy(curve.getPoint(t));
  });
  return <mesh ref={pulse} position={curve.getPoint(offset % 1)} name="life-map-living-pulse"><octahedronGeometry args={[0.035, 1]} /><meshBasicMaterial color={color} transparent opacity={0.62} /></mesh>;
}

function SemanticPath({ source, target, active, reducedMotion, index }: { source: LifeMapNode; target: LifeMapNode; active: boolean; reducedMotion: boolean; index: number }) {
  const start = useMemo(() => new THREE.Vector3(...source.position), [source.position]);
  const end = useMemo(() => new THREE.Vector3(...target.position), [target.position]);
  const curve = useMemo(() => { const middle = start.clone().lerp(end, 0.5); middle.y += Math.max(0.65, start.distanceTo(end) * 0.11); middle.z -= Math.min(1, start.distanceTo(end) * 0.05); return new THREE.QuadraticBezierCurve3(start, middle, end); }, [end, start]);
  const kind: LifeMapPathKind = resolvePathKind(source, target);
  const color = LIFE_MAP_PATH_PALETTE[kind];
  const opacity = active ? 0.42 : kind === "protected" ? 0.035 : 0.11;
  return <group data-path-kind={kind}><Line points={curve.getPoints(36)} color={color} lineWidth={active ? 1.05 : 0.46} transparent opacity={opacity} dashed={kind === "inferred" || kind === "corrected" || kind === "protected"} dashScale={1.5 + index * 0.03} />{active ? <PathPulse curve={curve} color={color} reducedMotion={reducedMotion} offset={(index * 0.19) % 1} /> : null}</group>;
}

function LivingPaths({ nodes, selected, reducedMotion, phase }: { nodes: LifeMapNode[]; selected: LifeMapNode | null; reducedMotion: boolean; phase: LifeMapJourneyPhase }) {
  const byId = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  if (selected && phase === "arrival") return null;
  return <group name="life-map-curved-semantic-paths" data-path-system="curved-semantic" data-depth-band="middle">{nodes.flatMap((source, sourceIndex) => source.connectedTo.slice(0, 3).map((targetId, targetIndex) => { const target = byId.get(targetId); if (!target || target.id < source.id) return null; const active = selected?.id === source.id || selected?.id === target.id; if (selected && !active) return null; return <SemanticPath key={`${source.id}-${target.id}`} source={source} target={target} active={active} reducedMotion={reducedMotion} index={sourceIndex * 3 + targetIndex} />; }))}</group>;
}

function SelectedRelationshipContext({ nodes, selected, reducedMotion, phase }: { nodes: LifeMapNode[]; selected: LifeMapNode | null; reducedMotion: boolean; phase: LifeMapJourneyPhase }) {
  if (!selected || phase !== "arrival") return null;
  const related = selected.connectedTo.map((id) => nodes.find((node) => node.id === id)).filter((node): node is LifeMapNode => Boolean(node)).slice(0, 3);
  return <group position={selected.position} name="life-map-selected-relationship-context" data-depth-band="middle">{related.map((node, index) => {
    const side = index % 2 === 0 ? -1 : 1;
    const end = new THREE.Vector3(side * (1.82 + index * 0.18), 0.12 + index * 0.28, -1.15 - index * 0.22);
    const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0.05, -0.34), new THREE.Vector3(end.x * 0.42, 0.48 + index * 0.12, end.z * 0.5), end);
    const color = LIFE_MAP_PATH_PALETTE[resolvePathKind(selected, node)];
    return <group key={node.id}><Line points={curve.getPoints(28)} color={color} lineWidth={0.62} transparent opacity={0.2} /><mesh position={end} name={`life-map-related-witness-${node.id}`} rotation={[0.1, index * 0.42, 0.16]}><dodecahedronGeometry args={[0.075, 1]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.42} transparent opacity={0.72} /></mesh>{!reducedMotion ? <PathPulse curve={curve} color={color} reducedMotion={false} offset={index * 0.27} /> : null}</group>;
  })}</group>;
}

function ChamberGround({ selected, opacity }: { selected: LifeMapNode; opacity: number }) {
  const family = resolveArtifactFamily(selected);
  const warm = family === "achievement" || family === "goal" || family === "future";
  const color = warm ? GOLD : selected.aura;
  return <group name="life-map-chamber-ground">
    <OrganicSurface seed={321} position={[0, -0.72, 0.15]} scale={[2.05, 1.22, 1]} color="#081923" aura={color} opacity={0.94 * opacity} depth={0.1} emissive={0.12} />
    <OrganicSurface seed={324} position={[0.08, -0.62, -0.16]} scale={[1.45, 0.82, 1]} color="#0d2936" aura={color} opacity={0.5 * opacity} depth={0.04} emissive={0.18} />
    <MemoryRibbon points={[[-1.75, -0.56, 0.66], [-0.88, -0.45, 0.22], [0, -0.5, -0.08], [0.88, -0.42, 0.22], [1.75, -0.56, 0.66]]} color={color} opacity={0.14 * opacity} width={0.11} emissive={0.28} />
  </group>;
}

function ApproachThreshold({ color, opacity }: { color: string; opacity: number }) {
  return <group name="life-map-chamber-threshold">
    <MemoryRibbon points={[[-1.55, -0.62, 1.75], [-1.02, -0.48, 1.0], [-0.58, -0.4, 0.36], [-0.26, -0.28, -0.12]]} color={color} opacity={0.28 * opacity} width={0.18} emissive={0.32} />
    <MemoryRibbon points={[[1.55, -0.62, 1.75], [1.02, -0.48, 1.0], [0.58, -0.4, 0.36], [0.26, -0.28, -0.12]]} color={ICE} opacity={0.22 * opacity} width={0.16} emissive={0.28} />
    <AtmosphericCurrent points={[[-1.26, 0.22, -1.02], [-0.72, 0.86, -1.28], [0, 1.2, -1.42], [0.72, 0.86, -1.28], [1.26, 0.22, -1.02]]} color={color} opacity={0.34 * opacity} width={0.018} />
  </group>;
}

function FamilyChamberSignature({ selected, opacity }: { selected: LifeMapNode; opacity: number }) {
  const family = resolveArtifactFamily(selected);
  const temporal = nodeTemporalState(selected);
  const aura = selected.aura;
  if (family === "relationship") return <group name="life-map-chamber-signature-relationship">
    <AtmosphericCurrent points={[[-1.4, -0.1, -1.05], [-0.72, 0.46, -1.38], [0, 0.12, -1.62], [0.72, 0.52, -1.34], [1.38, -0.08, -1.02]]} color={aura} opacity={0.3 * opacity} width={0.015} />
    <AtmosphericCurrent points={[[-1.18, 0.42, -1.12], [-0.46, 0.04, -1.48], [0.22, 0.56, -1.58], [1.12, 0.28, -1.08]]} color={ICE} opacity={0.22 * opacity} width={0.012} />
  </group>;
  if (family === "emotion") return <group name="life-map-chamber-signature-emotion">{[-0.92, -0.48, 0.48, 0.92].map((x, index) => <OrganicVeil key={x} seed={341 + index} position={[x, 0.04 + Math.abs(x) * 0.28, -1.32 - index * 0.04]} rotation={[0.08, x * 0.26, index * 0.22]} scale={[0.56, 1.15, 1]} color={index % 2 ? aura : ICE} opacity={(temporal.recent ? 0.11 : 0.075) * opacity} />)}</group>;
  if (family === "pattern") return <group name="life-map-chamber-signature-pattern">{[-0.42, 0, 0.42].map((y, index) => <MemoryRibbon key={y} points={[[-1.5, y, -1.2], [-0.76, y + 0.18, -1.5], [0, y - 0.08, -1.68], [0.76, y + 0.16, -1.48], [1.5, y, -1.18]]} color={index === 1 ? ICE : aura} opacity={0.16 * opacity} width={0.08} emissive={0.24} />)}</group>;
  if (family === "achievement" || family === "goal" || family === "future") return <group name="life-map-chamber-signature-aspiration">
    {[-0.68, 0, 0.68].map((x, index) => <OrganicVeil key={x} seed={361 + index} position={[x, 0.35 + index * 0.18, -1.42 - index * 0.08]} rotation={[0.04, index * 0.18 - 0.18, 0]} scale={[0.42, 1.35 + index * 0.18, 1]} color={index === 1 ? PALE_GOLD : aura} opacity={(0.08 + index * 0.02) * opacity} />)}
    <AtmosphericCurrent points={[[-0.62, -0.08, -1.0], [-0.2, 0.38, -1.42], [0.12, 0.96, -1.7], [0.48, 1.48, -1.94]]} color={PALE_GOLD} opacity={0.3 * opacity} width={0.014} />
  </group>;
  if (family === "protected") return <group name="life-map-chamber-signature-protected">{[0, 1, 2].map((index) => <OrganicVeil key={index} seed={381 + index} position={[0, 0.12, -1.35 - index * 0.12]} rotation={[0.08, index * 0.18 - 0.18, 0]} scale={[1.35 - index * 0.18, 1.5 - index * 0.14, 1]} color={index === 1 ? "#5b466f" : "#21192b"} opacity={(0.075 + index * 0.018) * opacity} />)}</group>;
  if (family === "archive") return <group name="life-map-chamber-signature-archive">{[0, 1, 2, 3].map((index) => <OrganicSurface key={index} seed={401 + index} position={[0, -0.18 + index * 0.2, -1.25 - index * 0.1]} rotation={[0.02, 0, index * 0.06]} scale={[1.35 - index * 0.12, 0.34 - index * 0.02, 1]} color="#101b25" aura={aura} opacity={0.42 * opacity} depth={0.04} emissive={0.08} />)}</group>;
  if (family === "audio") return <group name="life-map-chamber-signature-audio">{[-0.5, 0, 0.5].map((y, index) => <AtmosphericCurrent key={y} points={[[-1.45, y, -1.2], [-0.8, y + 0.2, -1.52], [-0.2, y - 0.12, -1.7], [0.45, y + 0.18, -1.56], [1.42, y, -1.18]]} color={index === 1 ? ICE : aura} opacity={0.22 * opacity} width={0.012} />)}</group>;
  if (family === "place") return <group name="life-map-chamber-signature-place">{[0, 1, 2].map((index) => <OrganicSurface key={index} seed={421 + index} position={[0, -0.12 + index * 0.16, -1.3 - index * 0.08]} scale={[1.38 - index * 0.14, 0.72 - index * 0.07, 1]} color="#0d2430" aura={aura} opacity={0.38 * opacity} depth={0.04} emissive={0.1} />)}</group>;
  return <group name="life-map-chamber-signature-reflection">{[-0.72, 0, 0.72].map((x, index) => <OrganicVeil key={x} seed={441 + index} position={[x, 0.12 + index * 0.1, -1.36 - index * 0.04]} rotation={[0.04, index * 0.2 - 0.2, 0]} scale={[0.54, 1.12, 1]} color={index === 1 ? ICE : aura} opacity={0.075 * opacity} />)}</group>;
}

function ArrivalSanctuary({ selected, phase, reducedMotion }: { selected: LifeMapNode | null; phase: LifeMapJourneyPhase; reducedMotion: boolean }) {
  const chamber = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!chamber.current || reducedMotion) return;
    chamber.current.rotation.y = Math.sin(clock.elapsedTime * 0.08) * 0.008;
  });
  if (!selected || (phase !== "approach" && phase !== "arrival")) return null;
  const family = resolveArtifactFamily(selected);
  const opacity = phase === "arrival" ? 1 : 0.48;
  const warm = family === "achievement" || family === "goal" || family === "future";
  const chamberColor = warm ? GOLD : selected.aura;
  return <group ref={chamber} position={selected.position} name="life-map-intimate-memory-chamber" data-scale="intimate" data-depth-band="near" data-chamber-family={family}>
    <SoftField position={[0, 0.2, -2.25]} scale={[2.8, 2.25, 1]} color="#0b2432" opacity={0.28 * opacity} />
    <SoftField position={[0, 0.26, -2.04]} scale={[1.85, 1.52, 1]} color={chamberColor} opacity={0.055 * opacity} />
    <ChamberGround selected={selected} opacity={opacity} />
    <ApproachThreshold color={chamberColor} opacity={opacity} />
    <FamilyChamberSignature selected={selected} opacity={opacity} />
    <group name="life-map-chamber-temporal-residue">{[-1.18, -0.82, 0.84, 1.18].map((x, index) => <mesh key={x} position={[x, -0.04 + index * 0.13, -1.02 - index * 0.05]} rotation={[0.1, index * 0.34, x < 0 ? -0.12 : 0.12]}><tetrahedronGeometry args={[0.055 + index * 0.006, 1]} /><meshStandardMaterial color={index % 2 ? ICE : chamberColor} emissive={chamberColor} emissiveIntensity={0.28 * opacity} transparent opacity={0.42 * opacity} /></mesh>)}</group>
    <pointLight color={chamberColor} intensity={phase === "arrival" ? 2.8 : 1.0} distance={6.5} decay={2} position={[0, 0.2, 0.8]} />
    <pointLight color={ICE} intensity={phase === "arrival" ? 0.72 : 0.24} distance={4.5} decay={2} position={[0, 1.25, -1.05]} />
  </group>;
}

export function LifeMapProductionWorld({ nodes, selected, phase, profile, onSelect, cameraRig, webglRecovery }: { nodes: LifeMapNode[]; selected: LifeMapNode | null; phase: LifeMapJourneyPhase; profile: SpatialQualityProfile; onSelect: (node: LifeMapNode) => void; cameraRig: ReactNode; webglRecovery: ReactNode }) {
  const { size } = useThree();
  const qualityTier = profile.tier;
  const starCount = profile.tier === "low" ? 420 : profile.tier === "medium" ? 760 : 1160;
  const portrait = size.height > size.width;
  const stageScale: Point3 = selected ? (portrait ? [0.9, 0.94, 0.9] : [1.12, 1.12, 1.08]) : portrait ? [0.46, 0.9, 0.72] : [1.12, 1.1, 1.04];
  const stagePosition: Point3 = selected ? (portrait ? [0, -0.08, 0.9] : [0, -0.16, 0.62]) : portrait ? [0, -0.36, 1.3] : [0, -0.28, 1.18];
  return <>
    <color attach="background" args={[DEEP]} /><fog attach="fog" args={[DEEP, 16, 72]} />
    <ambientLight intensity={0.5} color="#b7eaff" /><directionalLight position={[7, 10, 8]} intensity={1.35} color="#d8f4ff" castShadow={profile.shadows} /><hemisphereLight args={["#c8f3ff", "#02040a", 0.56]} />
    {webglRecovery}{cameraRig}<AuthoredEnvironment selected={selected} /><TemporalHorizon selected={selected} />
    <group name="life-map-world-stage" scale={stageScale} position={stagePosition}>
      <TemporalLandscape selected={selected} /><LifeCore reducedMotion={profile.reducedMotion} tier={profile.tier} hidden={Boolean(selected)} /><LightBridges selected={selected} /><ChapterConstellations selected={selected} /><ForegroundObservatory selected={selected} /><RelationshipObservatory selected={selected} /><GoalHorizon selected={selected} /><AchievementMonument selected={selected} /><PrivacyVault selected={selected} /><EmotionalWeather reducedMotion={profile.reducedMotion} selected={selected} />
      <LivingPaths nodes={nodes} selected={selected} reducedMotion={profile.reducedMotion} phase={phase} />
      <group name="life-map-memory-artifact-families" data-depth-band="middle">{nodes.map((node, index) => <MemoryArtifact key={node.id} node={node} index={index} selected={selected} phase={phase} reducedMotion={profile.reducedMotion} onSelect={onSelect} />)}</group>
      <SelectedRelationshipContext nodes={nodes} selected={selected} reducedMotion={profile.reducedMotion} phase={phase} /><ArrivalSanctuary selected={selected} phase={phase} reducedMotion={profile.reducedMotion} />
    </group>
    <ArchiveParticles qualityTier={qualityTier} reducedMotion={profile.reducedMotion} /><group name="life-map-far-future-horizon" data-depth-band="far"><Stars radius={78} depth={58} count={starCount} factor={1.42} saturation={0.22} fade speed={profile.reducedMotion ? 0 : 0.018} /></group>
    <CinematicPostProcessing active={profile.postprocessing} reducedMotion={profile.reducedMotion} />
  </>;
}
