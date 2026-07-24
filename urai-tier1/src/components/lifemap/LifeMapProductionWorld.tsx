"use client";

import { Html, Line, Stars } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, type ReactNode, type RefObject } from "react";
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
  chapterVisibility,
  resolveArtifactFamily,
  resolvePathKind,
  type LifeMapArtifactFamily,
} from "./lifeMapVisualSystem";

export type LifeMapJourneyPhase = "overview" | "departure" | "travel" | "approach" | "arrival";

const WHITE_GOLD = "#ffe2a0";
const PALE_GOLD = "#fff4cf";
const MOON_CYAN = "#8cecff";
const GLASS_STONE = "#06101c";
const DEEP_GLASS = "#020610";

function useBreathingMotion(ref: RefObject<THREE.Group | null>, speed: number, amount: number, reducedMotion: boolean, seed = 0) {
  useFrame(({ clock }, delta) => {
    if (!ref.current) return;
    const target = reducedMotion ? 1 : 1 + Math.sin(clock.elapsedTime * speed + seed) * amount;
    const next = THREE.MathUtils.damp(ref.current.scale.x, target, 3.8, delta);
    ref.current.scale.setScalar(next);
  });
}

function ribbonCurve(radius: number, lift: number, phase: number) {
  const points: THREE.Vector3[] = [];
  for (let index = 0; index < 40; index += 1) {
    const angle = (index / 39) * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle * 2 + phase) * lift, Math.sin(angle) * radius * 0.5));
  }
  return new THREE.CatmullRomCurve3(points, true, "catmullrom", 0.3);
}

function OrbitalRibbon({ radius, lift, phase, color, width, opacity = 0.72 }: { radius: number; lift: number; phase: number; color: string; width: number; opacity?: number }) {
  const curve = useMemo(() => ribbonCurve(radius, lift, phase), [lift, phase, radius]);
  return <mesh rotation={[0.18 + phase * 0.06, phase * 0.22, -0.12 + phase * 0.04]}>
    <tubeGeometry args={[curve, 112, width, 8, true]} />
    <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.1} roughness={0.18} metalness={0.82} transparent opacity={opacity} />
  </mesh>;
}

