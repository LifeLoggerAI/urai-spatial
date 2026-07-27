"use client";

import { Html, Line, Stars } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import CinematicPostProcessing from "@/spatial/cinematic/CinematicPostProcessing";
import type { SpatialQualityProfile } from "@/spatial/performance/useAdaptiveSpatialQuality";
import type { LifeMapNode } from "./lifeMapData";
import { LIFE_MAP_CORE_POSITION } from "./lifeMapLayout";
import { LIFE_MAP_SELECTION_EVENT, readLifeMapSelection } from "./lifeMapSelection";
import { LIFE_MAP_CHAPTERS, LIFE_MAP_PATH_PALETTE, artifactFamilyLabel, artifactImportance, chapterForNode, resolveArtifactFamily, resolvePathKind } from "./lifeMapVisualSystem";

export type LifeMapJourneyPhase = "overview" | "departure" | "travel" | "approach" | "arrival";
type Point3 = [number, number, number];
type ArtifactProps = { node: LifeMapNode; active: boolean };
const GOLD = "#ffd98a";
const ICE = "#dcf7ff";
const DEEP = "#030914";

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

function authoredCurve(points: Point3[]) {
  return new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)), false, "catmullrom", 0.28);
}

function Current({ points, color, opacity = 0.4, width = 0.014 }: { points: Point3[]; color: string; opacity?: number; width?: number }) {
  const path = useMemo(() => authoredCurve(points), [points]);
  return <mesh><tubeGeometry args={[path, 48, width, 7, false]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.7} transparent opacity={opacity} depthWrite={false} /></mesh>;
}

function Ground({ seed, position, scale, color, aura }: { seed: number; position: Point3; scale: Point3; color: string; aura: string }) {
  const shape = useMemo(() => {
    const next = new THREE.Shape();
    for (let index = 0; index <= 20; index += 1) {
      const angle = index / 20 * Math.PI * 2;
      const radius = 1 + Math.sin(angle * 3 + seed) * 0.08;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * 0.7 * radius;
      if (index === 0) next.moveTo(x, y); else next.lineTo(x, y);
    }
    next.closePath();
    return next;
  }, [seed]);
  return <mesh position={position} scale={scale} rotation={[-Math.PI / 2, 0, 0]} castShadow receiveShadow><extrudeGeometry args={[shape, { depth: 0.12, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.03, bevelSegments: 2 }]} /><meshPhysicalMaterial color={color} emissive={aura} emissiveIntensity={0.12} roughness={0.72} metalness={0.04} /></mesh>;
}

function Stone({ position, color, aura, scale = [0.2, 0.2, 0.2] }: { position: Point3; color: string; aura: string; scale?: Point3 }) {
  return <mesh position={position} scale={scale} castShadow><icosahedronGeometry args={[0.5, 2]} /><meshStandardMaterial color={color} emissive={aura} emissiveIntensity={0.18} roughness={0.82} /></mesh>;
}

function LifeCore({ reducedMotion, tier, hidden }: { reducedMotion: boolean; tier: SpatialQualityProfile["tier"]; hidden: boolean }) {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!group.current || reducedMotion) return;
    group.current.rotation.y = Math.sin(clock.elapsedTime * 0.18) * 0.08;
  });
  return <group ref={group} name="life-map-white-gold-life-core" position={LIFE_MAP_CORE_POSITION} visible={!hidden} data-life-core="white-gold-layered"><mesh scale={[0.58, 0.92, 0.58]}><icosahedronGeometry args={[0.62, 3]} /><meshPhysicalMaterial color="#fff4cf" emissive={GOLD} emissiveIntensity={1.3} roughness={0.25} clearcoat={0.7} /></mesh><pointLight color={GOLD} intensity={tier === "low" ? 5 : 8} distance={18} /></group>;
}

function ChapterTerritory({ index, aura }: { index: number; aura: string }) {
  return <group><Ground seed={index + 4} position={[0, -0.6, 0]} scale={[1.8, 1.15, 1]} color={index % 2 ? "#1b3340" : "#17313d"} aura={aura} /><Ground seed={index + 14} position={[0.12, -0.48, -0.12]} scale={[1.25, 0.78, 1]} color="#244b58" aura={aura} /><Current points={[[-1.2, -0.35, 0], [-0.5, 0.2, -0.2], [0.2, 0.45, -0.45], [1.2, 0.1, -0.1]]} color={aura} opacity={0.34} /></group>;
}

