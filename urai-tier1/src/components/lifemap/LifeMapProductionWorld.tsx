"use client";

import { Line, Sparkles, Stars } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import CinematicPostProcessing from "@/spatial/cinematic/CinematicPostProcessing";
import type { SpatialQualityProfile } from "@/spatial/performance/useAdaptiveSpatialQuality";
import type { LifeMapNode } from "./lifeMapData";
import { LIFE_MAP_CORE_POSITION } from "./lifeMapLayout";
import { LIFE_MAP_SELECTION_EVENT, readLifeMapSelection } from "./lifeMapSelection";
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
type Point3 = [number, number, number];
type ArtifactProps = { node: LifeMapNode; active: boolean };
const DEEP = "#01030a";
const GOLD = "#ffd98a";
const ICE = "#dff8ff";

function RenderProofRepublisher() {
  const { gl, scene } = useThree();
  const root = useRef<HTMLElement | null>(null);
  const frames = useRef(0);
  const invalidated = useRef(true);
  const invalidationFrame = useRef<number | null>(null);
  const lastSignature = useRef("");

  useEffect(() => {
    const canvas = gl.domElement;
    root.current = canvas.closest<HTMLElement>('[data-testid="urai-true-3d-life-map"]');
    const writeInvalid = () => {
      const element = root.current;
      if (element) {
        element.dataset.lifeMapRenderReady = "false";
        element.dataset.lifeMapVisibleObjects = "0";
        element.dataset.lifeMapVisibleAnchors = "0";
        element.dataset.lifeMapRenderCalls = "0";
        element.dataset.lifeMapRenderTriangles = "0";
      }
      if (invalidated.current) invalidationFrame.current = window.requestAnimationFrame(writeInvalid);
    };
    const invalidate = () => {
      invalidated.current = true;
      frames.current = 0;
      lastSignature.current = "";
      if (invalidationFrame.current !== null) window.cancelAnimationFrame(invalidationFrame.current);
      writeInvalid();
    };
    canvas.addEventListener("webglcontextlost", invalidate, false);
    canvas.addEventListener("webglcontextrestored", invalidate, false);
    invalidate();
    return () => {
      invalidated.current = false;
      if (invalidationFrame.current !== null) window.cancelAnimationFrame(invalidationFrame.current);
      canvas.removeEventListener("webglcontextlost", invalidate, false);
      canvas.removeEventListener("webglcontextrestored", invalidate, false);
    };
  }, [gl]);

  useFrame(() => {
    frames.current += 1;
    if (frames.current < 4) return;
    let objects = 0;
    let anchors = 0;
    scene.traverse((object) => {
      if (object.visible) objects += 1;
      if (object.visible && object.name.startsWith("life-map-")) anchors += 1;
    });
    const calls = gl.info.render.calls;
    const triangles = gl.info.render.triangles;
    const signature = `${objects}:${anchors}:${calls}:${triangles}`;
    if (!invalidated.current && lastSignature.current === signature) return;
    invalidated.current = false;
    if (invalidationFrame.current !== null) {
      window.cancelAnimationFrame(invalidationFrame.current);
      invalidationFrame.current = null;
    }
    lastSignature.current = signature;
    const element = root.current ?? gl.domElement.closest<HTMLElement>('[data-testid="urai-true-3d-life-map"]');
    if (!element) return;
    element.dataset.lifeMapRenderReady = calls > 0 && objects > 20 && anchors >= 8 ? "true" : "false";
    element.dataset.lifeMapVisibleObjects = String(objects);
    element.dataset.lifeMapVisibleAnchors = String(anchors);
    element.dataset.lifeMapRenderCalls = String(calls);
    element.dataset.lifeMapRenderTriangles = String(triangles);
  });
  return null;
}

function seeded(index: number, salt: number) {
  const value = Math.sin(index * 91.317 + salt * 13.77) * 43758.5453;
  return value - Math.floor(value);
}

function authoredCurve(points: Point3[]) {
  return new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)), false, "catmullrom", 0.28);
}

