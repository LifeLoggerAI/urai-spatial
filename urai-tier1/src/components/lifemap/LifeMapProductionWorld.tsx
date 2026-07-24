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
    points.push(new THREE.Vector3(
      Math.cos(angle) * radius,
      Math.sin(angle * 2 + phase) * lift,
      Math.sin(angle) * radius * 0.5,
    ));
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
    <mesh position={[0, -2.2, 0]}>
      <cylinderGeometry args={[0.26, 0.62, 4.4, 32, 1, true]} />
      <meshBasicMaterial color={WHITE_GOLD} transparent opacity={0.12} depthWrite={false} blending={THREE.AdditiveBlending} />
    </mesh>
    <group ref={inner}>
      <mesh castShadow receiveShadow rotation={[0.28, 0.45, 0.1]}>
        <dodecahedronGeometry args={[1.2, qualityTier === "low" ? 1 : 2]} />
        <meshPhysicalMaterial color="#fff7df" emissive={WHITE_GOLD} emissiveIntensity={1.3} roughness={0.14} metalness={0.28} transmission={0.2} thickness={1.8} />
      </mesh>
      <mesh scale={0.84} rotation={[-0.5, 0.2, 0.82]}>
        <icosahedronGeometry args={[1.05, qualityTier === "high" ? 2 : 1]} />
        <meshStandardMaterial color="#fffdf8" emissive="#ffc85f" emissiveIntensity={2.1} roughness={0.2} metalness={0.42} wireframe />
      </mesh>
      <mesh scale={0.5} rotation={[0.7, -0.3, 0.2]}>
        <octahedronGeometry args={[1, 2]} />
        <meshPhysicalMaterial color="#ffffff" emissive="#fff0b5" emissiveIntensity={2.7} roughness={0.06} transmission={0.35} transparent opacity={0.86} />
      </mesh>
      {Array.from({ length: 12 }, (_, index) => {
        const angle = (index / 12) * Math.PI * 2;
        const radius = 1.42 + (index % 2) * 0.18;
        return <mesh key={index} position={[Math.cos(angle) * radius, Math.sin(angle * 1.5) * 0.64, Math.sin(angle) * radius * 0.55]} rotation={[angle * 0.2, angle, angle * 0.12]}>
          <tetrahedronGeometry args={[0.12 + (index % 3) * 0.025, 0]} />
          <meshStandardMaterial color={index % 2 ? PALE_GOLD : MOON_CYAN} emissive={index % 2 ? WHITE_GOLD : MOON_CYAN} emissiveIntensity={1.25} roughness={0.16} metalness={0.7} />
        </mesh>;
      })}
    </group>
    <OrbitalRibbon radius={1.85} lift={0.34} phase={0.2} color={WHITE_GOLD} width={0.032} opacity={0.86} />
    <OrbitalRibbon radius={2.2} lift={0.52} phase={1.5} color={MOON_CYAN} width={0.02} opacity={0.5} />
    <OrbitalRibbon radius={2.55} lift={0.4} phase={2.7} color="#cab4ff" width={0.014} opacity={0.32} />
    <points name="life-map-life-core-corona">
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[corona, 3]} /></bufferGeometry>
      <pointsMaterial color="#fff0b7" size={0.03} transparent opacity={0.78} depthWrite={false} sizeAttenuation />
    </points>
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
    <mesh>
      <tubeGeometry args={[curve, 96, 0.055, 8, false]} />
      <meshStandardMaterial color={chapter.aura} emissive={chapter.aura} emissiveIntensity={0.5 * visibility} roughness={0.18} metalness={0.85} transparent opacity={0.72 * visibility} />
    </mesh>
    <mesh position={[0, -0.5, -0.2]} rotation={[Math.PI / 2, 0, 0]} scale={[chapter.radius * 0.92, chapter.radius * 0.46, 1]} castShadow receiveShadow>
      <extrudeGeometry args={[deckShape, { depth: 0.24, bevelEnabled: true, bevelSegments: 4, steps: 1, bevelSize: 0.045, bevelThickness: 0.045 }]} />
      <meshPhysicalMaterial color={GLASS_STONE} emissive={chapter.aura} emissiveIntensity={0.08} roughness={0.13} metalness={0.86} transmission={0.035} transparent opacity={0.94 * visibility} />
    </mesh>
    {[-1.4, -0.7, 0, 0.7, 1.4].map((column, index) => <group key={column} position={[column * chapter.radius * 0.27, -0.03 + Math.abs(column) * 0.04, -0.48 - index * 0.06]}>
      <mesh castShadow><boxGeometry args={[0.09, 0.9 + (index % 3) * 0.28, 0.09]} /><meshStandardMaterial color="#173043" emissive={chapter.aura} emissiveIntensity={0.16} roughness={0.2} metalness={0.82} transparent opacity={0.72 * visibility} /></mesh>
      <mesh position={[0, 0.55 + (index % 3) * 0.14, 0]}><octahedronGeometry args={[0.08, 0]} /><meshBasicMaterial color={chapter.aura} transparent opacity={0.7 * visibility} /></mesh>
    </group>)}
    <Html position={[0, 1.15, 0]} center distanceFactor={15} occlude="blending">
      <span className="life-map-chapter-label" data-muted={visibility < 0.5 ? "true" : "false"}>{chapter.title}</span>
    </Html>
  </group>;
}