function ChapterConstellations({ selected }: { selected: LifeMapNode | null }) {
  if (selected) return null;
  return <group name="life-map-authored-chapter-regions" data-scale="cosmic-overview" data-depth-band="middle">{LIFE_MAP_CHAPTERS.map((chapter, index) => <group key={chapter.id} position={chapter.position} rotation={chapter.rotation} data-chapter-region={chapter.id}><ChapterTerritory index={index} aura={chapter.aura} />{[-0.8, 0, 0.8].map((x, point) => <Stone key={x} position={[x, 0.05 + point * 0.22, -0.2 - point * 0.18]} color={point === 1 ? ICE : chapter.aura} aura={chapter.aura} />)}</group>)}</group>;
}

function ForegroundObservatory({ selected }: { selected: LifeMapNode | null }) {
  if (selected) return null;
  return <group name="life-map-foreground-observatory" data-depth-band="near" position={[0, -1.7, 2.8]}><Ground seed={71} position={[0, 0, 0]} scale={[4.4, 1.3, 1]} color="#102a35" aura="#6fb2c8" /><Ground seed={74} position={[0, 0.12, -0.3]} scale={[2.8, 0.7, 1]} color="#1d4654" aura="#8de7ff" /></group>;
}

function OverviewLandmarks({ selected }: { selected: LifeMapNode | null }) {
  if (selected) return null;
  return <><group name="life-map-relationship-observatory" data-depth-band="middle" position={[5.5, 0.5, -7]}><Stone position={[-0.8, 0, 0]} color={ICE} aura="#8de7ff" /><Stone position={[0, 0.45, -0.35]} color={ICE} aura="#8de7ff" /><Stone position={[0.8, 0.1, -0.1]} color={ICE} aura="#8de7ff" /></group><group name="life-map-goal-horizon" data-depth-band="far" position={[-6.6, 2.2, -14.8]}><Current points={[[0, -0.6, 0], [0, 0.2, -0.2], [0.2, 1.4, -0.5]]} color={GOLD} opacity={0.55} /></group><group name="life-map-achievement-monument" data-depth-band="far" position={[7, -0.1, -12.5]}><Ground seed={102} position={[0, -0.4, 0]} scale={[0.8, 0.5, 1]} color="#4b391d" aura={GOLD} /></group><group name="life-map-privacy-vault" data-depth-band="far" position={[-7.2, -0.55, -10]}><mesh><torusGeometry args={[0.7, 0.1, 12, 48]} /><meshStandardMaterial color="#342845" emissive="#725c8f" emissiveIntensity={0.35} /></mesh></group><group name="life-map-emotional-weather" data-depth-band="far" position={[0, 3, -17]}><Current points={[[-7, 0, 0], [-3, 0.8, -1], [0, 0.3, -1.8], [3, 0.8, -1], [7, 0, 0]]} color="#69a7d1" opacity={0.16} /></group></>;
}

