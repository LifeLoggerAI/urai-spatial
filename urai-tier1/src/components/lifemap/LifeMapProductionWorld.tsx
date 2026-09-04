"use client";

import { Line, Sparkles, Stars, useAnimations, useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";
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

const LifeMapReducedMotionContext = createContext(false);
const MEMORY_STAR_MODEL = "/assets/urai/generated/models/life-map-memory-star-v1.glb";
const MEMORY_CHAMBER_MODEL = "/assets/urai/generated/models/focus-memory-chamber-v1.glb";
const DEEP = "#01030a";
const GOLD = "#ffd98a";
const ICE = "#dff8ff";
const CYAN = "#78e7ff";
const VIOLET = "#b18cff";

function hideRejectedMemoryStarPresentationNode(name: string) {
  return name === "memory-star-heart" || name.startsWith("memory-star-orbit-");
}

function prepareAuthoredModel(source: THREE.Object3D, aura: string, shouldHideNode?: (name: string) => boolean) {
  const clone = source.clone(true);
  const auraColor = new THREE.Color(aura);
  clone.traverse((object) => {
    if (shouldHideNode?.(object.name)) {
      object.visible = false;
      return;
    }
    if (!(object instanceof THREE.Mesh)) return;
    object.castShadow = true;
    object.receiveShadow = true;
    object.frustumCulled = true;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    const next = materials.map((material) => {
      const cloned = material.clone();
      if (cloned instanceof THREE.MeshStandardMaterial) {
        cloned.emissive.copy(auraColor);
        cloned.emissiveIntensity = Math.max(cloned.emissiveIntensity, 0.5);
        cloned.roughness = Math.min(cloned.roughness, 0.48);
        if (cloned instanceof THREE.MeshPhysicalMaterial) cloned.clearcoat = Math.max(cloned.clearcoat, 0.35);
      }
      return cloned;
    });
    object.material = Array.isArray(object.material) ? next : next[0];
  });
  clone.userData.runtimeAsset = source.userData.runtimeAsset || "authored-life-map-asset";
  return clone;
}

function RenderProofRepublisher() {
  const { gl, scene, invalidate: requestRender } = useThree();
  const root = useRef<HTMLElement | null>(null);
  const frames = useRef(0);
  const invalidated = useRef(true);
  const invalidationFrame = useRef<number | null>(null);
  const lastSignature = useRef("");
  const lastSampleFrame = useRef(0);

  const resolveOwner = useCallback(() => {
    const element = gl.domElement.closest<HTMLElement>('[data-testid="urai-true-3d-life-map"]')
      ?? document.querySelector<HTMLElement>('[data-testid="urai-true-3d-life-map"]');
    root.current = element;
    return element;
  }, [gl]);

  const publishSnapshot = useCallback(() => {
    let objects = 0;
    let anchors = 0;
    scene.traverse((object) => {
      if (object.visible) objects += 1;
      if (object.visible && object.name.startsWith("life-map-")) anchors += 1;
    });
    const calls = gl.info.render.calls;
    const triangles = gl.info.render.triangles;
    const ready = calls > 0 && objects > 20 && anchors >= 8;
    const signature = `${objects}:${anchors}:${calls}:${triangles}`;
    const element = resolveOwner();
    if (!element) return false;
    if (lastSignature.current !== signature || invalidated.current) {
      lastSignature.current = signature;
      element.dataset.lifeMapRenderReady = ready ? "true" : "false";
      element.dataset.lifeMapVisibleObjects = String(objects);
      element.dataset.lifeMapVisibleAnchors = String(anchors);
      element.dataset.lifeMapRenderCalls = String(calls);
      element.dataset.lifeMapRenderTriangles = String(triangles);
    }
    if (ready) invalidated.current = false;
    return ready;
  }, [gl, resolveOwner, scene]);

  useEffect(() => {
    const canvas = gl.domElement;
    const writeInvalid = () => {
      if (!invalidated.current) return;
      const element = resolveOwner();
      if (element) {
        element.dataset.lifeMapRenderReady = "false";
        element.dataset.lifeMapVisibleObjects = "0";
        element.dataset.lifeMapVisibleAnchors = "0";
        element.dataset.lifeMapRenderCalls = "0";
        element.dataset.lifeMapRenderTriangles = "0";
      }
    };
    const markInvalid = () => {
      invalidated.current = true;
      frames.current = 0;
      lastSampleFrame.current = 0;
      lastSignature.current = "";
      if (invalidationFrame.current !== null) window.cancelAnimationFrame(invalidationFrame.current);
      requestRender();
      writeInvalid();
    };
    const watchdog = window.setInterval(() => {
      if (!invalidated.current) return;
      requestRender();
      publishSnapshot();
    }, 100);
    canvas.addEventListener("webglcontextlost", markInvalid, false);
    canvas.addEventListener("webglcontextrestored", markInvalid, false);
    markInvalid();
    return () => {
      invalidated.current = false;
      window.clearInterval(watchdog);
      if (invalidationFrame.current !== null) window.cancelAnimationFrame(invalidationFrame.current);
      canvas.removeEventListener("webglcontextlost", markInvalid, false);
      canvas.removeEventListener("webglcontextrestored", markInvalid, false);
    };
  }, [gl, publishSnapshot, requestRender, resolveOwner]);

  useFrame(() => {
    frames.current += 1;
    if (frames.current < 4) {
      requestRender();
      return;
    }
    if (!invalidated.current && frames.current - lastSampleFrame.current < 30) return;
    lastSampleFrame.current = frames.current;
    publishSnapshot();
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
      <tubeGeometry args={[path, 72, width, 10, false]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.2} transparent opacity={opacity} depthWrite={false} blending={THREE.AdditiveBlending} />
    </mesh>
  );
}

function FieldParticles({ seed, count, radius, depth, height, color, opacity = 0.5, size = 0.055 }: {
  seed: number;
  count: number;
  radius: number;
  depth: number;
  height: number;
  color: string;
  opacity?: number;
  size?: number;
}) {
  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      const angle = seeded(index + seed, 1) * Math.PI * 2;
      const radial = Math.pow(seeded(index + seed, 2), 0.72) * radius;
      positions[index * 3] = Math.cos(angle) * radial + (seeded(index + seed, 3) - 0.5) * 0.5;
      positions[index * 3 + 1] = (seeded(index + seed, 4) - 0.5) * height + Math.sin(angle * 3) * 0.12;
      positions[index * 3 + 2] = (seeded(index + seed, 5) - 0.5) * depth;
    }
    const next = new THREE.BufferGeometry();
    next.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return next;
  }, [count, depth, height, radius, seed]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <points geometry={geometry}>
      <pointsMaterial color={color} size={size} sizeAttenuation transparent opacity={opacity} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
    </points>
  );
}