function LifeCore({ reducedMotion, qualityTier }: { reducedMotion: boolean; qualityTier: SpatialQualityProfile["tier"] }) {
  const core = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Group>(null);
  useBreathingMotion(core, 0.36, 0.025, reducedMotion);
  const corona = useMemo(() => {
    const count = qualityTier === "low" ? 120 : qualityTier === "medium" ? 220 : 360;
    const positions = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      const phi = Math.acos(1 - 2 * ((index + 0.5) / count));
      const theta = Math.PI * (1 + Math.sqrt(5)) * index;
      const radius = 1.9 + (index % 11) * 0.035;
      positions[index * 3] = Math.sin(phi) * Math.cos(theta) * radius;
      positions[index * 3 + 1] = Math.cos(phi) * radius;
      positions[index * 3 + 2] = Math.sin(phi) * Math.sin(theta) * radius;
    }
    return positions;
  }, [qualityTier]);
  useFrame(({ clock }) => {
    if (!inner.current || reducedMotion) return;
    inner.current.rotation.y = clock.elapsedTime * 0.055;
    inner.current.rotation.x = Math.sin(clock.elapsedTime * 0.12) * 0.05;
  });
  return <group ref={core} name="life-map-white-gold-life-core" position={LIFE_MAP_CORE_POSITION} scale={1.18} data-life-core="white-gold-layered">
    <mesh position={[0, -2.2, 0]}><cylinderGeometry args={[0.26, 0.62, 4.4, 32, 1, true]} /><meshBasicMaterial color={WHITE_GOLD} transparent opacity={0.12} depthWrite={false} blending={THREE.AdditiveBlending} /></mesh>
    <group ref={inner}>
      <mesh castShadow receiveShadow rotation={[0.28, 0.45, 0.1]}><dodecahedronGeometry args={[1.2, qualityTier === "low" ? 1 : 2]} /><meshPhysicalMaterial color="#fff7df" emissive={WHITE_GOLD} emissiveIntensity={1.3} roughness={0.14} metalness={0.28} transmission={0.2} thickness={1.8} /></mesh>
      <mesh scale={0.84} rotation={[-0.5, 0.2, 0.82]}><icosahedronGeometry args={[1.05, qualityTier === "high" ? 2 : 1]} /><meshStandardMaterial color="#fffdf8" emissive="#ffc85f" emissiveIntensity={2.1} roughness={0.2} metalness={0.42} wireframe /></mesh>
      <mesh scale={0.5} rotation={[0.7, -0.3, 0.2]}><octahedronGeometry args={[1, 2]} /><meshPhysicalMaterial color="#ffffff" emissive="#fff0b5" emissiveIntensity={2.7} roughness={0.06} transmission={0.35} transparent opacity={0.86} /></mesh>
      {Array.from({ length: 12 }, (_, index) => {
        const angle = (index / 12) * Math.PI * 2;
        const radius = 1.42 + (index % 2) * 0.18;
        return <mesh key={index} position={[Math.cos(angle) * radius, Math.sin(angle * 1.5) * 0.64, Math.sin(angle) * radius * 0.55]} rotation={[angle * 0.2, angle, angle * 0.12]}><tetrahedronGeometry args={[0.12 + (index % 3) * 0.025, 0]} /><meshStandardMaterial color={index % 2 ? PALE_GOLD : MOON_CYAN} emissive={index % 2 ? WHITE_GOLD : MOON_CYAN} emissiveIntensity={1.25} roughness={0.16} metalness={0.7} /></mesh>;
      })}
    </group>
    <OrbitalRibbon radius={1.85} lift={0.34} phase={0.2} color={WHITE_GOLD} width={0.032} opacity={0.86} />
    <OrbitalRibbon radius={2.2} lift={0.52} phase={1.5} color={MOON_CYAN} width={0.02} opacity={0.5} />
    <OrbitalRibbon radius={2.55} lift={0.4} phase={2.7} color="#cab4ff" width={0.014} opacity={0.32} />
    <points name="life-map-life-core-corona"><bufferGeometry><bufferAttribute attach="attributes-position" args={[corona, 3]} /></bufferGeometry><pointsMaterial color="#fff0b7" size={0.03} transparent opacity={0.78} depthWrite={false} sizeAttenuation /></points>
    <pointLight color={WHITE_GOLD} intensity={qualityTier === "low" ? 14 : 22} distance={28} decay={2} />
    <pointLight color={MOON_CYAN} intensity={qualityTier === "low" ? 4 : 8} distance={34} decay={2} position={[0, 2.5, 1.4]} />
  </group>;
}

function chapterDeckShape() {
  const shape = new THREE.Shape();
  shape.moveTo(-1.45, -0.35);
  shape.bezierCurveTo(-0.7, -0.78, 0.7, -0.72, 1.5, -0.22);
  shape.bezierCurveTo(1.05, 0.28, 0.48, 0.48, -0.22, 0.42);
  shape.bezierCurveTo(-0.9, 0.36, -1.3, 0.12, -1.45, -0.35);
  return shape;
}

