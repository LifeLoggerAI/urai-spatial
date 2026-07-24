"use client";

import { Html, Line, Stars } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import CinematicPostProcessing from "@/spatial/cinematic/CinematicPostProcessing";
import type { SpatialQualityProfile } from "@/spatial/performance/useAdaptiveSpatialQuality";
import type { LifeMapNode } from "./lifeMapData";
import {
  LIFE_MAP_CHAPTERS,
  LIFE_MAP_PATH_PALETTE,
  artifactFamilyLabel,
  artifactImportance,
  chapterForNode,
  chapterVisibility,
  resolveArtifactFamily,
  resolvePathKind,
  type LifeMapArtifactFamily,
} from "./lifeMapVisualSystem";

export type LifeMapJourneyPhase = "overview" | "departure" | "travel" | "approach" | "arrival";

const WHITE_GOLD = "#ffe8aa";
const MOON_CYAN = "#9eeaff";
const GLASS_STONE = "#07111d";

function useBreathingMotion(ref: React.RefObject<THREE.Group | null>, speed: number, amount: number, reducedMotion: boolean, seed = 0) {
  useFrame(({ clock }, delta) => {
    const target = reducedMotion ? 1 : 1 + Math.sin(clock.elapsedTime * speed + seed) * amount;
    if (!ref.current) return;
    const next = THREE.MathUtils.damp(ref.current.scale.x, target, 3.8, delta);
    ref.current.scale.setScalar(next);
  });
}

function LifeCore({ reducedMotion, qualityTier }: { reducedMotion: boolean; qualityTier: SpatialQualityProfile["tier"] }) {
  const core = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Group>(null);
  useBreathingMotion(core, 0.42, 0.035, reducedMotion);
  useFrame(({ clock }) => {
    if (!inner.current || reducedMotion) return;
    inner.current.rotation.y = clock.elapsedTime * 0.075;
    inner.current.rotation.x = Math.sin(clock.elapsedTime * 0.18) * 0.08;
  });
  return <group ref={core} name="life-map-white-gold-life-core" position={[0, 0.25, -4.2]} data-life-core="white-gold-layered">
    <mesh castShadow receiveShadow>
      <sphereGeometry args={[1.05, qualityTier === "low" ? 32 : 64, qualityTier === "low" ? 20 : 40]} />
      <meshPhysicalMaterial color="#fff2c8" emissive={WHITE_GOLD} emissiveIntensity={1.35} roughness={0.16} metalness={0.18} transmission={0.34} thickness={1.4} transparent opacity={0.96} />
    </mesh>
    <group ref={inner}>
      <mesh rotation={[0.7, 0.4, 0.25]}>
        <icosahedronGeometry args={[0.7, qualityTier === "high" ? 3 : 2]} />
        <meshStandardMaterial color="#fff9e8" emissive="#ffc96a" emissiveIntensity={2.1} roughness={0.28} metalness={0.3} wireframe />
      </mesh>
      <mesh rotation={[-0.35, 0.9, -0.2]}>
        <octahedronGeometry args={[0.48, 2]} />
        <meshPhysicalMaterial color="#ffffff" emissive="#fff0b8" emissiveIntensity={2.4} roughness={0.08} metalness={0.12} transmission={0.48} transparent opacity={0.78} />
      </mesh>
    </group>
    <mesh rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[1.52, 0.035, 16, qualityTier === "low" ? 72 : 128]} />
      <meshStandardMaterial color="#e8d39d" emissive={WHITE_GOLD} emissiveIntensity={1.5} roughness={0.22} metalness={0.82} />
    </mesh>
    <mesh rotation={[Math.PI / 2.35, 0.35, 0.2]}>
      <torusGeometry args={[1.82, 0.018, 12, qualityTier === "low" ? 64 : 120]} />
      <meshBasicMaterial color={MOON_CYAN} transparent opacity={0.36} depthWrite={false} />
    </mesh>
    <pointLight color={WHITE_GOLD} intensity={qualityTier === "low" ? 7 : 12} distance={18} decay={2} />
    <pointLight color={MOON_CYAN} intensity={qualityTier === "low" ? 2 : 4} distance={24} decay={2} position={[0, 2, 1]} />
  </group>;
}