function VisualArtifact({ node, active }: ArtifactProps) { return <Stone position={[0, 0, 0]} color={ICE} aura={node.aura} scale={active ? [0.42, 0.55, 0.32] : [0.28, 0.36, 0.24]} />; }
function AudioArtifact({ node, active }: ArtifactProps) { return <group>{[-0.2, 0, 0.2].map((z, index) => <Current key={z} points={[[-0.45, 0, z], [-0.2, index * 0.08, z], [0.2, -index * 0.05, z], [0.45, 0, z]]} color={index === 1 ? ICE : node.aura} opacity={active ? 0.8 : 0.4} />)}</group>; }
function RelationshipArtifact({ node, active }: ArtifactProps) { return <group><Stone position={[-0.3, 0, 0]} color={ICE} aura={node.aura} /><Stone position={[0.3, 0.08, 0]} color={ICE} aura={node.aura} /><Line points={[[-0.3, 0, 0], [0.3, 0.08, 0]]} color={node.aura} lineWidth={active ? 1.2 : 0.6} /></group>; }
function PlaceArtifact({ node, active }: ArtifactProps) { return <Ground seed={161} position={[0, -0.2, 0]} scale={active ? [0.62, 0.46, 1] : [0.46, 0.34, 1]} color="#17404e" aura={node.aura} />; }
function EmotionArtifact({ node, active }: ArtifactProps) { return <mesh scale={active ? [0.42, 0.58, 0.42] : [0.28, 0.4, 0.28]}><icosahedronGeometry args={[0.5, 2]} /><meshPhysicalMaterial color="#fff4cf" emissive={node.aura} emissiveIntensity={active ? 1.2 : 0.55} roughness={0.3} /></mesh>; }
function PatternArtifact({ node, active }: ArtifactProps) { return <group>{[-0.22, 0, 0.22].map((y, index) => <Current key={y} points={[[-0.48, y, 0], [-0.2, y + 0.12, -0.1], [0.2, y - 0.08, -0.18], [0.48, y, 0]]} color={index === 1 ? ICE : node.aura} opacity={active ? 0.78 : 0.4} />)}</group>; }
function AchievementArtifact({ node, active }: ArtifactProps) { return <group>{[0, 1, 2].map((index) => <mesh key={index} position={[0, -0.2 + index * 0.18, -index * 0.06]}><cylinderGeometry args={[0.12 + index * 0.03, 0.18 + index * 0.03, 0.2, 10]} /><meshStandardMaterial color="#4b391d" emissive={GOLD} emissiveIntensity={active ? 0.5 : 0.2} /></mesh>)}</group>; }
function GoalArtifact({ node, active }: ArtifactProps) { return <Current points={[[0, -0.35, 0], [0, 0.1, -0.1], [0.2, 0.65, -0.25]]} color={active ? GOLD : node.aura} opacity={0.7} width={0.02} />; }
function FutureArtifact({ node, active }: ArtifactProps) { return <group>{[-0.25, 0, 0.25].map((x) => <mesh key={x} position={[x, 0.15, 0]}><coneGeometry args={[0.12, active ? 0.9 : 0.6, 10]} /><meshStandardMaterial color={node.aura} emissive={node.aura} emissiveIntensity={0.35} /></mesh>)}</group>; }
function EverydayArtifact({ node }: ArtifactProps) { return <Ground seed={241} position={[0, -0.15, 0]} scale={[0.42, 0.32, 1]} color="#1a3945" aura={node.aura} />; }
function ArchiveArtifact({ node }: ArtifactProps) { return <group>{[0, 1, 2].map((index) => <Ground key={index} seed={251 + index} position={[0, -0.2 + index * 0.1, -index * 0.05]} scale={[0.46 - index * 0.05, 0.3 - index * 0.03, 1]} color="#182732" aura={node.aura} />)}</group>; }
function ProtectedArtifact({ node }: ArtifactProps) { return <mesh><torusGeometry args={[0.35, 0.07, 10, 36]} /><meshStandardMaterial color="#32263f" emissive={node.aura} emissiveIntensity={0.28} /></mesh>; }

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
  const group = useRef<THREE.Group>(null);
  const active = selected?.id === node.id;
  const related = Boolean(selected && (selected.connectedTo.includes(node.id) || node.connectedTo.includes(selected.id)));
  const visible = !selected || active || (related && phase !== "arrival");
  const importance = artifactImportance(node);
  const chapter = chapterForNode(node, index);
  const semanticLabel = artifactFamilyLabel(node);
  useFrame(({ clock }) => {
    if (!group.current || reducedMotion) return;
    group.current.rotation.y = Math.sin(clock.elapsedTime * 0.1 + index) * 0.03;
  });
  return <group ref={group} position={node.position} visible={visible} name={`life-map-artifact-${resolveArtifactFamily(node)}-${node.id}`} data-artifact-family={resolveArtifactFamily(node)} data-importance={importance.toFixed(2)} data-chapter={chapter.id} data-semantic-label={semanticLabel}><group onClick={(event) => { event.stopPropagation(); onSelect(node); }}><ArtifactShape node={node} active={active} /></group><Html center position={[0, 0.72, 0]} distanceFactor={11} style={{ pointerEvents: "auto" }}><button className="life-map-world-label" data-life-map-node-id={node.id} data-active={active ? "true" : "false"} type="button" style={{ minWidth: 96, minHeight: 48, borderRadius: 999, border: `1px solid ${node.aura}88`, background: "rgba(5,18,28,.88)", color: "#f5fbff", padding: "8px 12px", font: "600 12px/1.2 system-ui", boxShadow: `0 8px 28px ${node.aura}33` }}><strong>{node.title}</strong></button></Html></group>;
}

function PathPulse({ curve, color, reducedMotion, offset }: { curve: THREE.QuadraticBezierCurve3; color: string; reducedMotion: boolean; offset: number }) {
  const pulse = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!pulse.current || reducedMotion) return;
    const t = (clock.elapsedTime * 0.055 + offset) % 1;
    pulse.current.position.copy(curve.getPoint(t));
  });
  return <mesh ref={pulse} position={curve.getPoint(offset % 1)} name="life-map-living-pulse"><icosahedronGeometry args={[0.04, 1]} /><meshBasicMaterial color={color} /></mesh>;
}