function ChapterArc({ chapter, selected, reducedMotion }: { chapter: (typeof LIFE_MAP_CHAPTERS)[number]; selected: LifeMapNode | null; reducedMotion: boolean }) {
  const group = useRef<THREE.Group>(null);
  const visibility = chapterVisibility(chapter, selected);
  const deckShape = useMemo(chapterDeckShape, []);
  const curve = useMemo(() => {
    const points: THREE.Vector3[] = [];
    for (let index = 0; index <= 50; index += 1) {
      const angle = -chapter.arc / 2 + (chapter.arc * index) / 50;
      points.push(new THREE.Vector3(Math.cos(angle) * chapter.radius, Math.sin(angle) * chapter.radius * 0.3, Math.sin(angle * 0.55) * 0.8));
    }
    return new THREE.CatmullRomCurve3(points);
  }, [chapter]);
  useFrame(({ clock }) => {
    if (!group.current || reducedMotion) return;
    group.current.rotation.y = chapter.rotation[1] + Math.sin(clock.elapsedTime * 0.055 + chapter.radius) * 0.02;
  });
  return <group ref={group} name={`life-map-chapter-${chapter.id}`} position={chapter.position} rotation={chapter.rotation} data-chapter-region={chapter.id}>
    <mesh><tubeGeometry args={[curve, 96, 0.055, 8, false]} /><meshStandardMaterial color={chapter.aura} emissive={chapter.aura} emissiveIntensity={0.5 * visibility} roughness={0.18} metalness={0.85} transparent opacity={0.72 * visibility} /></mesh>
    <mesh position={[0, -0.5, -0.2]} rotation={[Math.PI / 2, 0, 0]} scale={[chapter.radius * 0.92, chapter.radius * 0.46, 1]} castShadow receiveShadow><extrudeGeometry args={[deckShape, { depth: 0.24, bevelEnabled: true, bevelSegments: 4, steps: 1, bevelSize: 0.045, bevelThickness: 0.045 }]} /><meshPhysicalMaterial color={GLASS_STONE} emissive={chapter.aura} emissiveIntensity={0.08} roughness={0.13} metalness={0.86} transmission={0.035} transparent opacity={0.94 * visibility} /></mesh>
    {[-1.4, -0.7, 0, 0.7, 1.4].map((column, index) => <group key={column} position={[column * chapter.radius * 0.27, -0.03 + Math.abs(column) * 0.04, -0.48 - index * 0.06]}><mesh castShadow><boxGeometry args={[0.09, 0.9 + (index % 3) * 0.28, 0.09]} /><meshStandardMaterial color="#173043" emissive={chapter.aura} emissiveIntensity={0.16} roughness={0.2} metalness={0.82} transparent opacity={0.72 * visibility} /></mesh><mesh position={[0, 0.55 + (index % 3) * 0.14, 0]}><octahedronGeometry args={[0.08, 0]} /><meshBasicMaterial color={chapter.aura} transparent opacity={0.7 * visibility} /></mesh></group>)}
    <Html position={[0, 1.15, 0]} center distanceFactor={15} occlude="blending"><span className="life-map-chapter-label" data-muted={visibility < 0.5 ? "true" : "false"}>{chapter.title}</span></Html>
  </group>;
}

function LightBridges({ selected }: { selected: LifeMapNode | null }) {
  return <group name="life-map-light-bridges" data-depth-band="middle">{LIFE_MAP_CHAPTERS.map((chapter, index) => {
    const start = new THREE.Vector3(...LIFE_MAP_CORE_POSITION);
    const end = new THREE.Vector3(...chapter.position);
    const middle = start.clone().lerp(end, 0.5);
    middle.y += 1.4 + index * 0.18;
    middle.z -= 0.7;
    const curve = new THREE.QuadraticBezierCurve3(start, middle, end);
    const active = !selected || selected.eraId === chapter.id;
    return <mesh key={chapter.id}><tubeGeometry args={[curve, 56, active ? 0.018 : 0.007, 6, false]} /><meshBasicMaterial color={chapter.aura} transparent opacity={active ? 0.3 : 0.055} depthWrite={false} blending={THREE.AdditiveBlending} /></mesh>;
  })}</group>;
}