function EmotionalTerrain({ reducedMotion, selected }: { reducedMotion: boolean; selected: boolean }) {
  const material = useMemo(() => new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uSelected: { value: selected ? 1 : 0 } },
    vertexShader: `
      uniform float uTime;
      uniform float uSelected;
      varying float vElevation;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec3 displaced = position;
        float radial = length(position.xy);
        float envelope = 1.0 - smoothstep(7.0, 38.0, radial);
        float slow = uTime * 0.045;
        float waveA = sin(position.x * 0.24 + slow) * 0.42;
        float waveB = cos(position.y * 0.19 - slow * 0.8) * 0.34;
        float waveC = sin((position.x + position.y) * 0.11 + slow * 0.55) * 0.3;
        float basin = -0.32 * exp(-radial * 0.055);
        float elevation = (waveA + waveB + waveC) * envelope + basin;
        elevation *= mix(1.0, 0.62, uSelected);
        displaced.z += elevation;
        vElevation = elevation;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
      }
    `,
    fragmentShader: `
      varying float vElevation;
      varying vec2 vUv;
      void main() {
        float radial = length(vUv - 0.5) * 2.0;
        float fade = 1.0 - smoothstep(0.28, 1.03, radial);
        vec3 deep = vec3(0.015, 0.09, 0.15);
        vec3 cyan = vec3(0.18, 0.72, 0.82);
        vec3 violet = vec3(0.34, 0.18, 0.62);
        vec3 color = mix(deep, cyan, smoothstep(-0.7, 0.75, vElevation));
        color = mix(color, violet, smoothstep(0.45, 1.0, radial) * 0.55);
        float contour = 0.45 + 0.55 * sin((vElevation + radial) * 15.0);
        float alpha = fade * (0.08 + contour * 0.075);
        gl_FragColor = vec4(color, alpha);
      }
    `,
  }), [selected]);
  useEffect(() => () => material.dispose(), [material]);
  useFrame(({ clock }) => {
    material.uniforms.uTime.value = reducedMotion ? 0 : clock.elapsedTime;
    material.uniforms.uSelected.value = selected ? 1 : 0;
  });
  return (
    <group name="life-map-temporal-landscape">
      <mesh position={[0, -2.65, -10]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[72, 76, 112, 112]} />
        <primitive object={material} attach="material" />
      </mesh>
      <FieldParticles seed={880} count={selected ? 120 : 280} radius={31} depth={34} height={3.8} color={CYAN} opacity={selected ? 0.16 : 0.28} size={0.045} />
    </group>
  );
}