function LightBridges({ selected }: { selected: LifeMapNode | null }) {
  return <group name="life-map-light-bridges" data-depth-band="middle">
    {LIFE_MAP_CHAPTERS.map((chapter, index) => {
      const start = new THREE.Vector3(...LIFE_MAP_CORE_POSITION);
      const end = new THREE.Vector3(...chapter.position);
      const middle = start.clone().lerp(end, 0.5);
      middle.y += 1.4 + index * 0.18;
      middle.z -= 0.7;
      const curve = new THREE.QuadraticBezierCurve3(start, middle, end);
      const active = !selected || selected.eraId === chapter.id;
      return <mesh key={chapter.id}>
        <tubeGeometry args={[curve, 56, active ? 0.018 : 0.007, 6, false]} />
        <meshBasicMaterial color={chapter.aura} transparent opacity={active ? 0.3 : 0.055} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>;
    })}
  </group>;
}

function VisualArtifact({ color }: { color: string }) {
  return <group>{[-0.18, 0, 0.18].map((z, index) => <mesh key={z} position={[index * 0.1 - 0.1, index * 0.055 - 0.05, z]} rotation={[0.26, 0.55 - index * 0.12, 0.06]}><boxGeometry args={[0.72 - index * 0.08, 0.5 - index * 0.05, 0.04]} /><meshPhysicalMaterial color="#e8fbff" emissive={color} emissiveIntensity={0.32 + index * 0.12} roughness={0.05} metalness={0.34} transmission={0.5} transparent opacity={0.68 + index * 0.08} /></mesh>)}</group>;
}
function AudioArtifact({ color }: { color: string }) {
  return <group>{[-.42,-.28,-.14,0,.14,.28,.42].map((x,index)=><mesh key={x} position={[x,0,Math.sin(index)*.08]} scale={[1,.5+Math.abs(3-index)*.18,1]}><capsuleGeometry args={[.045,.4,6,12]}/><meshStandardMaterial color={color} emissive={color} emissiveIntensity={.82} roughness={.18} metalness={.62}/></mesh>)}<OrbitalRibbon radius={.62} lift={.12} phase={.8} color={color} width={.01} opacity={.36}/></group>;
}
function RelationshipArtifact({ color }: { color: string }) {
  return <group>{[[-.34,.08,.05],[.3,-.02,-.04],[.02,.32,-.16]].map((position,index)=><mesh key={index} position={position as [number,number,number]} rotation={[index*.2,index*.45,.2]}><octahedronGeometry args={[.22+index*.03,1]}/><meshPhysicalMaterial color="#effbff" emissive={color} emissiveIntensity={.58+index*.1} roughness={.08} transmission={.22}/></mesh>)}<Line points={[[-.18,.1,.02],[.12,.03,-.05],[.02,.24,-.12]]} color={color} transparent opacity={.86} lineWidth={1.6}/></group>;
}
function PlaceArtifact({ color }: { color: string }) {
  return <group><mesh position={[0,-.22,0]}><cylinderGeometry args={[.54,.68,.14,7]}/><meshStandardMaterial color={GLASS_STONE} emissive={color} emissiveIntensity={.18} roughness={.28} metalness={.8}/></mesh><mesh position={[-.22,.03,0]}><boxGeometry args={[.3,.42,.3]}/><meshStandardMaterial color="#18364c" emissive={color} emissiveIntensity={.28}/></mesh><mesh position={[.16,.14,-.08]}><coneGeometry args={[.26,.62,5]}/><meshStandardMaterial color="#244d63" emissive={color} emissiveIntensity={.24}/></mesh></group>;
}
function EmotionArtifact({ color }: { color: string }) {
  return <group><mesh rotation={[.4,.5,.2]}><dodecahedronGeometry args={[.45,1]}/><meshPhysicalMaterial color={color} emissive={color} emissiveIntensity={.72} roughness={.2} transmission={.28} transparent opacity={.84}/></mesh><mesh scale={1.25} rotation={[-.3,.2,.5]}><icosahedronGeometry args={[.45,1]}/><meshBasicMaterial color="#fff" wireframe transparent opacity={.18}/></mesh></group>;
}
function PatternArtifact({ color }: { color: string }) {
  return <group>{[0,1,2].map(index=><OrbitalRibbon key={index} radius={.34+index*.12} lift={.08+index*.03} phase={index*1.15} color={color} width={.023-index*.004} opacity={.62-index*.12}/>)}<mesh><tetrahedronGeometry args={[.18,1]}/><meshStandardMaterial color={color} emissive={color} emissiveIntensity={.7}/></mesh></group>;
}
function AchievementArtifact({ color }: { color: string }) {
  return <group><mesh position={[0,-.28,0]}><cylinderGeometry args={[.36,.5,.18,8]}/><meshStandardMaterial color="#151b23" emissive={color} emissiveIntensity={.18} metalness={.88}/></mesh><mesh position={[0,.06,0]} rotation={[.2,.3,.1]}><octahedronGeometry args={[.44,2]}/><meshPhysicalMaterial color="#fff3c9" emissive={color} emissiveIntensity={1.2} roughness={.08} metalness={.5}/></mesh></group>;
}
function GoalArtifact({ color, future = false }: { color: string; future?: boolean }) {
  return <group>{[[-.42,-.26],[-.14,-.04],[.16,.2],[.44,.42]].map(([x,y],index)=><mesh key={index} position={[x,y,index*-.09]}><boxGeometry args={[.1,.62+index*.1,.1]}/><meshStandardMaterial color={future?"#353657":"#514522"} emissive={color} emissiveIntensity={future?.42:.68} roughness={.18} metalness={.86} transparent opacity={future?.62:.9}/></mesh>)}<Line points={[[ -.5,-.58,0],[-.18,-.18,-.08],[.16,.18,-.16],[.52,.7,-.28]]} color={color} lineWidth={2} transparent opacity={.88}/></group>;
}
function EverydayArtifact({ color }: { color: string }) {
  return <group>{[[0,0,0],[.28,.08,-.12],[-.24,-.12,.08],[.08,-.28,-.08],[-.03,.25,-.18]].map((position,index)=><mesh key={index} position={position as [number,number,number]}><tetrahedronGeometry args={[.15+index*.012,1]}/><meshStandardMaterial color={color} emissive={color} emissiveIntensity={.25} roughness={.32} metalness={.5}/></mesh>)}</group>;
}
function ArchiveArtifact({ color }: { color: string }) {
  return <group>{[0,1,2,3,4].map(index=><mesh key={index} position={[0,index*.13-.26,index*-.055]} scale={[1-index*.1,1,1-index*.1]}><cylinderGeometry args={[.38,.48,.075,10]}/><meshStandardMaterial color={index%2?"#091925":"#13293a"} emissive={color} emissiveIntensity={.1+index*.03} roughness={.35} metalness={.68}/></mesh>)}</group>;
}
function ProtectedArtifact({ color }: { color: string }) {
  return <group><mesh rotation={[.08,.22,.02]}><boxGeometry args={[.78,.68,.62]}/><meshPhysicalMaterial color="#03050a" emissive="#39284b" emissiveIntensity={.16} roughness={.14} metalness={.9}/></mesh><mesh scale={1.16} rotation={[.08,.22,.02]}><boxGeometry args={[.78,.68,.62]}/><meshBasicMaterial color={color} wireframe transparent opacity={.14}/></mesh></group>;
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

function ArtifactHalo({ color, active }: { color: string; active: boolean }) {
  if (!active) return null;
  return <group name="life-map-selected-artifact-halo"><OrbitalRibbon radius={.82} lift={.13} phase={.4} color={color} width={.014} opacity={.58}/><OrbitalRibbon radius={1.04} lift={.18} phase={1.7} color="#fff" width={.008} opacity={.28}/></group>;
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
    const targetScale = active ? (phase === "arrival" ? 2.05 : 1.55) : muted ? .58 : .74 + importance * .48;
    const next = THREE.MathUtils.damp(group.current.scale.x, targetScale, active ? 5.2 : 3.5, delta);
    group.current.scale.setScalar(next);
    group.current.visible = !muted || active || related;
    if (!reducedMotion) {
      group.current.rotation.y = Math.sin(clock.elapsedTime * .16 + index * .7) * .14;
      group.current.position.y = node.position[1] + Math.sin(clock.elapsedTime * .28 + index) * (active ? .025 : .06);
    }
  });
  return <group ref={group} position={node.position} name={`life-map-artifact-${family}-${node.id}`} data-artifact-family={family} data-importance={importance.toFixed(2)} data-chapter={chapter.id}>
    <group onClick={(event) => { event.stopPropagation(); onSelect(node); }} onPointerOver={() => { document.body.style.cursor = "pointer"; }} onPointerOut={() => { document.body.style.cursor = ""; }}>
      <ArtifactGeometry family={family} color={node.aura} />
      <ArtifactHalo color={node.aura} active={active} />
    </group>
    <pointLight color={node.aura} intensity={active ? 5.2 : related ? 2.1 : .65 + importance} distance={active ? 9 : 4} decay={2} />
    {(active || (!muted && importance > .72)) ? <Html position={[0, 1.02, 0]} center distanceFactor={12} occlude="blending"><button className="life-map-world-label" data-active={active ? "true" : "false"} data-family={family} onClick={() => onSelect(node)}><strong>{node.locked ? "Protected memory" : node.title}</strong><span>{node.locked ? "Private · sealed" : `${artifactFamilyLabel(node)} · ${node.dateLabel}`}</span></button></Html> : null}
  </group>;
}