function VisualArtifact({ color }: { color: string }) { return <group>{[-0.18, 0, 0.18].map((z, index) => <mesh key={z} position={[index * 0.1 - 0.1, index * 0.055 - 0.05, z]} rotation={[0.26, 0.55 - index * 0.12, 0.06]}><boxGeometry args={[0.72 - index * 0.08, 0.5 - index * 0.05, 0.04]} /><meshPhysicalMaterial color="#e8fbff" emissive={color} emissiveIntensity={0.32 + index * 0.12} roughness={0.05} metalness={0.34} transmission={0.5} transparent opacity={0.68 + index * 0.08} /></mesh>)}</group>; }
function AudioArtifact({ color }: { color: string }) { return <group>{[-0.42,-0.28,-0.14,0,0.14,0.28,0.42].map((x,index)=><mesh key={x} position={[x,0,Math.sin(index)*0.08]} scale={[1,0.5+Math.abs(3-index)*0.18,1]}><capsuleGeometry args={[0.045,0.4,6,12]}/><meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.82} roughness={0.18} metalness={0.62}/></mesh>)}<OrbitalRibbon radius={0.62} lift={0.12} phase={0.8} color={color} width={0.01} opacity={0.36}/></group>; }
function RelationshipArtifact({ color }: { color: string }) { return <group>{[[-0.34,0.08,0.05],[0.3,-0.02,-0.04],[0.02,0.32,-0.16]].map((position,index)=><mesh key={index} position={position as [number,number,number]} rotation={[index*0.2,index*0.45,0.2]}><octahedronGeometry args={[0.22+index*0.03,1]}/><meshPhysicalMaterial color="#effbff" emissive={color} emissiveIntensity={0.58+index*0.1} roughness={0.08} transmission={0.22}/></mesh>)}<Line points={[[-0.18,0.1,0.02],[0.12,0.03,-0.05],[0.02,0.24,-0.12]]} color={color} transparent opacity={0.86} lineWidth={1.6}/></group>; }
function PlaceArtifact({ color }: { color: string }) { return <group><mesh position={[0,-0.22,0]}><cylinderGeometry args={[0.54,0.68,0.14,7]}/><meshStandardMaterial color={GLASS_STONE} emissive={color} emissiveIntensity={0.18} roughness={0.28} metalness={0.8}/></mesh><mesh position={[-0.22,0.03,0]}><boxGeometry args={[0.3,0.42,0.3]}/><meshStandardMaterial color="#18364c" emissive={color} emissiveIntensity={0.28}/></mesh><mesh position={[0.16,0.14,-0.08]}><coneGeometry args={[0.26,0.62,5]}/><meshStandardMaterial color="#244d63" emissive={color} emissiveIntensity={0.24}/></mesh></group>; }
function EmotionArtifact({ color }: { color: string }) { return <group><mesh rotation={[0.4,0.5,0.2]}><dodecahedronGeometry args={[0.45,1]}/><meshPhysicalMaterial color={color} emissive={color} emissiveIntensity={0.72} roughness={0.2} transmission={0.28} transparent opacity={0.84}/></mesh><mesh scale={1.25} rotation={[-0.3,0.2,0.5]}><icosahedronGeometry args={[0.45,1]}/><meshBasicMaterial color="#fff" wireframe transparent opacity={0.18}/></mesh></group>; }
function PatternArtifact({ color }: { color: string }) { return <group>{[0,1,2].map(index=><OrbitalRibbon key={index} radius={0.34+index*0.12} lift={0.08+index*0.03} phase={index*1.15} color={color} width={0.023-index*0.004} opacity={0.62-index*0.12}/>)}<mesh><tetrahedronGeometry args={[0.18,1]}/><meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.7}/></mesh></group>; }
function AchievementArtifact({ color }: { color: string }) { return <group><mesh position={[0,-0.28,0]}><cylinderGeometry args={[0.36,0.5,0.18,8]}/><meshStandardMaterial color="#151b23" emissive={color} emissiveIntensity={0.18} metalness={0.88}/></mesh><mesh position={[0,0.06,0]} rotation={[0.2,0.3,0.1]}><octahedronGeometry args={[0.44,2]}/><meshPhysicalMaterial color="#fff3c9" emissive={color} emissiveIntensity={1.2} roughness={0.08} metalness={0.5}/></mesh></group>; }
function GoalArtifact({ color, future = false }: { color: string; future?: boolean }) { return <group>{[[-0.42,-0.26],[-0.14,-0.04],[0.16,0.2],[0.44,0.42]].map(([x,y],index)=><mesh key={index} position={[x,y,index*-0.09]}><boxGeometry args={[0.1,0.62+index*0.1,0.1]}/><meshStandardMaterial color={future ? "#353657" : "#514522"} emissive={color} emissiveIntensity={future ? 0.42 : 0.68} roughness={0.18} metalness={0.86} transparent opacity={future ? 0.62 : 0.9}/></mesh>)}<Line points={[[-0.5,-0.58,0],[-0.18,-0.18,-0.08],[0.16,0.18,-0.16],[0.52,0.7,-0.28]]} color={color} lineWidth={2} transparent opacity={0.88}/></group>; }
function EverydayArtifact({ color }: { color: string }) { return <group>{[[0,0,0],[0.28,0.08,-0.12],[-0.24,-0.12,0.08],[0.08,-0.28,-0.08],[-0.03,0.25,-0.18]].map((position,index)=><mesh key={index} position={position as [number,number,number]}><tetrahedronGeometry args={[0.15+index*0.012,1]}/><meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.25} roughness={0.32} metalness={0.5}/></mesh>)}</group>; }
function ArchiveArtifact({ color }: { color: string }) { return <group>{[0,1,2,3,4].map(index=><mesh key={index} position={[0,index*0.13-0.26,index*-0.055]} scale={[1-index*0.1,1,1-index*0.1]}><cylinderGeometry args={[0.38,0.48,0.075,10]}/><meshStandardMaterial color={index%2 ? "#091925" : "#13293a"} emissive={color} emissiveIntensity={0.1+index*0.03} roughness={0.35} metalness={0.68}/></mesh>)}</group>; }
function ProtectedArtifact({ color }: { color: string }) { return <group><mesh rotation={[0.08,0.22,0.02]}><boxGeometry args={[0.78,0.68,0.62]}/><meshPhysicalMaterial color="#03050a" emissive="#39284b" emissiveIntensity={0.16} roughness={0.14} metalness={0.9}/></mesh><mesh scale={1.16} rotation={[0.08,0.22,0.02]}><boxGeometry args={[0.78,0.68,0.62]}/><meshBasicMaterial color={color} wireframe transparent opacity={0.14}/></mesh></group>; }

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