function ChapterArc({ chapter, selected, reducedMotion }: { chapter: (typeof LIFE_MAP_CHAPTERS)[number]; selected: LifeMapNode | null; reducedMotion: boolean }) {
  const group = useRef<THREE.Group>(null);
  const visibility = chapterVisibility(chapter, selected);
  const curve = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const segments = 36;
    for (let index = 0; index <= segments; index += 1) {
      const angle = -chapter.arc / 2 + (chapter.arc * index) / segments;
      points.push(new THREE.Vector3(Math.cos(angle) * chapter.radius, Math.sin(angle) * chapter.radius * 0.34, Math.sin(angle * 0.55) * 0.62));
    }
    return new THREE.CatmullRomCurve3(points);
  }, [chapter]);
  useFrame(({ clock }) => {
    if (!group.current || reducedMotion) return;
    group.current.rotation.y = chapter.rotation[1] + Math.sin(clock.elapsedTime * 0.07 + chapter.radius) * 0.025;
  });
  return <group ref={group} name={`life-map-chapter-${chapter.id}`} position={chapter.position} rotation={chapter.rotation} data-chapter-region={chapter.id}>
    <mesh>
      <tubeGeometry args={[curve, 64, 0.08, 8, false]} />
      <meshStandardMaterial color={chapter.aura} emissive={chapter.aura} emissiveIntensity={0.52 * visibility} roughness={0.26} metalness={0.76} transparent opacity={0.78 * visibility} />
    </mesh>
    <mesh position={[0, -0.55, -0.22]} scale={[chapter.radius * 0.92, 0.18, 1.28]}>
      <cylinderGeometry args={[1, 1.12, 0.36, 48, 1, false, 0.2, chapter.arc + 0.25]} />
      <meshPhysicalMaterial color={GLASS_STONE} emissive={chapter.aura} emissiveIntensity={0.11} roughness={0.18} metalness={0.74} transmission={0.08} transparent opacity={0.86 * visibility} />
    </mesh>
    <mesh position={[0, -0.22, -0.5]} scale={[chapter.radius * 0.72, 0.08, 0.9]}>
      <cylinderGeometry args={[1, 1, 0.16, 32]} />
      <meshStandardMaterial color="#0b1b29" emissive={chapter.aura} emissiveIntensity={0.08} roughness={0.4} metalness={0.55} transparent opacity={0.7 * visibility} />
    </mesh>
    <Html position={[0, 0.82, 0]} center distanceFactor={14} occlude="blending">
      <span className="life-map-chapter-label" data-muted={visibility < 0.5 ? "true" : "false"}>{chapter.title}</span>
    </Html>
  </group>;
}

function VisualArtifact({ color }: { color: string }) {
  return <group>
    <mesh rotation={[0.35, 0.7, 0.1]}>
      <boxGeometry args={[0.86, 0.62, 0.12]} />
      <meshPhysicalMaterial color="#d7f6ff" emissive={color} emissiveIntensity={0.44} roughness={0.08} metalness={0.32} transmission={0.52} transparent opacity={0.86} />
    </mesh>
    <mesh position={[0.1, 0.04, 0.12]} rotation={[0.35, 0.7, 0.1]}>
      <planeGeometry args={[0.56, 0.34]} />
      <meshBasicMaterial color={color} transparent opacity={0.42} depthWrite={false} />
    </mesh>
  </group>;
}

function AudioArtifact({ color }: { color: string }) {
  return <group rotation={[0, 0.2, 0]}>
    {[-0.36, -0.18, 0, 0.18, 0.36].map((x, index) => <mesh key={x} position={[x, 0, 0]} scale={[1, 0.55 + Math.abs(2 - index) * 0.22, 1]}>
      <capsuleGeometry args={[0.055, 0.48, 8, 16]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} roughness={0.24} metalness={0.54} />
    </mesh>)}
  </group>;
}