function AuthoredMemoryStar({ aura, active, scale = 1, rotation = [0, 0, 0], clip }: {
  aura: string;
  active: boolean;
  scale?: number;
  rotation?: Point3;
  clip?: "MemoryStar_Idle" | "MemoryStar_Selected" | "MemoryStar_Focus";
}) {
  const reducedMotion = useContext(LifeMapReducedMotionContext);
  const { scene, animations } = useGLTF(MEMORY_STAR_MODEL);
  const root = useRef<THREE.Group>(null);
  const model = useMemo(() => prepareAuthoredModel(scene, aura, hideRejectedMemoryStarPresentationNode), [aura, scene]);
  const { actions } = useAnimations(animations, root);
  useEffect(() => {
    const chosen = actions[clip || (active ? "MemoryStar_Selected" : "MemoryStar_Idle")] || actions.MemoryStar_Idle;
    if (!chosen) return;
    chosen.reset().play();
    chosen.setEffectiveTimeScale(reducedMotion ? 0 : 1);
    chosen.paused = reducedMotion;
    if (reducedMotion) chosen.time = chosen.getClip().duration * (active ? 0.62 : 0.35);
    else chosen.fadeIn(0.28);
    return () => { chosen.fadeOut(0.18); chosen.stop(); };
  }, [actions, active, clip, reducedMotion]);
  return (
    <group ref={root} scale={scale} rotation={rotation} userData={{ runtimeAsset: MEMORY_STAR_MODEL, authored: true }}>
      <primitive object={model} />
    </group>
  );
}

function LifeCore({ hidden, reducedMotion, tier }: { hidden: boolean; reducedMotion: boolean; tier: SpatialQualityProfile["tier"] }) {
  const root = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!root.current || reducedMotion) return;
    root.current.rotation.y = clock.elapsedTime * 0.05;
    root.current.rotation.z = Math.sin(clock.elapsedTime * 0.16) * 0.055;
  });
  return (
    <group ref={root} name="life-map-white-gold-life-core" position={LIFE_MAP_CORE_POSITION} visible={!hidden}>
      <AuthoredMemoryStar aura={GOLD} active scale={2.35} clip="MemoryStar_Focus" />
      <Current points={[[-5.6, 0.15, 0.5], [-2.7, 1.6, -0.7], [0, 0.4, -1.2], [2.8, -1.2, -0.6], [5.8, 0.18, 0.4]]} color={GOLD} opacity={0.42} width={0.025} />
      <Current points={[[0.4, -4.8, 0.8], [-1.4, -2.1, -0.5], [0, 0, -1.4], [1.6, 2.2, -0.4], [-0.2, 5, 0.7]]} color={ICE} opacity={0.32} width={0.018} />
      <Sparkles count={tier === "low" ? 26 : 58} scale={[8, 6, 8]} size={2.4} speed={reducedMotion ? 0 : 0.12} opacity={0.6} color={GOLD} />
      <pointLight color={GOLD} intensity={tier === "low" ? 9 : 18} distance={34} decay={2} />
    </group>
  );
}