function SemanticPath({ source, target, active, reducedMotion, index }: { source: LifeMapNode; target: LifeMapNode; active: boolean; reducedMotion: boolean; index: number }) {
  const start = useMemo(() => new THREE.Vector3(...source.position), [source.position]);
  const end = useMemo(() => new THREE.Vector3(...target.position), [target.position]);
  const curve = useMemo(() => { const middle = start.clone().lerp(end, 0.5); middle.y += 0.8; return new THREE.QuadraticBezierCurve3(start, middle, end); }, [end, start]);
  const kind = resolvePathKind(source, target);
  const color = LIFE_MAP_PATH_PALETTE[kind];
  return <group data-path-kind={kind}><Line points={curve.getPoints(28)} color={color} lineWidth={active ? 1 : 0.45} transparent opacity={active ? 0.45 : 0.12} dashed={kind === "inferred" || kind === "corrected" || kind === "protected"} />{active ? <PathPulse curve={curve} color={color} reducedMotion={reducedMotion} offset={(index * 0.19) % 1} /> : null}</group>;
}

function LivingPaths({ nodes, selected, reducedMotion, phase }: { nodes: LifeMapNode[]; selected: LifeMapNode | null; reducedMotion: boolean; phase: LifeMapJourneyPhase }) {
  const byId = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  if (selected && phase === "arrival") return null;
  return <group name="life-map-curved-semantic-paths" data-path-system="curved-semantic" data-depth-band="middle">{nodes.flatMap((source, sourceIndex) => source.connectedTo.slice(0, 3).map((targetId, targetIndex) => { const target = byId.get(targetId); if (!target || target.id < source.id) return null; const active = selected?.id === source.id || selected?.id === target.id; if (selected && !active) return null; return <SemanticPath key={`${source.id}-${targetId}`} source={source} target={target} active={active} reducedMotion={reducedMotion} index={sourceIndex * 3 + targetIndex} />; }))}</group>;
}

function GroundingSanctuary({ selected, reducedMotion }: { selected: LifeMapNode; reducedMotion: boolean }) {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!group.current || reducedMotion) return;
    group.current.position.y = Math.sin(clock.elapsedTime * 0.25) * 0.025;
  });
  return <group ref={group} name="life-map-chamber-signature-pattern" data-grounding-language="settling-rhythm"><Ground seed={500} position={[0, -0.72, 0]} scale={[2.2, 1.25, 1]} color="#173b43" aura={selected.aura} /><Ground seed={501} position={[0, -0.58, -0.35]} scale={[1.55, 0.88, 1]} color="#2a555b" aura={selected.aura} /><group name="life-map-grounding-witness-stones">{[-1.1, -0.65, 0.65, 1.1].map((x) => <Stone key={x} position={[x, -0.3, -1]} color="#8fb8bb" aura={selected.aura} />)}</group>{[-0.3, 0, 0.3].map((y, index) => <Current key={y} points={[[-1.4, y, -1.15], [-0.7, y + 0.12, -1.45], [0, y - 0.05, -1.65], [0.7, y + 0.12, -1.45], [1.4, y, -1.15]]} color={index === 1 ? ICE : selected.aura} opacity={0.34} />)}</group>;
}

function ArrivalSanctuary({ selected, phase, reducedMotion }: { selected: LifeMapNode | null; phase: LifeMapJourneyPhase; reducedMotion: boolean }) {
  if (!selected || (phase !== "approach" && phase !== "arrival")) return null;
  const family = resolveArtifactFamily(selected);
  return <group position={selected.position} name="life-map-intimate-memory-chamber" data-scale="intimate" data-depth-band="near" data-chamber-family={family}><Ground seed={321} position={[0, -0.8, 0]} scale={[2.4, 1.4, 1]} color="#102f3a" aura={selected.aura} />{family === "pattern" ? <GroundingSanctuary selected={selected} reducedMotion={reducedMotion} /> : <group name={`life-map-chamber-signature-${family}`}><Stone position={[0, 0.1, -1]} color={ICE} aura={selected.aura} scale={[0.55, 0.8, 0.45]} /><Current points={[[-1.3, -0.1, -1], [0, 0.8, -1.6], [1.3, -0.1, -1]]} color={selected.aura} opacity={0.5} /></group>}<pointLight color={selected.aura} intensity={phase === "arrival" ? 3.2 : 1.2} distance={7} /></group>;
}