function RelationshipArtifact({ color }: { color: string }) {
  return <group>
    <mesh position={[-0.28, 0.06, 0]}><octahedronGeometry args={[0.32, 1]} /><meshPhysicalMaterial color="#e9f8ff" emissive={color} emissiveIntensity={0.75} roughness={0.1} transmission={0.25} /></mesh>
    <mesh position={[0.28, -0.06, 0]}><octahedronGeometry args={[0.27, 1]} /><meshPhysicalMaterial color="#f6fbff" emissive={color} emissiveIntensity={0.6} roughness={0.12} transmission={0.22} /></mesh>
    <Line points={[[-0.1, 0.03, 0], [0.1, -0.03, 0]]} color={color} transparent opacity={0.9} lineWidth={1.7} />
  </group>;
}

function PlaceArtifact({ color }: { color: string }) {
  return <group>
    <mesh position={[0, -0.18, 0]}><cylinderGeometry args={[0.52, 0.68, 0.14, 6]} /><meshStandardMaterial color={GLASS_STONE} emissive={color} emissiveIntensity={0.2} roughness={0.34} metalness={0.72} /></mesh>
    <mesh position={[-0.18, 0.08, 0]}><boxGeometry args={[0.28, 0.38, 0.28]} /><meshStandardMaterial color="#1c3950" emissive={color} emissiveIntensity={0.28} roughness={0.42} metalness={0.45} /></mesh>
    <mesh position={[0.18, 0.16, -0.06]}><coneGeometry args={[0.24, 0.58, 5]} /><meshStandardMaterial color="#244d63" emissive={color} emissiveIntensity={0.24} roughness={0.36} metalness={0.5} /></mesh>
  </group>;
}

function EmotionArtifact({ color }: { color: string }) {
  return <group>
    <mesh rotation={[0.4, 0.5, 0.2]}><dodecahedronGeometry args={[0.48, 1]} /><meshPhysicalMaterial color={color} emissive={color} emissiveIntensity={0.74} roughness={0.26} transmission={0.28} transparent opacity={0.82} /></mesh>
    <mesh scale={1.22} rotation={[-0.3, 0.2, 0.5]}><icosahedronGeometry args={[0.48, 1]} /><meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.2} depthWrite={false} /></mesh>
  </group>;
}

function PatternArtifact({ color }: { color: string }) {
  return <group>
    {[0, 1, 2].map((index) => <mesh key={index} position={[0, index * 0.14 - 0.14, index * -0.07]} rotation={[Math.PI / 2, index * 0.35, index * 0.18]} scale={1 - index * 0.16}>
      <torusKnotGeometry args={[0.3, 0.045, 72, 8, 2, 3]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.48} roughness={0.26} metalness={0.72} />
    </mesh>)}
  </group>;
}

function AchievementArtifact({ color }: { color: string }) {
  return <group>
    <mesh position={[0, -0.26, 0]}><cylinderGeometry args={[0.34, 0.46, 0.2, 8]} /><meshStandardMaterial color="#171d24" emissive={color} emissiveIntensity={0.18} roughness={0.2} metalness={0.86} /></mesh>
    <mesh position={[0, 0.08, 0]}><octahedronGeometry args={[0.46, 2]} /><meshPhysicalMaterial color="#fff3c9" emissive={color} emissiveIntensity={1.1} roughness={0.12} metalness={0.45} transmission={0.14} /></mesh>
    <mesh position={[0, 0.02, 0]} scale={1.18}><octahedronGeometry args={[0.46, 0]} /><meshBasicMaterial color="#fff7df" wireframe transparent opacity={0.46} /></mesh>
  </group>;
}

function GoalArtifact({ color, future = false }: { color: string; future?: boolean }) {
  return <group>
    {[[-0.36, -0.24], [0, 0.04], [0.36, 0.28]].map(([x, y], index) => <mesh key={index} position={[x, y, index * -0.08]}>
      <boxGeometry args={[0.12, 0.72 - index * 0.08, 0.12]} />
      <meshStandardMaterial color={future ? "#38385f" : "#514522"} emissive={color} emissiveIntensity={future ? 0.42 : 0.7} roughness={0.24} metalness={0.82} transparent opacity={future ? 0.64 : 0.9} />
    </mesh>)}
    <Line points={[[-0.48, -0.58, 0], [0, -0.16, -0.06], [0.48, 0.52, -0.16]]} color={color} lineWidth={2.2} transparent opacity={0.9} />
  </group>;
}