function Current({ points, color, opacity = 0.4, width = 0.014 }: { points: Point3[]; color: string; opacity?: number; width?: number }) {
  const path = useMemo(() => authoredCurve(points), [points]);
  return (
    <mesh>
      <tubeGeometry args={[path, 64, width, 8, false]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.75} transparent opacity={opacity} depthWrite={false} />
    </mesh>
  );
}

function Island({ seed, position, scale, color, aura }: { seed: number; position: Point3; scale: Point3; color: string; aura: string }) {
  const shape = useMemo(() => {
    const next = new THREE.Shape();
    for (let index = 0; index <= 36; index += 1) {
      const angle = index / 36 * Math.PI * 2;
      const radius = 1 + Math.sin(angle * 3 + seed) * 0.1 + Math.cos(angle * 5 - seed) * 0.045;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * 0.68 * radius;
      if (index === 0) next.moveTo(x, y); else next.lineTo(x, y);
    }
    next.closePath();
    return next;
  }, [seed]);
  return (
    <mesh position={position} scale={scale} rotation={[-Math.PI / 2, 0, seeded(seed, 3) * 0.3]} castShadow receiveShadow>
      <extrudeGeometry args={[shape, { depth: 0.15, bevelEnabled: true, bevelSize: 0.055, bevelThickness: 0.045, bevelSegments: 3 }]} />
      <meshPhysicalMaterial color={color} emissive={aura} emissiveIntensity={0.13} roughness={0.66} metalness={0.11} clearcoat={0.18} />
    </mesh>
  );
}

function Crystal({ position, color, aura, scale = [0.22, 0.32, 0.22] }: { position: Point3; color: string; aura: string; scale?: Point3 }) {
  return (
    <mesh position={position} scale={scale} castShadow>
      <octahedronGeometry args={[0.7, 2]} />
      <meshPhysicalMaterial color={color} emissive={aura} emissiveIntensity={0.42} roughness={0.2} clearcoat={0.86} iridescence={0.24} />
    </mesh>
  );
}

function LifeCore({ hidden, reducedMotion, tier }: { hidden: boolean; reducedMotion: boolean; tier: SpatialQualityProfile["tier"] }) {
  const root = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!root.current || reducedMotion) return;
    root.current.rotation.y = clock.elapsedTime * 0.08;
    root.current.rotation.z = Math.sin(clock.elapsedTime * 0.18) * 0.08;
  });
  return (
    <group ref={root} name="life-map-white-gold-life-core" position={LIFE_MAP_CORE_POSITION} visible={!hidden} data-life-core="white-gold-layered">
      {[1, 1.45, 1.95].map((scale, index) => (
        <mesh key={scale} scale={scale} rotation={[index * 0.46, index * 0.72, 0]}>
          <torusKnotGeometry args={[0.62, 0.032 + index * 0.011, 160, 20, 2 + index, 3]} />
          <meshBasicMaterial color={index === 1 ? ICE : GOLD} transparent opacity={0.76 - index * 0.14} toneMapped={false} />
        </mesh>
      ))}
      <mesh scale={[0.66, 0.92, 0.66]} castShadow>
        <icosahedronGeometry args={[0.72, 4]} />
        <meshPhysicalMaterial color="#fff5d6" emissive={GOLD} emissiveIntensity={2.15} transmission={0.24} roughness={0.08} clearcoat={1} iridescence={0.38} />
      </mesh>
      <pointLight color={GOLD} intensity={tier === "low" ? 7 : 13} distance={28} decay={2} />
    </group>
  );
}

function ChapterTerritories({ selected }: { selected: LifeMapNode | null }) {
  if (selected) return null;
  return (
    <group name="life-map-authored-chapter-regions" data-scale="cosmic-overview" data-depth-band="middle">
      {LIFE_MAP_CHAPTERS.map((chapter, index) => (
        <group key={chapter.id} position={chapter.position} rotation={chapter.rotation} data-chapter-region={chapter.id}>
          <Island seed={index + 7} position={[0, -0.68, 0]} scale={[2.1, 1.42, 1]} color={index % 2 ? "#132b3d" : "#102735"} aura={chapter.aura} />
          <Island seed={index + 21} position={[0.16, -0.49, -0.14]} scale={[1.38, 0.85, 1]} color="#1d4350" aura={chapter.aura} />
          <Current points={[[-1.35, -0.24, 0.1], [-0.55, 0.22, -0.25], [0.25, 0.42, -0.42], [1.35, 0.08, -0.08]]} color={chapter.aura} opacity={0.3} width={0.022} />
          {[-0.86, 0, 0.86].map((x, point) => <Crystal key={x} position={[x, 0.08 + point * 0.24, -0.18 - point * 0.16]} color={point === 1 ? ICE : chapter.aura} aura={chapter.aura} />)}
        </group>
      ))}
    </group>
  );
}