function SemanticPath({ source, target, active, reducedMotion, seed }: { source: LifeMapNode; target: LifeMapNode; active: boolean; reducedMotion: boolean; seed: number }) {
  const pulse = useRef<THREE.Mesh>(null);
  const kind = resolvePathKind(source, target);
  const color = LIFE_MAP_PATH_PALETTE[kind];
  const curve = useMemo(() => {
    const start = new THREE.Vector3(...source.position);
    const end = new THREE.Vector3(...target.position);
    const middle = start.clone().lerp(end, .5);
    middle.y += Math.max(.8, start.distanceTo(end) * .18);
    middle.z -= .7;
    return new THREE.QuadraticBezierCurve3(start, middle, end);
  }, [source.position, target.position]);
  const points = useMemo(() => curve.getPoints(42), [curve]);
  useFrame(({ clock }) => {
    if (!pulse.current) return;
    const t = reducedMotion ? .5 : (clock.elapsedTime * (active ? .12 : .035) + seed * .13) % 1;
    pulse.current.position.copy(curve.getPoint(t));
  });
  return <group><Line points={points} color={color} lineWidth={active ? 2.6 : .65} transparent opacity={kind === "protected" ? .06 : active ? .9 : .11} dashed={kind === "inferred" || kind === "corrected" || kind === "protected"} dashScale={reducedMotion ? 1 : active ? 2.6 : 1.4} dashSize={kind === "corrected" ? .12 : .2} gapSize={kind === "protected" ? .3 : .14}/><mesh ref={pulse} visible={active && kind !== "protected"}><octahedronGeometry args={[.055,0]}/><meshBasicMaterial color={color} transparent opacity={.92} blending={THREE.AdditiveBlending}/></mesh></group>;
}