function EverydayArtifact({ color }: { color: string }) {
  return <group>
    {[[0, 0, 0], [0.28, 0.08, -0.12], [-0.24, -0.12, 0.08], [0.08, -0.28, -0.08]].map((position, index) => <mesh key={index} position={position as [number, number, number]}>
      <tetrahedronGeometry args={[0.18 + index * 0.018, 1]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.28} roughness={0.38} metalness={0.46} />
    </mesh>)}
  </group>;
}

function ArchiveArtifact({ color }: { color: string }) {
  return <group>
    {[0, 1, 2, 3].map((index) => <mesh key={index} position={[0, index * 0.15 - 0.22, index * -0.05]} rotation={[0, index * 0.16, 0]} scale={[1 - index * 0.12, 1, 1 - index * 0.12]}>
      <cylinderGeometry args={[0.4, 0.48, 0.09, 10]} />
      <meshStandardMaterial color={index % 2 ? "#0b1d2c" : "#13293a"} emissive={color} emissiveIntensity={0.12 + index * 0.04} roughness={0.4} metalness={0.64} />
    </mesh>)}
  </group>;
}

function ProtectedArtifact({ color }: { color: string }) {
  return <group>
    <mesh><boxGeometry args={[0.78, 0.68, 0.62]} /><meshPhysicalMaterial color="#06080f" emissive="#3d3155" emissiveIntensity={0.24} roughness={0.18} metalness={0.82} transmission={0.02} /></mesh>
    <mesh position={[0, 0.02, 0.33]}><octahedronGeometry args={[0.24, 1]} /><meshStandardMaterial color="#171027" emissive={color} emissiveIntensity={0.3} roughness={0.3} metalness={0.68} /></mesh>
    <mesh scale={1.16}><boxGeometry args={[0.78, 0.68, 0.62]} /><meshBasicMaterial color={color} wireframe transparent opacity={0.18} /></mesh>
  </group>;
}

function ArtifactGeometry({ family, color }: { family: LifeMapArtifactFamily; color: string }) {
  if (family === "visual") return <VisualArtifact color={color} />;
  if (family === "audio") return <AudioArtifact color={color} />;
  if (family === "relationship") return <RelationshipArtifact color={color} />;
  if (family === "place") return <PlaceArtifact color={color} />;
  if (family === "emotion") return <EmotionArtifact color={color} />;
  if (family === "pattern") return <PatternArtifact color={color} />;
  if (family === "achievement") return <AchievementArtifact color={color} />;
  if (family === "goal") return <GoalArtifact color={color} />;
  if (family === "future") return <GoalArtifact color={color} future />;
  if (family === "archive") return <ArchiveArtifact color={color} />;
  if (family === "protected") return <ProtectedArtifact color={color} />;
  return <EverydayArtifact color={color} />;
}