function ForegroundObservatory({ selected }: { selected: LifeMapNode | null }) {
  if (selected) return null;
  return (
    <group name="life-map-foreground-observatory" data-depth-band="near" position={[0, -1.8, 3.2]}>
      <Island seed={71} position={[0, 0, 0]} scale={[4.9, 1.45, 1]} color="#081b28" aura="#6fb2c8" />
      <Island seed={74} position={[0, 0.14, -0.35]} scale={[3.05, 0.78, 1]} color="#153b49" aura="#8de7ff" />
      <mesh position={[0, 0.46, -0.8]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.4, 2.55, 128]} />
        <meshBasicMaterial color="#8de7ff" transparent opacity={0.12} toneMapped={false} />
      </mesh>
    </group>
  );
}

function OverviewLandmarks({ selected }: { selected: LifeMapNode | null }) {
  if (selected) return null;
  return (
    <>
      <group name="life-map-relationship-observatory" data-depth-band="middle" position={[5.7, 0.55, -7.2]}>
        <Crystal position={[-0.9, 0, 0]} color={ICE} aura="#8de7ff" scale={[0.32, 0.52, 0.32]} />
        <Crystal position={[0, 0.55, -0.38]} color={ICE} aura="#8de7ff" scale={[0.4, 0.68, 0.4]} />
        <Crystal position={[0.9, 0.12, -0.1]} color={ICE} aura="#8de7ff" scale={[0.32, 0.52, 0.32]} />
      </group>
      <group name="life-map-goal-horizon" data-depth-band="far" position={[-6.8, 2.3, -15.6]}>
        <Current points={[[0, -0.8, 0], [0, 0.2, -0.2], [0.25, 1.8, -0.6]]} color={GOLD} opacity={0.62} width={0.032} />
        <pointLight color={GOLD} intensity={3.4} distance={12} decay={2} />
      </group>
      <group name="life-map-achievement-monument" data-depth-band="far" position={[7.2, -0.1, -13.4]}>
        {[0, 1, 2, 3].map((level) => <Island key={level} seed={102 + level} position={[0, -0.5 + level * 0.2, 0]} scale={[1.05 - level * 0.16, 0.62 - level * 0.08, 1]} color="#473719" aura={GOLD} />)}
      </group>
      <group name="life-map-privacy-vault" data-depth-band="far" position={[-7.4, -0.5, -10.5]}>
        {[0.72, 1.02, 1.34].map((radius, index) => <mesh key={radius} rotation={[Math.PI / 2, index * 0.65, 0]}><torusGeometry args={[radius, 0.075 - index * 0.012, 16, 96]} /><meshStandardMaterial color="#342845" emissive="#725c8f" emissiveIntensity={0.38} /></mesh>)}
      </group>
    </>
  );
}

function MemoryWeather({ reducedMotion }: { reducedMotion: boolean }) {
  const root = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!root.current || reducedMotion) return;
    root.current.rotation.z = Math.sin(clock.elapsedTime * 0.04) * 0.04;
  });
  return (
    <group ref={root} name="life-map-emotional-weather" data-depth-band="far" position={[0, 5.8, -20]}>
      {[-8, -4, 0, 4, 8].map((x, index) => (
        <Current key={x} points={[[x - 3, Math.sin(index) * 0.8, 0], [x, 1.2 + Math.cos(index) * 0.5, -1.8], [x + 3.2, Math.sin(index * 2) * 0.8, -0.2]]} color={index % 2 ? "#a78bfa" : "#6fdcff"} opacity={0.12} width={0.05} />
      ))}
    </group>
  );
}