function ArtifactHalo({ color, active }: { color: string; active: boolean }) {
  if (!active) return null;
  return <group name="life-map-selected-artifact-halo"><OrbitalRibbon radius={0.82} lift={0.13} phase={0.4} color={color} width={0.014} opacity={0.58}/><OrbitalRibbon radius={1.04} lift={0.18} phase={1.7} color="#fff" width={0.008} opacity={0.28}/></group>;
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
    const targetScale = active ? (phase === "arrival" ? 2.05 : 1.55) : muted ? 0.58 : 0.74 + importance * 0.48;
    const next = THREE.MathUtils.damp(group.current.scale.x, targetScale, active ? 5.2 : 3.5, delta);
    group.current.scale.setScalar(next);
    group.current.visible = !muted || active || related;
    if (!reducedMotion) {
      group.current.rotation.y = Math.sin(clock.elapsedTime * 0.16 + index * 0.7) * 0.14;
      group.current.position.y = node.position[1] + Math.sin(clock.elapsedTime * 0.28 + index) * (active ? 0.025 : 0.06);
    }
  });
  return <group ref={group} position={node.position} name={`life-map-artifact-${family}-${node.id}`} data-artifact-family={family} data-importance={importance.toFixed(2)} data-chapter={chapter.id}>
    <group onClick={(event) => { event.stopPropagation(); onSelect(node); }} onPointerOver={() => { document.body.style.cursor = "pointer"; }} onPointerOut={() => { document.body.style.cursor = ""; }}><ArtifactGeometry family={family} color={node.aura} /><ArtifactHalo color={node.aura} active={active} /></group>
    <pointLight color={node.aura} intensity={active ? 5.2 : related ? 2.1 : 0.65 + importance} distance={active ? 9 : 4} decay={2} />
    {(active || (!muted && importance > 0.72)) ? <Html position={[0, 1.02, 0]} center distanceFactor={12} occlude="blending"><button className="life-map-world-label" data-active={active ? "true" : "false"} data-family={family} onClick={() => onSelect(node)}><strong>{node.locked ? "Protected memory" : node.title}</strong><span>{node.locked ? "Private · sealed" : `${artifactFamilyLabel(node)} · ${node.dateLabel}`}</span></button></Html> : null}
  </group>;
}

function SemanticPath({ source, target, active, reducedMotion, seed }: { source: LifeMapNode; target: LifeMapNode; active: boolean; reducedMotion: boolean; seed: number }) {
  const pulse = useRef<THREE.Mesh>(null);
  const kind = resolvePathKind(source, target);
  const color = LIFE_MAP_PATH_PALETTE[kind];
  const curve = useMemo(() => {
    const start = new THREE.Vector3(...source.position);
    const end = new THREE.Vector3(...target.position);
    const middle = start.clone().lerp(end, 0.5);
    middle.y += Math.max(0.8, start.distanceTo(end) * 0.18);
    middle.z -= 0.7;
    return new THREE.QuadraticBezierCurve3(start, middle, end);
  }, [source.position, target.position]);
  const points = useMemo(() => curve.getPoints(42), [curve]);
  useFrame(({ clock }) => {
    if (!pulse.current) return;
    const t = reducedMotion ? 0.5 : (clock.elapsedTime * (active ? 0.12 : 0.035) + seed * 0.13) % 1;
    pulse.current.position.copy(curve.getPoint(t));
  });
  return <group><Line points={points} color={color} lineWidth={active ? 2.6 : 0.65} transparent opacity={kind === "protected" ? 0.06 : active ? 0.9 : 0.11} dashed={kind === "inferred" || kind === "corrected" || kind === "protected"} dashScale={reducedMotion ? 1 : active ? 2.6 : 1.4} dashSize={kind === "corrected" ? 0.12 : 0.2} gapSize={kind === "protected" ? 0.3 : 0.14}/><mesh ref={pulse} visible={active && kind !== "protected"}><octahedronGeometry args={[0.055,0]}/><meshBasicMaterial color={color} transparent opacity={0.92} blending={THREE.AdditiveBlending}/></mesh></group>;
}