function MemoryArtifact({ node, index, selected, phase, reducedMotion, onSelect }: { node: LifeMapNode; index: number; selected: LifeMapNode | null; phase: LifeMapJourneyPhase; reducedMotion: boolean; onSelect: (node: LifeMapNode) => void }) {
  const group = useRef<THREE.Group>(null);
  const family = resolveArtifactFamily(node);
  const importance = artifactImportance(node);
  const active = selected?.id === node.id;
  const related = Boolean(selected && (selected.connectedTo.includes(node.id) || node.connectedTo.includes(selected.id)));
  const muted = Boolean(selected && !active && !related);
  const chapter = chapterForNode(node, index);
  useFrame(({ clock }, delta) => {
    if (!group.current) return;
    const activeScale = active ? (phase === "arrival" ? 1.72 : 1.36) : muted ? 0.72 : 0.9 + importance * 0.36;
    const nextScale = THREE.MathUtils.damp(group.current.scale.x, activeScale, active ? 5.4 : 3.8, delta);
    group.current.scale.setScalar(nextScale);
    if (!reducedMotion) {
      group.current.rotation.y = Math.sin(clock.elapsedTime * 0.18 + index * 0.7) * 0.16;
      group.current.position.y = node.position[1] + Math.sin(clock.elapsedTime * 0.34 + index) * (active ? 0.035 : 0.075);
    }
  });
  return <group
    ref={group}
    position={node.position}
    name={`life-map-artifact-${family}-${node.id}`}
    data-artifact-family={family}
    data-importance={importance.toFixed(2)}
    data-chapter={chapter.id}
  >
    <group
      onClick={(event) => { event.stopPropagation(); onSelect(node); }}
      onPointerOver={() => { document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { document.body.style.cursor = ""; }}
    >
      <ArtifactGeometry family={family} color={node.aura} />
    </group>
    <pointLight color={node.aura} intensity={active ? 4.4 : related ? 2 : 0.8 + importance} distance={active ? 7 : 3.2} decay={2} />
    {(active || (!muted && importance > 0.62)) ? <Html position={[0, 0.92, 0]} center distanceFactor={11} occlude="blending">
      <button className="life-map-world-label" data-active={active ? "true" : "false"} data-family={family} onClick={() => onSelect(node)}>
        <strong>{node.locked ? "Protected memory" : node.title}</strong>
        <span>{node.locked ? "Private · sealed" : `${artifactFamilyLabel(node)} · ${node.dateLabel}`}</span>
      </button>
    </Html> : null}
  </group>;
}

function SemanticPath({ source, target, active, reducedMotion }: { source: LifeMapNode; target: LifeMapNode; active: boolean; reducedMotion: boolean }) {
  const kind = resolvePathKind(source, target);
  const color = LIFE_MAP_PATH_PALETTE[kind];
  const points = useMemo(() => {
    const start = new THREE.Vector3(...source.position);
    const end = new THREE.Vector3(...target.position);
    const middle = start.clone().lerp(end, 0.5);
    middle.y += Math.max(0.5, start.distanceTo(end) * 0.18);
    middle.z -= 0.5;
    return new THREE.QuadraticBezierCurve3(start, middle, end).getPoints(28);
  }, [source.position, target.position]);
  return <Line
    points={points}
    color={color}
    lineWidth={active ? 2.4 : 0.9}
    transparent
    opacity={kind === "protected" ? 0.12 : active ? 0.84 : 0.22}
    dashed={kind === "inferred" || kind === "corrected" || kind === "protected"}
    dashScale={reducedMotion ? 1 : active ? 2.6 : 1.4}
    dashSize={kind === "corrected" ? 0.12 : 0.2}
    gapSize={kind === "protected" ? 0.3 : 0.14}
  />;
}

function LivingPaths({ nodes, selected, reducedMotion }: { nodes: LifeMapNode[]; selected: LifeMapNode | null; reducedMotion: boolean }) {
  const byId = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  return <group name="life-map-curved-semantic-paths" data-path-system="curved-semantic">
    {nodes.flatMap((node) => node.connectedTo.slice(0, 3).map((targetId) => {
      const target = byId.get(targetId);
      if (!target || target.id < node.id) return null;
      const active = selected?.id === node.id || selected?.id === target.id;
      return <SemanticPath key={`${node.id}-${target.id}`} source={node} target={target} active={active} reducedMotion={reducedMotion} />;
    }))}
  </group>;
}

function GoalHorizon({ reducedMotion }: { reducedMotion: boolean }) {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!group.current || reducedMotion) return;
    group.current.rotation.y = Math.sin(clock.elapsedTime * 0.045) * 0.025;
  });
  return <group ref={group} name="life-map-goal-horizon" position={[7.4, 0.15, -13.4]} rotation={[0.05, -0.24, -0.04]}>
    {[0, 1, 2, 3].map((index) => <mesh key={index} position={[index * 0.62 - 0.92, index * 0.4 - 0.2, -index * 0.42]}>
      <boxGeometry args={[0.18, 1.5 + index * 0.5, 0.18]} />
      <meshStandardMaterial color="#292515" emissive="#f3d28d" emissiveIntensity={0.48 + index * 0.08} roughness={0.2} metalness={0.86} />
    </mesh>)}
    <Line points={[[-1.2, -0.8, 0], [-0.2, 0.1, -0.4], [0.8, 1.1, -1], [1.8, 2.2, -1.8]]} color="#f6d993" lineWidth={2.2} transparent opacity={0.66} />
  </group>;
}