function VisualArtifact({ node, active }: ArtifactProps) {
  return <mesh scale={active ? [0.62, 0.78, 0.18] : [0.42, 0.54, 0.14]} castShadow><boxGeometry args={[1, 1, 1]} /><meshPhysicalMaterial color={ICE} emissive={node.aura} emissiveIntensity={active ? 1.4 : 0.65} roughness={0.18} clearcoat={1} /></mesh>;
}
function AudioArtifact({ node, active }: ArtifactProps) {
  return <group>{[-0.26, 0, 0.26].map((z, index) => <Current key={z} points={[[-0.55, 0, z], [-0.2, index * 0.14, z], [0.2, -index * 0.08, z], [0.55, 0, z]]} color={index === 1 ? ICE : node.aura} opacity={active ? 0.9 : 0.46} width={0.027} />)}</group>;
}
function RelationshipArtifact({ node, active }: ArtifactProps) {
  return <group><Crystal position={[-0.34, 0, 0]} color={ICE} aura={node.aura} scale={active ? [0.34, 0.54, 0.34] : [0.24, 0.38, 0.24]} /><Crystal position={[0.34, 0.1, 0]} color={ICE} aura={node.aura} scale={active ? [0.34, 0.54, 0.34] : [0.24, 0.38, 0.24]} /><Line points={[[-0.34, 0, 0], [0.34, 0.1, 0]]} color={node.aura} lineWidth={active ? 1.2 : 0.65} /></group>;
}
function PlaceArtifact({ node, active }: ArtifactProps) {
  return <Island seed={161} position={[0, -0.22, 0]} scale={active ? [0.76, 0.56, 1] : [0.54, 0.4, 1]} color="#123c4b" aura={node.aura} />;
}
function EmotionArtifact({ node, active }: ArtifactProps) {
  return <mesh scale={active ? [0.58, 0.72, 0.58] : [0.38, 0.48, 0.38]} castShadow><dodecahedronGeometry args={[0.62, 2]} /><meshPhysicalMaterial color="#fff4cf" emissive={node.aura} emissiveIntensity={active ? 1.9 : 0.8} transmission={0.15} roughness={0.18} clearcoat={1} /></mesh>;
}
function PatternArtifact({ node, active }: ArtifactProps) {
  return <group>{[-0.22, 0, 0.22].map((y, index) => <Current key={y} points={[[-0.52, y, 0], [-0.2, y + 0.16, -0.12], [0.2, y - 0.1, -0.2], [0.52, y, 0]]} color={index === 1 ? ICE : node.aura} opacity={active ? 0.86 : 0.42} width={0.023} />)}</group>;
}
function AchievementArtifact({ node, active }: ArtifactProps) {
  return <group>{[0, 1, 2, 3].map((level) => <mesh key={level} position={[0, -0.28 + level * 0.16, -level * 0.05]}><cylinderGeometry args={[0.14 + level * 0.035, 0.2 + level * 0.035, 0.18, 12]} /><meshStandardMaterial color="#4b391d" emissive={GOLD} emissiveIntensity={active ? 0.7 : 0.28} /></mesh>)}</group>;
}
function GoalArtifact({ node, active }: ArtifactProps) {
  return <group><Current points={[[0, -0.4, 0], [0, 0.12, -0.12], [0.22, 0.78, -0.28]]} color={active ? GOLD : node.aura} opacity={0.82} width={0.03} /><mesh position={[0.22, 0.78, -0.28]}><coneGeometry args={[0.13, 0.48, 12]} /><meshBasicMaterial color={GOLD} toneMapped={false} /></mesh></group>;
}
function FutureArtifact({ node, active }: ArtifactProps) {
  return <group>{[-0.3, 0, 0.3].map((x) => <mesh key={x} position={[x, 0.18, 0]}><coneGeometry args={[0.14, active ? 1.05 : 0.7, 12]} /><meshStandardMaterial color={node.aura} emissive={node.aura} emissiveIntensity={0.5} /></mesh>)}</group>;
}
function EverydayArtifact({ node }: ArtifactProps) {
  return <Island seed={241} position={[0, -0.16, 0]} scale={[0.44, 0.32, 1]} color="#153442" aura={node.aura} />;
}
function ArchiveArtifact({ node }: ArtifactProps) {
  return <group>{[0, 1, 2].map((index) => <Island key={index} seed={251 + index} position={[0, -0.22 + index * 0.11, -index * 0.06]} scale={[0.48 - index * 0.05, 0.32 - index * 0.03, 1]} color="#142631" aura={node.aura} />)}</group>;
}
function ProtectedArtifact({ node }: ArtifactProps) {
  return <group>{[0.38, 0.54, 0.7].map((radius, index) => <mesh key={radius} rotation={[Math.PI / 2, index * 0.72, 0]}><torusGeometry args={[radius, 0.055 - index * 0.008, 12, 72]} /><meshStandardMaterial color="#32263f" emissive={node.aura} emissiveIntensity={0.34} /></mesh>)}</group>;
}