function LivingPaths({ nodes, selected, reducedMotion }: { nodes: LifeMapNode[]; selected: LifeMapNode | null; reducedMotion: boolean }) {
  const byId = useMemo(() => new Map(nodes.map(node => [node.id,node])), [nodes]);
  return <group name="life-map-curved-semantic-paths" data-path-system="curved-semantic" data-depth-band="middle">{nodes.flatMap((node,sourceIndex)=>node.connectedTo.slice(0,3).map((targetId,targetIndex)=>{const target=byId.get(targetId);if(!target||target.id<node.id)return null;const active=selected?.id===node.id||selected?.id===target.id;return <SemanticPath key={`${node.id}-${target.id}`} source={node} target={target} active={active} reducedMotion={reducedMotion} seed={sourceIndex+targetIndex}/>;}))}</group>;
}

function ForegroundObservatory({ selected }: { selected: LifeMapNode | null }) {
  const opacity = selected ? 0.2 : 0.5;
  return <group name="life-map-foreground-observatory" position={[0,-2.55,6.9]} rotation={[-0.04,0,0]} data-depth-band="near"><mesh receiveShadow position={[0,-0.12,0]} scale={[6.7,0.12,2.7]}><boxGeometry args={[1,1,1]}/><meshPhysicalMaterial color={DEEP_GLASS} emissive="#15374b" emissiveIntensity={0.08} roughness={0.16} metalness={0.86} transparent opacity={opacity}/></mesh>{[-1,1].map(side=><group key={side} position={[side*5.2,1.1,-0.35]}><mesh><boxGeometry args={[0.16,2.7,0.2]}/><meshStandardMaterial color="#0c1b27" emissive={MOON_CYAN} emissiveIntensity={0.08} metalness={0.82} transparent opacity={opacity}/></mesh><mesh rotation={[0,0,side*0.9]} position={[side*-0.72,0.92,0]}><boxGeometry args={[0.12,2.05,0.16]}/><meshStandardMaterial color="#173044" emissive={MOON_CYAN} emissiveIntensity={0.1} metalness={0.8} transparent opacity={opacity}/></mesh></group>)}</group>;
}

function GoalHorizon({ reducedMotion }: { reducedMotion: boolean }) {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => { if (!group.current || reducedMotion) return; group.current.rotation.y = Math.sin(clock.elapsedTime * 0.045) * 0.02; });
  return <group ref={group} name="life-map-goal-horizon" position={[7.2,0.1,-13.4]} rotation={[0.05,-0.24,-0.04]} data-depth-band="far">{[0,1,2,3,4].map(index=><mesh key={index} position={[index*0.62-1.25,index*0.42-0.3,-index*0.4]}><boxGeometry args={[0.14,1.45+index*0.52,0.14]}/><meshStandardMaterial color="#292515" emissive="#f3d28d" emissiveIntensity={0.45+index*0.08} roughness={0.16} metalness={0.9}/></mesh>)}<Line points={[[-1.5,-0.9,0],[-0.45,-0.05,-0.35],[0.5,1,-0.9],[2,2.6,-2]]} color="#f6d993" lineWidth={2.2} transparent opacity={0.68}/></group>;
}