function AchievementMonument() {
  return <group name="life-map-achievement-monument" position={[-7.1, -1.35, -8.2]} rotation={[0.05, 0.3, 0.02]}>
    <mesh position={[0, -0.55, 0]}><cylinderGeometry args={[1.05, 1.3, 0.32, 8]} /><meshStandardMaterial color="#111923" emissive="#d9b875" emissiveIntensity={0.15} roughness={0.22} metalness={0.84} /></mesh>
    <mesh position={[0, 0.15, 0]}><octahedronGeometry args={[0.88, 2]} /><meshPhysicalMaterial color="#fff2c4" emissive="#f5cd72" emissiveIntensity={1.35} roughness={0.14} metalness={0.46} transmission={0.12} /></mesh>
    <mesh position={[0, 0.15, 0]} scale={1.22}><octahedronGeometry args={[0.88, 0]} /><meshBasicMaterial color="#fff7df" wireframe transparent opacity={0.34} /></mesh>
    <pointLight color="#f7d790" intensity={4} distance={8} decay={2} />
  </group>;
}

function PrivacyVault() {
  return <group name="life-map-privacy-vault" position={[-5.8, 0.15, -12.2]} rotation={[0.12, -0.4, -0.06]} data-privacy-region="sealed">
    <mesh><dodecahedronGeometry args={[1.25, 1]} /><meshPhysicalMaterial color="#05060b" emissive="#30243f" emissiveIntensity={0.16} roughness={0.18} metalness={0.86} transmission={0.01} /></mesh>
    <mesh scale={1.18}><dodecahedronGeometry args={[1.25, 0]} /><meshBasicMaterial color="#8d74ad" wireframe transparent opacity={0.18} /></mesh>
    <mesh position={[0, 0, 1.06]}><boxGeometry args={[0.44, 0.62, 0.1]} /><meshStandardMaterial color="#14101f" emissive="#6f5a8d" emissiveIntensity={0.24} metalness={0.72} roughness={0.24} /></mesh>
  </group>;
}

function EmotionalWeather({ selected, reducedMotion }: { selected: LifeMapNode | null; reducedMotion: boolean }) {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!group.current || reducedMotion) return;
    group.current.position.x = 2.7 + Math.sin(clock.elapsedTime * 0.06) * 0.45;
    group.current.rotation.y = clock.elapsedTime * 0.018;
  });
  const color = selected?.type === "threshold" ? "#d46ba8" : selected?.type === "recovery" ? "#6ebbd2" : "#6b5d9a";
  return <group ref={group} name="life-map-emotional-weather" position={[2.7, 2.8, -9.6]}>
    {[[0, 0, 0], [0.9, -0.2, -0.4], [-0.8, 0.18, -0.55], [0.2, 0.45, -0.9]].map((position, index) => <mesh key={index} position={position as [number, number, number]} scale={[2.5 - index * 0.25, 0.75, 1.2]}>
      <dodecahedronGeometry args={[1, 1]} />
      <meshBasicMaterial color={color} transparent opacity={0.045 + index * 0.012} depthWrite={false} blending={THREE.AdditiveBlending} />
    </mesh>)}
  </group>;
}

function ArchiveDepth({ qualityTier, reducedMotion }: { qualityTier: SpatialQualityProfile["tier"]; reducedMotion: boolean }) {
  const count = qualityTier === "low" ? 80 : qualityTier === "medium" ? 160 : 260;
  const positions = useMemo(() => {
    const data = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      const radius = 7 + (index % 31) * 0.46;
      const angle = index * 2.399963;
      data[index * 3] = Math.cos(angle) * radius;
      data[index * 3 + 1] = Math.sin(angle * 0.7) * 4.8;
      data[index * 3 + 2] = -8 - (index % 23) * 1.15;
    }
    return data;
  }, [count]);
  const points = useRef<THREE.Points>(null);
  useFrame(({ clock }) => {
    if (!points.current || reducedMotion) return;
    points.current.rotation.y = clock.elapsedTime * 0.004;
  });
  return <points ref={points} name="life-map-archive-particles">
    <bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry>
    <pointsMaterial color="#a9dcf0" size={0.035} transparent opacity={0.42} depthWrite={false} sizeAttenuation />
  </points>;
}