function ArtifactShape(props: ArtifactProps) {
  const family = resolveArtifactFamily(props.node);
  if (family === "visual") return <VisualArtifact {...props} />;
  if (family === "audio") return <AudioArtifact {...props} />;
  if (family === "relationship") return <RelationshipArtifact {...props} />;
  if (family === "place") return <PlaceArtifact {...props} />;
  if (family === "emotion") return <EmotionArtifact {...props} />;
  if (family === "pattern") return <PatternArtifact {...props} />;
  if (family === "achievement") return <AchievementArtifact {...props} />;
  if (family === "goal") return <GoalArtifact {...props} />;
  if (family === "future") return <FutureArtifact {...props} />;
  if (family === "archive") return <ArchiveArtifact {...props} />;
  if (family === "protected") return <ProtectedArtifact {...props} />;
  return <EverydayArtifact {...props} />;
}

function MemoryArtifact({ node, index, selected, phase, reducedMotion, onSelect }: { node: LifeMapNode; index: number; selected: LifeMapNode | null; phase: LifeMapJourneyPhase; reducedMotion: boolean; onSelect: (node: LifeMapNode) => void }) {
  const root = useRef<THREE.Group>(null);
  const active = selected?.id === node.id;
  const related = Boolean(selected && (selected.connectedTo.includes(node.id) || node.connectedTo.includes(selected.id)));
  const visible = !selected || active || (related && phase !== "arrival");
  const importance = artifactImportance(node);
  const chapter = chapterForNode(node, index);
  const semanticLabel = artifactFamilyLabel(node);
  useFrame(({ clock }) => {
    if (!root.current || reducedMotion) return;
    root.current.rotation.y = Math.sin(clock.elapsedTime * 0.12 + index) * 0.045;
    root.current.position.y = node.position[1] + Math.sin(clock.elapsedTime * 0.32 + index * 0.7) * 0.08;
  });
  return (
    <group
      ref={root}
      position={node.position}
      visible={visible}
      scale={active ? 1.72 : 0.9 + importance * 0.38}
      name={`life-map-artifact-${resolveArtifactFamily(node)}-${node.id}`}
      data-artifact-family={resolveArtifactFamily(node)}
      data-importance={importance.toFixed(2)}
      data-chapter={chapter.id}
      data-semantic-label={semanticLabel}
      onClick={(event) => { event.stopPropagation(); onSelect(node); }}
    >
      <ArtifactShape node={node} active={active} />
      <pointLight color={node.aura} intensity={active ? 7 : 2.2} distance={active ? 13 : 6} decay={2} />
    </group>
  );
}

function PathPulse({ curve, color, reducedMotion, offset }: { curve: THREE.QuadraticBezierCurve3; color: string; reducedMotion: boolean; offset: number }) {
  const pulse = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!pulse.current || reducedMotion) return;
    const t = (clock.elapsedTime * 0.055 + offset) % 1;
    pulse.current.position.copy(curve.getPoint(t));
  });
  return <mesh ref={pulse} position={curve.getPoint(offset % 1)} name="life-map-living-pulse"><octahedronGeometry args={[0.055, 1]} /><meshBasicMaterial color={color} toneMapped={false} /></mesh>;
}