function LivingPaths({ nodes, selected, reducedMotion }: { nodes: LifeMapNode[]; selected: LifeMapNode | null; reducedMotion: boolean }) {
  const byId = useMemo(() => new Map(nodes.map(node => [node.id,node])), [nodes]);
  return <group name="life-map-curved-semantic-paths" data-path-system="curved-semantic" data-depth-band="middle">{nodes.flatMap((node,sourceIndex)=>node.connectedTo.slice(0,3).map((targetId,targetIndex)=>{const target=byId.get(targetId);if(!target||target.id<node.id)return null;const active=selected?.id===node.id||selected?.id===target.id;return <SemanticPath key={`${node.id}-${target.id}`} source={node} target={target} active={active} reducedMotion={reducedMotion} seed={sourceIndex+targetIndex}/>;}))}</group>;
}

function ForegroundObservatory({ selected }: { selected: LifeMapNode | null }) {
  const opacity = selected ? .2 : .5;
  return <group name="life-map-foreground-observatory" position={[0,-2.55,6.9]} rotation={[-.04,0,0]} data-depth-band="near"><mesh receiveShadow position={[0,-.12,0]} scale={[6.7,.12,2.7]}><boxGeometry args={[1,1,1]}/><meshPhysicalMaterial color={DEEP_GLASS} emissive="#15374b" emissiveIntensity={.08} roughness={.16} metalness={.86} transparent opacity={opacity}/></mesh>{[-1,1].map(side=><group key={side} position={[side*5.2,1.1,-.35]}><mesh><boxGeometry args={[.16,2.7,.2]}/><meshStandardMaterial color="#0c1b27" emissive={MOON_CYAN} emissiveIntensity={.08} metalness={.82} transparent opacity={opacity}/></mesh><mesh rotation={[0,0,side*.9]} position={[side*-.72,.92,0]}><boxGeometry args={[.12,2.05,.16]}/><meshStandardMaterial color="#173044" emissive={MOON_CYAN} emissiveIntensity={.1} metalness={.8} transparent opacity={opacity}/></mesh></group>)}</group>;
}