function ArrivalChamber({ selected, phase }: { selected: LifeMapNode | null; phase: LifeMapJourneyPhase }) {
  if (!selected || (phase !== "approach" && phase !== "arrival")) return null;
  const opacity = phase === "arrival" ? 0.72 : 0.34;
  return <group position={selected.position} name="life-map-intimate-memory-chamber" data-scale="intimate">
    {[0, 1, 2, 3, 4, 5].map((index) => {
      const angle = (index / 6) * Math.PI * 2;
      return <mesh key={index} position={[Math.cos(angle) * 1.55, Math.sin(angle) * 0.46, Math.sin(angle) * 1.55]} rotation={[0, -angle, 0]}>
        <boxGeometry args={[0.14, 1.5, 0.48]} />
        <meshStandardMaterial color="#0b1824" emissive={selected.aura} emissiveIntensity={0.18} roughness={0.22} metalness={0.82} transparent opacity={opacity} />
      </mesh>;
    })}
    <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.78, 0]}>
      <cylinderGeometry args={[1.7, 1.9, 0.14, 48]} />
      <meshPhysicalMaterial color={GLASS_STONE} emissive={selected.aura} emissiveIntensity={0.12} roughness={0.18} metalness={0.78} transmission={0.08} transparent opacity={opacity} />
    </mesh>
    <pointLight color={selected.aura} intensity={phase === "arrival" ? 5 : 2.4} distance={7} decay={2} />
  </group>;
}

export function LifeMapProductionWorld({
  nodes,
  selected,
  phase,
  profile,
  onSelect,
  cameraRig,
  webglRecovery,
}: {
  nodes: LifeMapNode[];
  selected: LifeMapNode | null;
  phase: LifeMapJourneyPhase;
  profile: SpatialQualityProfile;
  onSelect: (node: LifeMapNode) => void;
  cameraRig: React.ReactNode;
  webglRecovery: React.ReactNode;
}) {
  return <>
    <color attach="background" args={["#02050b"]} />
    <fog attach="fog" args={["#02050b", 10, 48]} />
    <ambientLight intensity={0.22} color="#9fdfff" />
    <directionalLight position={[5, 9, 8]} intensity={1.65} color="#d8f5ff" castShadow={profile.shadows} />
    <hemisphereLight args={["#bdeeff", "#05070d", 0.42]} />
    {webglRecovery}
    {cameraRig}
    <LifeCore reducedMotion={profile.reducedMotion} qualityTier={profile.tier} />
    <group name="life-map-authored-chapter-regions" data-scale="cosmic-overview">
      {LIFE_MAP_CHAPTERS.map((chapter) => <ChapterArc key={chapter.id} chapter={chapter} selected={selected} reducedMotion={profile.reducedMotion} />)}
    </group>
    <LivingPaths nodes={nodes} selected={selected} reducedMotion={profile.reducedMotion} />
    <group name="life-map-memory-artifact-families">
      {nodes.map((node, index) => <MemoryArtifact key={node.id} node={node} index={index} selected={selected} phase={phase} reducedMotion={profile.reducedMotion} onSelect={onSelect} />)}
    </group>
    <AchievementMonument />
    <GoalHorizon reducedMotion={profile.reducedMotion} />
    <PrivacyVault />
    <EmotionalWeather selected={selected} reducedMotion={profile.reducedMotion} />
    <ArchiveDepth qualityTier={profile.tier} reducedMotion={profile.reducedMotion} />
    <ArrivalChamber selected={selected} phase={phase} />
    <group name="life-map-far-future-horizon"><Stars radius={74} depth={54} count={profile.tier === "low" ? 420 : profile.tier === "medium" ? 760 : 1200} factor={2.1} saturation={0.18} fade speed={profile.reducedMotion ? 0 : 0.04} /></group>
    <CinematicPostProcessing active={profile.postprocessing} reducedMotion={profile.reducedMotion} />
  </>;
}