function AchievementMonument() { return <group name="life-map-achievement-monument" position={[-7,-1,-8]} data-depth-band="middle"><mesh position={[0,-0.6,0]}><cylinderGeometry args={[1.1,1.45,0.3,10]}/><meshStandardMaterial color="#0d151f" emissive="#d9b875" emissiveIntensity={0.14} metalness={0.88}/></mesh><mesh position={[0,0.2,0]}><octahedronGeometry args={[0.9,2]}/><meshPhysicalMaterial color="#fff2c4" emissive="#f5cd72" emissiveIntensity={1.35} roughness={0.08} metalness={0.52}/></mesh><pointLight color="#f7d790" intensity={5} distance={10}/></group>; }
function RelationshipObservatory({ reducedMotion }: { reducedMotion: boolean }) { const group=useRef<THREE.Group>(null);useFrame(({clock})=>{if(!group.current||reducedMotion)return;group.current.rotation.y=Math.sin(clock.elapsedTime*0.06)*0.035;});return <group ref={group} name="life-map-relationship-observatory" position={[5.2,0.8,-7.7]} data-depth-band="middle"><OrbitalRibbon radius={1.55} lift={0.24} phase={0.7} color="#d9efff" width={0.016} opacity={0.38}/><OrbitalRibbon radius={1.1} lift={0.18} phase={2.1} color="#9eddf2" width={0.01} opacity={0.26}/>{Array.from({length:5},(_,index)=>{const angle=index/5*Math.PI*2;return <mesh key={index} position={[Math.cos(angle)*1.16,Math.sin(angle*1.4)*0.4,Math.sin(angle)*0.68]}><octahedronGeometry args={[0.12+index*0.012,1]}/><meshStandardMaterial color="#eaf9ff" emissive="#a9e7ff" emissiveIntensity={0.65} roughness={0.12} metalness={0.58}/></mesh>;})}</group>; }
function PrivacyVault() { return <group name="life-map-privacy-vault" position={[-5.8,0.2,-12.4]} data-privacy-region="sealed" data-depth-band="far"><mesh><dodecahedronGeometry args={[1.3,1]}/><meshPhysicalMaterial color="#020308" emissive="#2d203c" emissiveIntensity={0.13} roughness={0.12} metalness={0.92}/></mesh><mesh scale={1.2}><dodecahedronGeometry args={[1.3,0]}/><meshBasicMaterial color="#8d74ad" wireframe transparent opacity={0.13}/></mesh><mesh position={[0,0,1.15]}><boxGeometry args={[0.42,0.62,0.08]}/><meshStandardMaterial color="#100b18" emissive="#6f5a8d" emissiveIntensity={0.24} metalness={0.8}/></mesh></group>; }
function EmotionalWeather({ selected, reducedMotion }: { selected: LifeMapNode | null; reducedMotion: boolean }) { const group=useRef<THREE.Group>(null);useFrame(({clock})=>{if(!group.current||reducedMotion)return;group.current.position.x=2.7+Math.sin(clock.elapsedTime*0.05)*0.4;group.current.rotation.y=clock.elapsedTime*0.012;});const color=selected?.type==="threshold"?"#d46ba8":selected?.type==="recovery"?"#6ebbd2":"#6b5d9a";return <group ref={group} name="life-map-emotional-weather" position={[2.7,3.2,-10]} data-depth-band="middle">{[[0,0,0],[1,-0.2,-0.5],[-0.9,0.18,-0.6],[0.2,0.5,-1]].map((position,index)=><mesh key={index} position={position as [number,number,number]} scale={[2.8-index*0.26,0.7,1.3]}><dodecahedronGeometry args={[1,1]}/><meshBasicMaterial color={color} transparent opacity={0.035+index*0.009} depthWrite={false} blending={THREE.AdditiveBlending}/></mesh>)}</group>; }
function ArchiveDepth({ qualityTier, reducedMotion }: { qualityTier: SpatialQualityProfile["tier"]; reducedMotion: boolean }) { const count=qualityTier === "low" ? 80 : qualityTier === "medium" ? 160 : 260;const positions=useMemo(()=>{const data=new Float32Array(count*3);for(let index=0;index<count;index+=1){const radius=8+(index%31)*0.5;const angle=index*2.399963;data[index*3]=Math.cos(angle)*radius;data[index*3+1]=Math.sin(angle*0.7)*5.2;data[index*3+2]=-9-(index%23)*1.25;}return data;},[count]);const points=useRef<THREE.Points>(null);useFrame(({clock})=>{if(!points.current||reducedMotion)return;points.current.rotation.y=clock.elapsedTime*0.003;});return <points ref={points} name="life-map-archive-particles" data-depth-band="far"><bufferGeometry><bufferAttribute attach="attributes-position" args={[positions,3]}/></bufferGeometry><pointsMaterial color="#a9dcf0" size={0.035} transparent opacity={0.42} depthWrite={false}/></points>; }
function ArrivalChamber({ selected, phase }: { selected: LifeMapNode | null; phase: LifeMapJourneyPhase }) { if(!selected||(phase!=="approach"&&phase!=="arrival"))return null;const opacity=phase==="arrival" ? 0.8 : 0.34;return <group position={selected.position} name="life-map-intimate-memory-chamber" data-scale="intimate" data-depth-band="near">{Array.from({length:10},(_,index)=>{const angle=index/10*Math.PI*2;return <group key={index} position={[Math.cos(angle)*1.75,Math.sin(angle)*0.42,Math.sin(angle)*1.75]} rotation={[0,-angle,0]}><mesh><boxGeometry args={[0.09,1.85,0.34]}/><meshStandardMaterial color="#081521" emissive={selected.aura} emissiveIntensity={0.18} roughness={0.16} metalness={0.88} transparent opacity={opacity}/></mesh></group>;})}<mesh rotation={[Math.PI/2,0,0]} position={[0,-0.88,0]}><cylinderGeometry args={[1.82,2.05,0.12,64]}/><meshPhysicalMaterial color={GLASS_STONE} emissive={selected.aura} emissiveIntensity={0.12} roughness={0.12} metalness={0.88} transparent opacity={opacity}/></mesh><OrbitalRibbon radius={1.4} lift={0.18} phase={0.8} color={selected.aura} width={0.012} opacity={opacity*0.72}/><pointLight color={selected.aura} intensity={phase==="arrival"?7:3} distance={9}/></group>; }