function ChapterAnchor({ aura, index }: { aura: string; index: number }) {
  return (
    <group rotation={[index * 0.18, index * 0.33, index * 0.11]}>
      <AuthoredMemoryStar aura={aura} active={false} scale={0.82 + index * 0.035} />
      <Current points={[[-2.3, -0.25, 0.7], [-1.2, 0.6, -0.45], [0.15, 0.95, -0.85], [2.45, 0.15, 0.35]]} color={aura} opacity={0.4} width={0.023} />
    </group>
  );
}

function ChapterTerritories({ selected }: { selected: LifeMapNode | null }) {
  if (selected) return null;
  return (
    <group name="life-map-authored-chapter-regions">
      {LIFE_MAP_CHAPTERS.map((chapter, index) => (
        <group key={chapter.id} position={chapter.position} rotation={chapter.rotation}>
          <FieldParticles seed={index * 71 + 19} count={56} radius={2.8} depth={3.8} height={2.6} color={chapter.aura} opacity={0.54} size={0.065} />
          <ChapterAnchor aura={chapter.aura} index={index} />
        </group>
      ))}
    </group>
  );
}

function ForegroundObservatory({ selected }: { selected: LifeMapNode | null }) {
  if (selected) return null;
  return (
    <group name="life-map-foreground-observatory" position={[0, -1.5, 4.1]}>
      <Current points={[[-10, 0.1, 0.4], [-5.2, 0.72, -1.3], [0, 0.2, -2.6], [5.1, 0.78, -1.2], [10.2, 0.08, 0.3]]} color={CYAN} opacity={0.26} width={0.038} />
      <Current points={[[-7.4, -0.45, -0.4], [-3.4, 0.25, -1.8], [0.2, -0.2, -2.8], [3.8, 0.3, -1.7], [7.6, -0.42, -0.3]]} color={VIOLET} opacity={0.18} width={0.025} />
      <FieldParticles seed={730} count={90} radius={9.5} depth={3} height={1.9} color={ICE} opacity={0.22} size={0.04} />
    </group>
  );
}

function OverviewLandmarks({ selected }: { selected: LifeMapNode | null }) {
  if (selected) return null;
  return (
    <>
      <group name="life-map-relationship-observatory" position={[5.7, 0.55, -7.2]}>
        <AuthoredMemoryStar aura={CYAN} active={false} scale={1.3} />
        <FieldParticles seed={515} count={44} radius={2.8} depth={3.2} height={2.4} color={ICE} opacity={0.58} size={0.06} />
      </group>
      <group name="life-map-goal-horizon" position={[-6.8, 2.3, -15.6]}>
        <Current points={[[0, -2.4, 0], [0.2, -0.2, -0.4], [0.45, 2.8, -1.2]]} color={GOLD} opacity={0.75} width={0.044} />
        <AuthoredMemoryStar aura={GOLD} active={false} scale={0.7} />
        <pointLight color={GOLD} intensity={4.5} distance={14} decay={2} />
      </group>
      <group name="life-map-achievement-monument" position={[7.2, -0.1, -13.4]}>
        <AuthoredMemoryStar aura={GOLD} active={false} scale={1.05} rotation={[0.15, 0.65, 0.1]} />
        <Current points={[[-1.5, -0.7, 0.3], [-0.7, 0.2, -0.3], [0, 1.2, -0.8], [0.7, 2.1, -0.35], [1.5, 3.1, 0.2]]} color={GOLD} opacity={0.42} width={0.035} />
      </group>
      <group name="life-map-privacy-vault" position={[-7.4, -0.5, -10.5]}>
        <AuthoredMemoryStar aura="#8d74ad" active={false} scale={0.64} rotation={[0.5, 0.4, 0.2]} />
        <FieldParticles seed={811} count={38} radius={2.5} depth={3.4} height={2.6} color="#8d74ad" opacity={0.32} size={0.052} />
      </group>
    </>
  );
}