function SemanticPath({ source, target, active, reducedMotion, index }: { source: LifeMapNode; target: LifeMapNode; active: boolean; reducedMotion: boolean; index: number }) {
  const start = useMemo(() => new THREE.Vector3(...source.position), [source.position]);
  const end = useMemo(() => new THREE.Vector3(...target.position), [target.position]);
  const curve = useMemo(() => {
    const middle = start.clone().lerp(end, 0.5);
    middle.y += 0.85 + start.distanceTo(end) * 0.045;
    middle.z -= 0.28;
    return new THREE.QuadraticBezierCurve3(start, middle, end);
  }, [end, start]);
  const kind = resolvePathKind(source, target);
  const color = LIFE_MAP_PATH_PALETTE[kind];
  return (
    <group data-path-kind={kind}>
      <Line points={curve.getPoints(36)} color={color} lineWidth={active ? 1.05 : 0.48} transparent opacity={kind === "protected" ? 0.08 : active ? 0.48 : 0.14} dashed={kind === "inferred" || kind === "corrected" || kind === "protected"} />
      {active && kind !== "protected" ? <PathPulse curve={curve} color={color} reducedMotion={reducedMotion} offset={(index * 0.19) % 1} /> : null}
    </group>
  );
}

function LivingPaths({ nodes, selected, reducedMotion, phase }: { nodes: LifeMapNode[]; selected: LifeMapNode | null; reducedMotion: boolean; phase: LifeMapJourneyPhase }) {
  const links = useMemo(() => {
    const byId = new Map(nodes.map((node) => [node.id, node]));
    const seen = new Set<string>();
    const result: Array<{ source: LifeMapNode; target: LifeMapNode }> = [];
    for (const source of nodes) {
      for (const targetId of source.connectedTo) {
        const target = byId.get(targetId);
        if (!target) continue;
        const key = [source.id, target.id].sort().join(":");
        if (seen.has(key)) continue;
        seen.add(key);
        result.push({ source, target });
      }
    }
    return result;
  }, [nodes]);
  return (
    <group name="life-map-curved-semantic-paths" data-depth-band="middle">
      {links.map((link, index) => {
        const active = Boolean(selected && (selected.id === link.source.id || selected.id === link.target.id));
        if (selected && phase === "arrival" && !active) return null;
        return <SemanticPath key={`${link.source.id}:${link.target.id}`} source={link.source} target={link.target} active={active} reducedMotion={reducedMotion} index={index} />;
      })}
    </group>
  );
}

function ArrivalSanctuary({ selected, phase }: { selected: LifeMapNode | null; phase: LifeMapJourneyPhase }) {
  if (!selected || phase !== "arrival") return null;
  return (
    <group name="life-map-selected-arrival-sanctuary" data-scale="intimate" data-depth-band="near" position={selected.position}>
      <mesh position={[0, -1.12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.3, 4.6, 160]} />
        <meshBasicMaterial color={selected.aura} transparent opacity={0.13} toneMapped={false} />
      </mesh>
      {[2.2, 3.15, 4.2].map((radius, index) => <mesh key={radius} rotation={[Math.PI / 2, index * 0.7, 0]}><torusGeometry args={[radius, 0.026, 12, 160]} /><meshBasicMaterial color={index === 1 ? GOLD : selected.aura} transparent opacity={0.26 - index * 0.04} toneMapped={false} /></mesh>)}
      <pointLight color={selected.aura} intensity={12} distance={28} decay={2} />
    </group>
  );
}

function ArchiveParticles({ qualityTier, reducedMotion }: { qualityTier: SpatialQualityProfile["tier"]; reducedMotion: boolean }) {
  return (
    <group name="life-map-archive-particles" data-depth-band="far">
      <Stars radius={58} depth={38} count={qualityTier === "low" ? 150 : qualityTier === "medium" ? 260 : 420} factor={1.1} saturation={0.2} fade speed={reducedMotion ? 0 : 0.012} />
    </group>
  );
}