function ArchiveParticles({ qualityTier, reducedMotion }: { qualityTier: SpatialQualityProfile["tier"]; reducedMotion: boolean }) {
  const particleCount = qualityTier === "low" ? 80 : qualityTier === "medium" ? 150 : 240;
  return <group name="life-map-archive-particles" data-depth-band="far"><Stars radius={52} depth={36} count={particleCount} factor={1.12} saturation={0.28} fade speed={reducedMotion ? 0 : 0.012} /></group>;
}

export function LifeMapProductionWorld({ nodes, selected, phase, profile, onSelect, cameraRig, webglRecovery }: { nodes: LifeMapNode[]; selected: LifeMapNode | null; phase: LifeMapJourneyPhase; profile: SpatialQualityProfile; onSelect: (node: LifeMapNode) => void; cameraRig: ReactNode; webglRecovery: ReactNode }) {
  const { size } = useThree();
  const qualityTier = profile.tier;
  const starCount = profile.tier === "low" ? 420 : profile.tier === "medium" ? 760 : 1160;
  const portrait = size.height > size.width;
  const stageScale: Point3 = selected ? (portrait ? [0.92, 0.96, 0.92] : [1.12, 1.12, 1.08]) : portrait ? [0.5, 0.92, 0.74] : [1.12, 1.1, 1.04];
  const stagePosition: Point3 = selected ? (portrait ? [0, -0.08, 0.9] : [0, -0.16, 0.62]) : portrait ? [0, -0.36, 1.3] : [0, -0.28, 1.18];

  useEffect(() => {
    const handleWorldLabelClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest<HTMLButtonElement>("button.life-map-world-label[data-life-map-node-id]") : null;
      if (!target) return;
      const nodeId = target.dataset.lifeMapNodeId;
      const node = nodes.find((candidate) => candidate.id === nodeId);
      if (node) onSelect(node);
    };
    const handleSelectionRequest = (event: Event) => {
      const detail = readLifeMapSelection(event);
      if (!detail) return;
      const node = nodes.find((candidate) => candidate.id === detail.nodeId);
      if (node) onSelect(node);
    };
    document.addEventListener("click", handleWorldLabelClick, true);
    window.addEventListener(LIFE_MAP_SELECTION_EVENT, handleSelectionRequest);
    return () => {
      document.removeEventListener("click", handleWorldLabelClick, true);
      window.removeEventListener(LIFE_MAP_SELECTION_EVENT, handleSelectionRequest);
    };
  }, [nodes, onSelect]);

  return <><color attach="background" args={[DEEP]} /><fog attach="fog" args={[DEEP, 18, 76]} /><ambientLight intensity={0.78} color="#c7efff" /><directionalLight position={[7, 10, 8]} intensity={1.85} color="#e5f7ff" castShadow={profile.shadows} /><hemisphereLight args={["#d7f3ff", "#07111a", 0.82]} />{webglRecovery}<RenderProofRepublisher />{cameraRig}<group name="life-map-authored-environment" data-depth-band="far"><mesh><sphereGeometry args={[74, 36, 24]} /><meshBasicMaterial color="#091827" side={THREE.BackSide} /></mesh></group><group name="life-map-temporal-horizon" data-depth-band="far" /><group name="life-map-world-stage" scale={stageScale} position={stagePosition}><group name="life-map-temporal-landscape" data-depth-band="middle" /><LifeCore reducedMotion={profile.reducedMotion} tier={profile.tier} hidden={Boolean(selected)} /><group name="life-map-light-bridges" data-depth-band="middle" /><ChapterConstellations selected={selected} /><ForegroundObservatory selected={selected} /><OverviewLandmarks selected={selected} /><LivingPaths nodes={nodes} selected={selected} reducedMotion={profile.reducedMotion} phase={phase} /><group name="life-map-memory-artifact-families" data-depth-band="middle">{nodes.map((node, index) => <MemoryArtifact key={node.id} node={node} index={index} selected={selected} phase={phase} reducedMotion={profile.reducedMotion} onSelect={onSelect} />)}</group><group name="life-map-selected-relationship-context" data-depth-band="middle" /><ArrivalSanctuary selected={selected} phase={phase} reducedMotion={profile.reducedMotion} /></group><ArchiveParticles qualityTier={qualityTier} reducedMotion={profile.reducedMotion} /><group name="life-map-far-future-horizon" data-depth-band="far"><Stars radius={78} depth={58} count={starCount} factor={1.42} saturation={0.22} fade speed={profile.reducedMotion ? 0 : 0.018} /></group><CinematicPostProcessing active={profile.postprocessing} reducedMotion={profile.reducedMotion} /></>;
}