function MemoryWeather({ reducedMotion }: { reducedMotion: boolean }) {
  const root = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!root.current || reducedMotion) return;
    root.current.rotation.z = Math.sin(clock.elapsedTime * 0.035) * 0.035;
    root.current.position.x = Math.sin(clock.elapsedTime * 0.025) * 0.75;
  });
  return (
    <group ref={root} name="life-map-emotional-weather" position={[0, 6.4, -22]}>
      {[-12, -6, 0, 6, 12].map((x, index) => (
        <Current key={x} points={[[x - 5, Math.sin(index) * 1.2, 0], [x, 1.8 + Math.cos(index) * 0.8, -3], [x + 5.5, Math.sin(index * 2) * 1.15, -0.4]]} color={index % 2 ? VIOLET : CYAN} opacity={0.16} width={0.085} />
      ))}
      <FieldParticles seed={340} count={130} radius={22} depth={8} height={6} color={VIOLET} opacity={0.18} size={0.07} />
    </group>
  );
}

function VisualArtifact({ node, active }: ArtifactProps) {
  return <AuthoredMemoryStar aura={node.aura} active={active} scale={active ? 1.18 : 0.92} rotation={[0.22, 0.55, 0.1]} />;
}
function AudioArtifact({ node, active }: ArtifactProps) {
  return <group><AuthoredMemoryStar aura={node.aura} active={active} scale={active ? 1.08 : 0.82} />{[-0.34, 0, 0.34].map((z, index) => <Current key={z} points={[[-0.78, 0, z], [-0.3, index * 0.2, z], [0.18, -index * 0.14, z], [0.82, 0.04, z]]} color={index === 1 ? ICE : node.aura} opacity={active ? 0.82 : 0.42} width={0.025} />)}</group>;
}
function RelationshipArtifact({ node, active }: ArtifactProps) {
  return <group><AuthoredMemoryStar aura={node.aura} active={active} scale={active ? 1.1 : 0.82} /><Line points={[[-0.72, 0.02, 0.18], [0, 0.72, -0.4], [0.72, 0.08, 0.12]]} color={node.aura} lineWidth={active ? 1.4 : 0.8} /></group>;
}
function PlaceArtifact({ node, active }: ArtifactProps) {
  return <group><AuthoredMemoryStar aura={node.aura} active={active} scale={active ? 1.2 : 0.9} rotation={[-0.25, 0.18, 0.08]} /><Current points={[[-1.1, -0.35, 0.4], [-0.45, -0.1, -0.35], [0.35, -0.15, -0.6], [1.1, -0.32, 0.2]]} color={node.aura} opacity={active ? 0.66 : 0.3} width={0.022} /></group>;
}
function EmotionArtifact({ node, active }: ArtifactProps) {
  const reducedMotion = useContext(LifeMapReducedMotionContext);
  return <group><AuthoredMemoryStar aura={node.aura} active={active} scale={active ? 1.28 : 0.96} /><Sparkles count={active ? 34 : 14} scale={[2.2, 2.4, 2.2]} size={2.1} speed={reducedMotion ? 0 : 0.08} opacity={0.72} color={node.aura} /></group>;
}
function PatternArtifact({ node, active }: ArtifactProps) {
  return <group><AuthoredMemoryStar aura={node.aura} active={active} scale={active ? 1.12 : 0.82} />{[-0.22, 0, 0.22].map((y, index) => <Current key={y} points={[[-0.85, y, 0], [-0.35, y + 0.24, -0.25], [0.28, y - 0.18, -0.32], [0.88, y, 0]]} color={index === 1 ? ICE : node.aura} opacity={active ? 0.92 : 0.48} width={0.031} />)}</group>;
}
function AchievementArtifact({ node, active }: ArtifactProps) {
  return <group><AuthoredMemoryStar aura={GOLD} active={active} scale={active ? 1.24 : 0.9} rotation={[0.12, 0.72, 0.2]} /><Current points={[[-0.9, -0.65, 0.2], [-0.35, 0.05, -0.2], [0.05, 0.75, -0.5], [0.55, 1.42, -0.18], [0.95, 2.05, 0.2]]} color={GOLD} opacity={active ? 0.82 : 0.38} width={0.03} /></group>;
}
function GoalArtifact({ node, active }: ArtifactProps) {
  return <group><AuthoredMemoryStar aura={active ? GOLD : node.aura} active={active} scale={active ? 1.16 : 0.86} /><Current points={[[0, -0.78, 0], [0.06, 0.15, -0.18], [0.38, 1.15, -0.52]]} color={active ? GOLD : node.aura} opacity={0.92} width={0.045} /></group>;
}
function FutureArtifact({ node, active }: ArtifactProps) {
  return <group><AuthoredMemoryStar aura={node.aura} active={active} scale={active ? 1.18 : 0.84} rotation={[0.35, -0.4, 0.15]} /><Current points={[[-0.8, -0.3, 0.15], [-0.25, 0.4, -0.45], [0.35, 1.15, -0.72], [0.9, 1.85, -0.28]]} color={node.aura} opacity={active ? 0.76 : 0.34} width={0.027} /></group>;
}
function EverydayArtifact({ node, active }: ArtifactProps) {
  return <AuthoredMemoryStar aura={node.aura} active={active} scale={active ? 1.02 : 0.76} />;
}
function ArchiveArtifact({ node, active }: ArtifactProps) {
  return <group><AuthoredMemoryStar aura={node.aura} active={active} scale={active ? 1.08 : 0.78} rotation={[0.25, 0.2, 0.55]} /><FieldParticles seed={77} count={active ? 34 : 18} radius={1.4} depth={2.2} height={1.7} color={ICE} opacity={active ? 0.42 : 0.22} size={0.042} /></group>;
}
function ProtectedArtifact({ node, active }: ArtifactProps) {
  return <group><AuthoredMemoryStar aura={node.aura} active={active} scale={active ? 1.0 : 0.7} rotation={[0.5, 0.7, 0.2]} /><FieldParticles seed={91} count={24} radius={1.65} depth={2.4} height={2} color={node.aura} opacity={0.24} size={0.045} /></group>;
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
    root.current.rotation.y = Math.sin(clock.elapsedTime * 0.13 + index) * 0.08;
    root.current.position.y = node.position[1] + Math.sin(clock.elapsedTime * 0.28 + index * 0.7) * 0.16;
  });
  return (
    <group
      ref={root}
      position={node.position}
      visible={visible}
      scale={active ? 1.18 : 0.82 + importance * 0.30}
      name={`life-map-artifact-${resolveArtifactFamily(node)}-${node.id}`}
      userData={{ artifactFamily: resolveArtifactFamily(node), importance: importance.toFixed(2), semanticLabel, chapterId: chapter.id, runtimeAsset: MEMORY_STAR_MODEL }}
      onClick={(event) => { event.stopPropagation(); onSelect(node); }}
    >
      <ArtifactShape node={node} active={active} />
      <Sparkles count={active ? 34 : 10} scale={active ? [3.4, 3.8, 3.4] : [1.8, 2.2, 1.8]} size={active ? 2.4 : 1.3} speed={reducedMotion ? 0 : 0.11} opacity={active ? 0.72 : 0.34} color={node.aura} />
      <pointLight color={node.aura} intensity={active ? 8 : 2.8} distance={active ? 15 : 7} decay={2} />
    </group>
  );
}