function GoalHorizon({ reducedMotion }: { reducedMotion: boolean }) {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => { if (!group.current || reducedMotion) return; group.current.rotation.y = Math.sin(clock.elapsedTime*.045)*.02; });
  return <group ref={group} name="life-map-goal-horizon" position={[7.2,.1,-13.4]} rotation={[.05,-.24,-.04]} data-depth-band="far">{[0,1,2,3,4].map(index=><mesh key={index} position={[index*.62-1.25,index*.42-.3,-index*.4]}><boxGeometry args={[.14,1.45+index*.52,.14]}/><meshStandardMaterial color="#292515" emissive="#f3d28d" emissiveIntensity={.45+index*.08} roughness={.16} metalness={.9}/></mesh>)}<Line points={[[ -1.5,-.9,0],[-.45,-.05,-.35],[.5,1,-.9],[2,2.6,-2]]} color="#f6d993" lineWidth={2.2} transparent opacity={.68}/></group>;
}
function AchievementMonument() { return <group name="life-map-achievement-monument" position={[-7,-1,-8]} data-depth-band="middle"><mesh position={[0,-.6,0]}><cylinderGeometry args={[1.1,1.45,.3,10]}/><meshStandardMaterial color="#0d151f" emissive="#d9b875" emissiveIntensity={.14} metalness={.88}/></mesh><mesh position={[0,.2,0]}><octahedronGeometry args={[.9,2]}/><meshPhysicalMaterial color="#fff2c4" emissive="#f5cd72" emissiveIntensity={1.35} roughness={.08} metalness={.52}/></mesh><pointLight color="#f7d790" intensity={5} distance={10}/></group>; }
function RelationshipObservatory({ reducedMotion }: { reducedMotion: boolean }) { const group=useRef<THREE.Group>(null);useFrame(({clock})=>{if(!group.current||reducedMotion)return;group.current.rotation.y=Math.sin(clock.elapsedTime*.06)*.035;});return <group ref={group} name="life-map-relationship-observatory" position={[5.2,.8,-7.7]} data-depth-band="middle"><OrbitalRibbon radius={1.55} lift={.24} phase={.7} color="#d9efff" width={.016} opacity={.38}/><OrbitalRibbon radius={1.1} lift={.18} phase={2.1} color="#9eddf2" width={.01} opacity={.26}/>{Array.from({length:5},(_,index)=>{const angle=index/5*Math.PI*2;return <mesh key={index} position={[Math.cos(angle)*1.16,Math.sin(angle*1.4)*.4,Math.sin(angle)*.68]}><octahedronGeometry args={[.12+index*.012,1]}/><meshStandardMaterial color="#eaf9ff" emissive="#a9e7ff" emissiveIntensity={.65} roughness={.12} metalness={.58}/></mesh>;})}</group>; }
function PrivacyVault() { return <group name="life-map-privacy-vault" position={[-5.8,.2,-12.4]} data-privacy-region="sealed" data-depth-band="far"><mesh><dodecahedronGeometry args={[1.3,1]}/><meshPhysicalMaterial color="#020308" emissive="#2d203c" emissiveIntensity={.13} roughness={.12} metalness={.92}/></mesh><mesh scale={1.2}><dodecahedronGeometry args={[1.3,0]}/><meshBasicMaterial color="#8d74ad" wireframe transparent opacity={.13}/></mesh><mesh position={[0,0,1.15]}><boxGeometry args={[.42,.62,.08]}/><meshStandardMaterial color="#100b18" emissive="#6f5a8d" emissiveIntensity={.24} metalness={.8}/></mesh></group>; }
function EmotionalWeather({ selected, reducedMotion }: { selected: LifeMapNode | null; reducedMotion: boolean }) { const group=useRef<THREE.Group>(null);useFrame(({clock})=>{if(!group.current||reducedMotion)return;group.current.position.x=2.7+Math.sin(clock.elapsedTime*.05)*.4;group.current.rotation.y=clock.elapsedTime*.012;});const color=selected?.type==="threshold"?"#d46ba8":selected?.type==="recovery"?"#6ebbd2":"#6b5d9a";return <group ref={group} name="life-map-emotional-weather" position={[2.7,3.2,-10]} data-depth-band="middle">{[[0,0,0],[1,-.2,-.5],[-.9,.18,-.6],[.2,.5,-1]].map((position,index)=><mesh key={index} position={position as [number,number,number]} scale={[2.8-index*.26,.7,1.3]}><dodecahedronGeometry args={[1,1]}/><meshBasicMaterial color={color} transparent opacity={.035+index*.009} depthWrite={false} blending={THREE.AdditiveBlending}/></mesh>)}</group>; }
function ArchiveDepth({ qualityTier, reducedMotion }: { qualityTier: SpatialQualityProfile["tier"]; reducedMotion: boolean }) { const count=qualityTier === "low" ? 80 : qualityTier === "medium" ? 160 : 260;const positions=useMemo(()=>{const data=new Float32Array(count*3);for(let index=0;index<count;index+=1){const radius=8+(index%31)*.5;const angle=index*2.399963;data[index*3]=Math.cos(angle)*radius;data[index*3+1]=Math.sin(angle*.7)*5.2;data[index*3+2]=-9-(index%23)*1.25;}return data;},[count]);const points=useRef<THREE.Points>(null);useFrame(({clock})=>{if(!points.current||reducedMotion)return;points.current.rotation.y=clock.elapsedTime*.003;});return <points ref={points} name="life-map-archive-particles" data-depth-band="far"><bufferGeometry><bufferAttribute attach="attributes-position" args={[positions,3]}/></bufferGeometry><pointsMaterial color="#a9dcf0" size={.035} transparent opacity={.42} depthWrite={false}/></points>; }
function ArrivalChamber({ selected, phase }: { selected: LifeMapNode | null; phase: LifeMapJourneyPhase }) { if(!selected||(phase!=="approach"&&phase!=="arrival"))return null;const opacity=phase==="arrival"?.8:.34;return <group position={selected.position} name="life-map-intimate-memory-chamber" data-scale="intimate" data-depth-band="near">{Array.from({length:10},(_,index)=>{const angle=index/10*Math.PI*2;return <group key={index} position={[Math.cos(angle)*1.75,Math.sin(angle)*.42,Math.sin(angle)*1.75]} rotation={[0,-angle,0]}><mesh><boxGeometry args={[.09,1.85,.34]}/><meshStandardMaterial color="#081521" emissive={selected.aura} emissiveIntensity={.18} roughness={.16} metalness={.88} transparent opacity={opacity}/></mesh></group>;})}<mesh rotation={[Math.PI/2,0,0]} position={[0,-.88,0]}><cylinderGeometry args={[1.82,2.05,.12,64]}/><meshPhysicalMaterial color={GLASS_STONE} emissive={selected.aura} emissiveIntensity={.12} roughness={.12} metalness={.88} transparent opacity={opacity}/></mesh><OrbitalRibbon radius={1.4} lift={.18} phase={.8} color={selected.aura} width={.012} opacity={opacity*.72}/><pointLight color={selected.aura} intensity={phase==="arrival"?7:3} distance={9}/></group>; }