export function LifeMapProductionWorld({ nodes, selected, phase, profile, onSelect, cameraRig, webglRecovery }: {
  nodes: LifeMapNode[];
  selected: LifeMapNode | null;
  phase: LifeMapJourneyPhase;
  profile: SpatialQualityProfile;
  onSelect: (node: LifeMapNode) => void;
  cameraRig: ReactNode;
  webglRecovery: ReactNode;
}) {
  const { size } = useThree();
  const portrait = size.height > size.width;
  const stageScale: Point3 = selected ? (portrait ? [0.92, 0.96, 0.92] : [1.12, 1.12, 1.08]) : portrait ? [0.5, 0.92, 0.74] : [1.12, 1.1, 1.04];
  const stagePosition: Point3 = selected ? (portrait ? [0, -0.08, 0.9] : [0, -0.16, 0.62]) : portrait ? [0, -0.36, 1.3] : [0, -0.28, 1.18];
  const starCount = profile.tier === "low" ? 620 : profile.tier === "medium" ? 1100 : 1900;

  useEffect(() => {
    const handleSelectionRequest = (event: Event) => {
      const detail = readLifeMapSelection(event);
      if (!detail) return;
      const node = nodes.find((candidate) => candidate.id === detail.nodeId);
      if (node) onSelect(node);
    };
    window.addEventListener(LIFE_MAP_SELECTION_EVENT, handleSelectionRequest);
    return () => window.removeEventListener(LIFE_MAP_SELECTION_EVENT, handleSelectionRequest);
  }, [nodes, onSelect]);

  return (
    <>
      <color attach="background" args={[DEEP]} />
      <fog attach="fog" args={["#061020", 18, 92]} />
      <ambientLight intensity={0.58} color="#d6efff" />
      <hemisphereLight args={["#e5f7ff", "#02040a", 1.08]} />
      <directionalLight position={[9, 14, 10]} intensity={2.65} color="#dff6ff" castShadow={profile.shadows} shadow-mapSize={[2048, 2048]} />
      <directionalLight position={[-10, 8, -16]} intensity={1.28} color="#a78bfa" />
      {webglRecovery}
      <RenderProofRepublisher />
      {cameraRig}
      <group name="life-map-authored-environment" data-depth-band="far"><mesh><sphereGeometry args={[86, 40, 28]} /><meshBasicMaterial color="#030916" side={THREE.BackSide} /></mesh></group>
      <group name="life-map-temporal-horizon" data-depth-band="far" />
      <group name="life-map-world-stage" scale={stageScale} position={stagePosition}>
        <group name="life-map-temporal-landscape" data-depth-band="middle" />
        <LifeCore hidden={Boolean(selected)} reducedMotion={profile.reducedMotion} tier={profile.tier} />
        <group name="life-map-light-bridges" data-depth-band="middle"><LivingPaths nodes={nodes} selected={selected} reducedMotion={profile.reducedMotion} phase={phase} /></group>
        <ChapterTerritories selected={selected} />
        <ForegroundObservatory selected={selected} />
        <OverviewLandmarks selected={selected} />
        <group name="life-map-memory-artifact-families" data-depth-band="middle">
          {nodes.map((node, index) => <MemoryArtifact key={node.id} node={node} index={index} selected={selected} phase={phase} reducedMotion={profile.reducedMotion} onSelect={onSelect} />)}
        </group>
        <group name="life-map-selected-relationship-context" data-depth-band="middle" />
        <ArrivalSanctuary selected={selected} phase={phase} />
      </group>
      <MemoryWeather reducedMotion={profile.reducedMotion} />
      <ArchiveParticles qualityTier={profile.tier} reducedMotion={profile.reducedMotion} />
      <group name="life-map-far-future-horizon" data-depth-band="far">
        <Stars radius={120} depth={84} count={starCount} factor={2.05} saturation={0.18} fade speed={profile.reducedMotion ? 0 : 0.018} />
        <Sparkles count={profile.tier === "low" ? 70 : 160} scale={[48, 26, 72]} position={[0, 3, -18]} size={1.05} speed={profile.reducedMotion ? 0 : 0.08} opacity={0.18} color="#d9f7ff" />
      </group>
      <CinematicPostProcessing active={profile.postprocessing} reducedMotion={profile.reducedMotion} />
    </>
  );
}