function PathPulse({ curve, color, reducedMotion, offset }: { curve: THREE.QuadraticBezierCurve3; color: string; reducedMotion: boolean; offset: number }) {
  const pulse = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!pulse.current || reducedMotion) return;
    const t = (clock.elapsedTime * 0.055 + offset) % 1;
    pulse.current.position.copy(curve.getPoint(t));
  });
  return <group ref={pulse} position={curve.getPoint(offset % 1)} name="life-map-living-pulse"><Sparkles count={3} scale={0.16} size={3} speed={0} opacity={0.9} color={color} /><pointLight color={color} intensity={1.6} distance={2.8} /></group>;
}

function SemanticPath({ source, target, active, reducedMotion, index }: { source: LifeMapNode; target: LifeMapNode; active: boolean; reducedMotion: boolean; index: number }) {
  const start = useMemo(() => new THREE.Vector3(...source.position), [source.position]);
  const end = useMemo(() => new THREE.Vector3(...target.position), [target.position]);
  const curve = useMemo(() => {
    const middle = start.clone().lerp(end, 0.5);
    middle.y += 1.25 + start.distanceTo(end) * 0.075;
    middle.z -= 0.42;
    return new THREE.QuadraticBezierCurve3(start, middle, end);
  }, [end, start]);
  const kind = resolvePathKind(source, target);
  const color = LIFE_MAP_PATH_PALETTE[kind];
  return (
    <group>
      <Line points={curve.getPoints(48)} color={color} lineWidth={active ? 1.35 : 0.62} transparent opacity={kind === "protected" ? 0.08 : active ? 0.7 : 0.23} dashed={kind === "inferred" || kind === "corrected" || kind === "protected"} />
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
    <group name="life-map-curved-semantic-paths">
      {links.map((link, index) => {
        const active = Boolean(selected && (selected.id === link.source.id || selected.id === link.target.id));
        if (selected && phase === "arrival" && !active) return null;
        return <SemanticPath key={`${link.source.id}:${link.target.id}`} source={link.source} target={link.target} active={active} reducedMotion={reducedMotion} index={index} />;
      })}
    </group>
  );
}