function WorldLighting({ shadows }: { shadows: boolean }) { return <><ambientLight intensity={.32} color="#9fdfff"/><directionalLight position={[6,10,9]} intensity={2.4} color="#d8f5ff" castShadow={shadows}/><directionalLight position={[-8,4,3]} intensity={.85} color="#8f78d8"/><hemisphereLight args={["#c8f3ff","#02040a",.48]}/></>; }

export function LifeMapProductionWorld({ nodes, selected, phase, profile, onSelect, cameraRig, webglRecovery }: { nodes: LifeMapNode[]; selected: LifeMapNode | null; phase: LifeMapJourneyPhase; profile: SpatialQualityProfile; onSelect: (node: LifeMapNode) => void; cameraRig: ReactNode; webglRecovery: ReactNode; }) {
  return <>
    <color attach="background" args={["#02050b"]}/>
    <fog attach="fog" args={["#02050b",13,58]}/>
    <WorldLighting shadows={profile.shadows}/>
    {webglRecovery}{cameraRig}
    <ForegroundObservatory selected={selected}/>
    <LifeCore reducedMotion={profile.reducedMotion} qualityTier={profile.tier}/>
    <group name="life-map-authored-chapter-regions" data-scale="cosmic-overview" data-depth-band="middle">{LIFE_MAP_CHAPTERS.map(chapter=><ChapterArc key={chapter.id} chapter={chapter} selected={selected} reducedMotion={profile.reducedMotion}/>)}</group>
    <LightBridges selected={selected}/>
    <LivingPaths nodes={nodes} selected={selected} reducedMotion={profile.reducedMotion}/>
    <group name="life-map-memory-artifact-families" data-depth-band="middle">{nodes.map((node,index)=><MemoryArtifact key={node.id} node={node} index={index} selected={selected} phase={phase} reducedMotion={profile.reducedMotion} onSelect={onSelect}/>)}</group>
    <RelationshipObservatory reducedMotion={profile.reducedMotion}/><AchievementMonument/><GoalHorizon reducedMotion={profile.reducedMotion}/><PrivacyVault/><EmotionalWeather selected={selected} reducedMotion={profile.reducedMotion}/><ArchiveDepth qualityTier={profile.tier} reducedMotion={profile.reducedMotion}/><ArrivalChamber selected={selected} phase={phase}/>
    <group name="life-map-far-future-horizon" data-depth-band="far"><Stars radius={78} depth={58} count={profile.tier === "low" ? 420 : profile.tier === "medium" ? 760 : 1200} factor={2} saturation={.14} fade speed={profile.reducedMotion?0:.035}/></group>
    <CinematicPostProcessing active={profile.postprocessing} reducedMotion={profile.reducedMotion}/>
  </>;
}