function WorldLighting({ shadows }: { shadows: boolean }) { return <><ambientLight intensity={0.32} color="#9fdfff"/><directionalLight position={[6,10,9]} intensity={2.4} color="#d8f5ff" castShadow={shadows}/><directionalLight position={[-8,4,3]} intensity={0.85} color="#8f78d8"/><hemisphereLight args={["#c8f3ff","#02040a",0.48]}/></>; }

export function LifeMapProductionWorld({ nodes, selected, phase, profile, onSelect, cameraRig, webglRecovery }: { nodes: LifeMapNode[]; selected: LifeMapNode | null; phase: LifeMapJourneyPhase; profile: SpatialQualityProfile; onSelect: (node: LifeMapNode) => void; cameraRig: ReactNode; webglRecovery: ReactNode; }) {
  return <>
    <color attach="background" args={["#02050b"]}/>
    <fog attach="fog" args={["#02050b",13,58]}/>
    <WorldLighting shadows={profile.shadows}/>
    {webglRecovery}{cameraRig}
    <ForegroundObservatory selected={selected}/>
    <LifeCore reducedMotion={profile.reducedMotion} qualityTier={profile.tier}/>
    <group name="life-map-authored-chapter-regions" data-scale="cosmic-overview" data-depth-band="middle">{LIFE_MAP_CHAPTERS.map(chapter=><ChapterArc key={chapter.id} chapter={chapter} selected={selected} reducedMotion={profile.reducedMotion}/>)}</group>
    <LightBridges selected={selected}/><LivingPaths nodes={nodes} selected={selected} reducedMotion={profile.reducedMotion}/>
    <group name="life-map-memory-artifact-families" data-depth-band="middle">{nodes.map((node,index)=><MemoryArtifact key={node.id} node={node} index={index} selected={selected} phase={phase} reducedMotion={profile.reducedMotion} onSelect={onSelect}/>)}</group>
    <RelationshipObservatory reducedMotion={profile.reducedMotion}/><AchievementMonument/><GoalHorizon reducedMotion={profile.reducedMotion}/><PrivacyVault/><EmotionalWeather selected={selected} reducedMotion={profile.reducedMotion}/><ArchiveDepth qualityTier={profile.tier} reducedMotion={profile.reducedMotion}/><ArrivalChamber selected={selected} phase={phase}/>
    <group name="life-map-far-future-horizon" data-depth-band="far"><Stars radius={78} depth={58} count={profile.tier === "low" ? 420 : profile.tier === "medium" ? 760 : 1200} factor={2} saturation={0.14} fade speed={profile.reducedMotion?0:0.035}/></group>
    <CinematicPostProcessing active={profile.postprocessing} reducedMotion={profile.reducedMotion}/>
  </>;
}