function ArrivalSanctuary({ selected, phase, reducedMotion }: { selected: LifeMapNode | null; phase: LifeMapJourneyPhase; reducedMotion: boolean }) {
  const { scene, animations } = useGLTF(MEMORY_CHAMBER_MODEL);
  const group = useRef<THREE.Group>(null);
  const chamber = useMemo(() => selected ? prepareAuthoredModel(scene, selected.aura) : scene.clone(true), [scene, selected]);
  const { actions } = useAnimations(animations, group);
  useEffect(() => {
    if (!selected || phase !== "arrival") return;
    const arrival = actions.Focus_Arrival;
    const breathing = actions.Focus_Breathing;
    if (arrival) {
      arrival.reset().setLoop(THREE.LoopOnce, 1).play();
      arrival.clampWhenFinished = true;
      arrival.setEffectiveTimeScale(reducedMotion ? 0 : 1);
      arrival.paused = reducedMotion;
      if (reducedMotion) arrival.time = arrival.getClip().duration;
      else arrival.fadeIn(0.2);
    }
    if (breathing) {
      breathing.reset().play();
      breathing.setEffectiveTimeScale(reducedMotion ? 0 : 1);
      breathing.paused = reducedMotion;
      if (reducedMotion) breathing.time = breathing.getClip().duration * 0.35;
      else breathing.fadeIn(0.65);
    }
    return () => {
      arrival?.fadeOut(0.18);
      breathing?.fadeOut(0.25);
      arrival?.stop();
      breathing?.stop();
    };
  }, [actions, phase, reducedMotion, selected]);
  useFrame(({ clock }) => {
    if (!group.current || reducedMotion) return;
    group.current.rotation.y = Math.sin(clock.elapsedTime * 0.07) * 0.035;
  });
  if (!selected || phase !== "arrival") return null;
  return (
    <group
      ref={group}
      name="life-map-selected-arrival-sanctuary"
      userData={{ scaleMode: "intimate", depthBand: "near", semanticOwner: "life-map-intimate-memory-chamber", runtimeAsset: MEMORY_CHAMBER_MODEL }}
      position={[selected.position[0], selected.position[1] - 0.28, selected.position[2] - 2.6]}
      scale={0.34}
    >
      <primitive object={chamber} />
      <FieldParticles seed={996} count={160} radius={5.4} depth={8.2} height={7.6} color={selected.aura} opacity={0.42} size={0.065} />
      <Sparkles count={96} scale={[10, 8, 10]} size={2.6} speed={reducedMotion ? 0 : 0.08} opacity={0.48} color={ICE} />
      <pointLight color={selected.aura} intensity={16} distance={32} decay={2} />
    </group>
  );
}

function IntimateMemoryChamber(props: { selected: LifeMapNode | null; phase: LifeMapJourneyPhase; reducedMotion: boolean }) {
  return <ArrivalSanctuary {...props} />;
}

function ArchiveParticles({ qualityTier, reducedMotion }: { qualityTier: SpatialQualityProfile["tier"]; reducedMotion: boolean }) {
  return (
    <group name="life-map-archive-particles">
      <Stars radius={58} depth={38} count={qualityTier === "low" ? 80 : qualityTier === "medium" ? 150 : 240} factor={1.45} saturation={0.34} fade speed={reducedMotion ? 0 : 0.012} />
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
  const stageScale: Point3 = selected ? (portrait ? [0.92, 0.96, 0.92] : [1.12, 1.12, 1.08]) : portrait ? [0.54, 0.96, 0.78] : [1.12, 1.18, 1.08];
  const stagePosition: Point3 = selected ? (portrait ? [0, -0.08, 0.9] : [0, -0.16, 0.62]) : portrait ? [0, -0.18, 1.1] : [0, 0.05, 0.9];
  const starCount = profile.tier === "low" ? 420 : profile.tier === "medium" ? 760 : 1160;

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
    <LifeMapReducedMotionContext.Provider value={profile.reducedMotion}>
      <>
        <color attach="background" args={[DEEP]} />
        <fog attach="fog" args={["#061020", 14, 88]} />
        <ambientLight intensity={0.34} color="#ccecff" />
        <hemisphereLight args={["#dff8ff", "#02030a", 0.82]} />
        <directionalLight position={[9, 14, 10]} intensity={2.25} color="#dff6ff" castShadow={profile.shadows} shadow-mapSize={[2048, 2048]} />
        <directionalLight position={[-10, 8, -16]} intensity={1.6} color={VIOLET} />
        {webglRecovery}
        <RenderProofRepublisher />
        {cameraRig}
        <group name="life-map-authored-environment">
          <mesh><sphereGeometry args={[86, 48, 36]} /><meshBasicMaterial color="#020713" side={THREE.BackSide} /></mesh>
          <FieldParticles seed={1220} count={profile.tier === "low" ? 120 : 320} radius={42} depth={70} height={32} color={VIOLET} opacity={0.16} size={0.065} />
        </group>
        <group name="life-map-temporal-horizon">
          <Current points={[[-28, 8, -42], [-12, 10, -48], [0, 7, -54], [13, 11, -48], [28, 8, -42]]} color={CYAN} opacity={0.08} width={0.18} />
        </group>
        <EmotionalTerrain reducedMotion={profile.reducedMotion} selected={Boolean(selected)} />
        <group name="life-map-world-stage" scale={stageScale} position={stagePosition}>
          <LifeCore hidden={Boolean(selected)} reducedMotion={profile.reducedMotion} tier={profile.tier} />
          <group name="life-map-light-bridges"><LivingPaths nodes={nodes} selected={selected} reducedMotion={profile.reducedMotion} phase={phase} /></group>
          <ChapterTerritories selected={selected} />
          <ForegroundObservatory selected={selected} />
          <OverviewLandmarks selected={selected} />
          <group name="life-map-memory-artifact-families">
            {nodes.map((node, index) => <MemoryArtifact key={node.id} node={node} index={index} selected={selected} phase={phase} reducedMotion={profile.reducedMotion} onSelect={onSelect} />)}
          </group>
          <group name="life-map-selected-relationship-context" />
          <IntimateMemoryChamber selected={selected} phase={phase} reducedMotion={profile.reducedMotion} />
        </group>
        <MemoryWeather reducedMotion={profile.reducedMotion} />
        <ArchiveParticles qualityTier={profile.tier} reducedMotion={profile.reducedMotion} />
        <group name="life-map-far-future-horizon">
          <Stars radius={120} depth={84} count={starCount} factor={2.25} saturation={0.32} fade speed={profile.reducedMotion ? 0 : 0.018} />
          <Sparkles count={profile.tier === "low" ? 70 : 160} scale={[48, 26, 72]} position={[0, 3, -18]} size={1.35} speed={profile.reducedMotion ? 0 : 0.08} opacity={0.28} color="#d9f7ff" />
        </group>
        <CinematicPostProcessing active={profile.postprocessing} reducedMotion={profile.reducedMotion} />
      </>
    </LifeMapReducedMotionContext.Provider>
  );
}

useGLTF.preload(MEMORY_STAR_MODEL);
useGLTF.preload(MEMORY_CHAMBER_MODEL);
