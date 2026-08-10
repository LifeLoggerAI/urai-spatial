"use client";

import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { ContactShadows, Stars, useAnimations, useGLTF } from "@react-three/drei";
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import * as THREE from "three";
import { MobileMovementPad, stepEmbodiedMotion, useDragLook, useMovementInput, type MovementInput } from "@/spatial/navigation/EmbodiedNavigation";
import { useSceneStore } from "@/spatial/store/useSceneStore";
import { requestUraiWorldOrbOpen, requestUraiWorldTravel } from "@/spatial/world/worldEvents";
import { useHomePersonalizedScene } from "@/app/home/useHomePersonalizedScene";
import type { HomePersonalizedScene } from "@/app/home/homePersonalizationModel";
import styles from "./HomeWorldProduction.module.css";

const HOME_PROVIDER_ENVIRONMENT = "/assets/urai/replay/replay-memory-film-main.webp";
const HOME_SANCTUARY_MODEL = "/assets/urai/generated/models/home-entry-chamber-v1.glb";
const HOME_FERN_MODEL = "/assets/urai/home-production/cc0/polyhaven-fern-02-geometry-v1.glb";
const HOME_ORB_MODEL = "/assets/urai/generated/models/urai-orb-avatar-v1.glb";
const HOME_SCANNED_COMPOSITION_V1 = "owned-sanctuary-plus-cc0-fern-plus-final-orb";
const HOME_BOUNDS = { minX: -12.5, maxX: 12.5, minZ: -15.5, maxZ: 10.5 };
const SPAWN = new THREE.Vector3(0, 0, 7.8);
const ORB = new THREE.Vector3(0, 1.42, -2.85);
const GROUND_THRESHOLD = new THREE.Vector3(-4.9, 0, -7.2);
const LIFE_MAP_LOOKOUT = new THREE.Vector3(4.9, 0, -7.2);
const ASCENT_DURATION_SECONDS = 3.6;
const GROUND_DESCENT_DURATION_SECONDS = 2.8;

const ORB_CLIPS = {
  dormant: "Orb_Resting",
  idle: "Orb_Idle",
  attention: "Orb_Attention",
  listening: "Orb_Listening",
  thinking: "Orb_Thinking",
  speaking: "Orb_Speaking",
  guiding: "Orb_Guiding",
  reflecting: "Orb_Reflecting",
  calming: "Orb_Calming",
  privacy: "Orb_Privacy",
  warning: "Orb_Degraded",
  transition: "Orb_Transition",
} as const;

type OrbState = keyof typeof ORB_CLIPS;
type Nearby = "orb" | "ground" | "life-map" | null;
type TransitionSequence = "idle" | "ground:opening" | "ground:traversal" | "ground:closing" | "life-map:opening" | "life-map:traversal" | "life-map:closing";
type Props = { onOrbOpen?: () => void; webglAvailable?: boolean };
type Vec3 = readonly [number, number, number];
type HomePalette = {
  sky: string;
  horizon: string;
  fog: string;
  ground: string;
  groundSecondary: string;
  vegetation: string;
  stone: string;
  path: string;
  water: string;
  ambient: number;
  key: number;
  fogDensity: number;
  stars: number;
  starOpacity: number;
};

const ReducedMotionContext = createContext(false);

function seeded(index: number, salt = 0) {
  const value = Math.sin(index * 91.73 + salt * 37.17) * 43758.5453;
  return value - Math.floor(value);
}

function terrainHeight(x: number, z: number) {
  const broad = Math.sin(x * 0.09) * 0.18 + Math.cos(z * 0.075) * 0.14 + Math.sin((x + z) * 0.045) * 0.09;
  const detail = Math.sin(x * 0.4 + z * 0.18) * 0.025 + Math.cos(z * 0.31 - x * 0.16) * 0.022;
  const clearing = -Math.exp(-((x / 8.7) ** 2 + ((z + 1.8) / 10.4) ** 2)) * 0.24;
  return broad + detail + clearing - 0.13;
}

function makeTerrainGeometry() {
  const geometry = new THREE.PlaneGeometry(82, 82, 220, 220);
  geometry.rotateX(-Math.PI / 2);
  const position = geometry.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < position.count; i += 1) {
    position.setY(i, terrainHeight(position.getX(i), position.getZ(i)));
  }
  geometry.computeVertexNormals();
  return geometry;
}

const TERRAIN_GEOMETRY = makeTerrainGeometry();

function paletteFor(scene: HomePersonalizedScene): HomePalette {
  const heavy = scene.environment.weatherTone === "heavy";
  const recovering = scene.environment.weatherTone === "recovering";
  const active = scene.environment.weatherTone === "active";
  const night = scene.environment.timeOfDay === "night";
  const dusk = scene.environment.timeOfDay === "dusk";
  const dawn = scene.environment.timeOfDay === "dawn";

  if (night) return {
    sky: heavy ? "#071419" : "#0a1c24",
    horizon: recovering ? "#365f5f" : "#25454b",
    fog: heavy ? "#102326" : "#122a2d",
    ground: "#294335",
    groundSecondary: "#365241",
    vegetation: recovering ? "#719574" : "#67866a",
    stone: "#58645d",
    path: "#667067",
    water: "#193f49",
    ambient: heavy ? 0.34 : 0.48,
    key: heavy ? 1.2 : 1.65,
    fogDensity: heavy ? 0.017 : 0.011,
    stars: 900,
    starOpacity: 0.7,
  };

  if (dusk || dawn) return {
    sky: dusk ? "#4c5f63" : "#78918d",
    horizon: dusk ? "#917966" : "#b7a98d",
    fog: heavy ? "#53645f" : "#7c8e84",
    ground: "#3c5844",
    groundSecondary: "#526a53",
    vegetation: recovering ? "#86a978" : "#76936e",
    stone: "#6d746b",
    path: "#7a7d70",
    water: "#3d6369",
    ambient: heavy ? 0.55 : 0.72,
    key: heavy ? 1.6 : 2.25,
    fogDensity: heavy ? 0.015 : 0.009,
    stars: 260,
    starOpacity: 0.32,
  };

  return {
    sky: active ? "#78928d" : "#94aaa1",
    horizon: recovering ? "#c3b894" : "#b7c3ae",
    fog: heavy ? "#72857b" : "#9aaca0",
    ground: "#466148",
    groundSecondary: "#5b7459",
    vegetation: recovering ? "#91ad75" : "#7e9c70",
    stone: "#737c70",
    path: "#858779",
    water: "#52787b",
    ambient: heavy ? 0.72 : 0.92,
    key: heavy ? 2.0 : 2.8,
    fogDensity: heavy ? 0.014 : 0.0075,
    stars: 0,
    starOpacity: 0,
  };
}

function prepareAuthoredSanctuary(source: THREE.Object3D, palette: HomePalette) {
  const world = source.clone(true);
  const rejected = /portal|ring|threshold|village|mannequin|avatar|debug|marker|label|embodied|presence|memory-place-anchor|living-growth/i;
  const rejectedForgeForms = /vault|monolith|bridge|grove|firefly|alcove|veil|waterfall|mountain|vegetation|tree|sculpture|basin|pedestal/i;
  let visibleMeshCount = 0;
  world.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.visible = !rejected.test(object.name) && !rejectedForgeForms.test(object.name);
    if (!object.visible) return;
    const name = object.name.toLowerCase();
    const stone = /path|ground|terrain|stone/.test(name);
    object.material = new THREE.MeshStandardMaterial({ color: stone ? palette.stone : palette.groundSecondary, roughness: stone ? 0.94 : 0.99, metalness: 0 });
    object.castShadow = true;
    object.receiveShadow = true;
    visibleMeshCount += 1;
  });
  if (visibleMeshCount < 3) world.userData.usesSupplementalNaturalGeometry = true;
  world.userData.suppressedForgeScenery = true;
  world.userData.suppressedPortalProps = true;
  world.userData.centeredForHomeCamera = true;
  world.userData.providerImageRole = "atmospheric-support-only";
  return world;
}

function prepareOrbModel(source: THREE.Object3D) {
  const orb = source.clone(true);
  orb.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.castShadow = true;
    object.frustumCulled = true;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    const next = materials.map((material) => {
      const cloned = material.clone();
      if (cloned instanceof THREE.MeshStandardMaterial) {
        cloned.emissive.set("#6fb7c1");
        cloned.emissiveIntensity = Math.max(cloned.emissiveIntensity, 0.55);
        cloned.roughness = Math.min(cloned.roughness, 0.34);
      }
      return cloned;
    });
    object.material = Array.isArray(object.material) ? next : next[0];
  });
  return orb;
}

function CinematicBackdrop({ scene }: { scene: HomePersonalizedScene }) {
  const palette = paletteFor(scene);
  return <div aria-hidden="true" className={styles.backdrop} style={{ background: `radial-gradient(circle at 72% 18%, ${palette.horizon} 0%, transparent 34%), linear-gradient(180deg, ${palette.sky} 0%, ${palette.fog} 58%, ${palette.ground} 100%)` }} />;
}

function Terrain({ walkTarget, palette }: { walkTarget: MutableRefObject<THREE.Vector3 | null>; palette: HomePalette }) {
  const sanctuary = useGLTF(HOME_SANCTUARY_MODEL);
  const authored = useMemo(() => prepareAuthoredSanctuary(sanctuary.scene, palette), [palette, sanctuary.scene]);
  const onWalk = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    if (useSceneStore.getState().inputLocked) return;
    walkTarget.current = new THREE.Vector3(THREE.MathUtils.clamp(event.point.x, HOME_BOUNDS.minX, HOME_BOUNDS.maxX), 0, THREE.MathUtils.clamp(event.point.z, HOME_BOUNDS.minZ, HOME_BOUNDS.maxZ));
  };
  return (
    <group name="home-authored-terrain" userData={{ providerImageRole: "atmospheric-support-only", physicalBase: "authored-coherent-world" }}>
      <primitive object={authored} />
      <mesh name="home-natural-terrain" geometry={TERRAIN_GEOMETRY} receiveShadow onClick={onWalk}>
        <meshStandardMaterial color={palette.ground} roughness={0.99} metalness={0} />
      </mesh>
      <mesh name="home-walkable-navigation-surface" rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.55, -1.8]} onClick={onWalk}>
        <planeGeometry args={[25, 28]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
    </group>
  );
}

function makeRidgeGeometry(seed: number, width: number, height: number) {
  const segments = 72;
  const vertices: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const x = (t - 0.5) * width;
    const edge = Math.sin(Math.PI * t);
    const ridge = edge * (0.58 + seeded(i + seed, 18) * 0.42) * height;
    const shoulder = Math.sin(t * Math.PI * 3.4 + seed) * height * 0.11;
    vertices.push(x, -2.2, 0, x, ridge + shoulder - 1.2, 0);
    if (i < segments) {
      const a = i * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      indices.push(a, b, c, c, b, d);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function NaturalHorizon({ palette }: { palette: HomePalette }) {
  const ridges = useMemo(() => [
    makeRidgeGeometry(9, 64, 8.8),
    makeRidgeGeometry(21, 58, 6.6),
    makeRidgeGeometry(37, 52, 4.6),
  ], []);
  useEffect(() => () => ridges.forEach((geometry) => geometry.dispose()), [ridges]);
  return (
    <group name="home-mountain-horizon" position={[0, 0, -25.5]} userData={{ role: "terrain-fog-continuity-without-procedural-ridge" }}>
      {ridges.map((geometry, index) => (
        <mesh key={index} geometry={geometry} position={[index === 1 ? -4 : index === 2 ? 5 : 0, -0.35 * index, -index * 3.2]} receiveShadow>
          <meshStandardMaterial color={index === 0 ? palette.groundSecondary : palette.stone} roughness={1} metalness={0} side={THREE.DoubleSide} transparent opacity={0.95 - index * 0.13} />
        </mesh>
      ))}
    </group>
  );
}

const FERN_PLACEMENTS = Array.from({ length: 42 }, (_, index) => {
  const side = index % 2 === 0 ? -1 : 1;
  const z = 4.4 - Math.floor(index / 2) * 0.72 + (seeded(index, 61) - 0.5) * 0.42;
  const x = side * (2.9 + seeded(index, 62) * 7.5);
  const scale = 0.56 + seeded(index, 63) * 0.62;
  const rotation = seeded(index, 64) * Math.PI * 2;
  return [x, z, scale, rotation] as const;
}).filter(([x, z]) => !(Math.abs(x - GROUND_THRESHOLD.x) < 1.6 && Math.abs(z - GROUND_THRESHOLD.z) < 2) && !(Math.abs(x - LIFE_MAP_LOOKOUT.x) < 1.6 && Math.abs(z - LIFE_MAP_LOOKOUT.z) < 2));

function NaturalVegetation({ reducedMotion, palette }: { reducedMotion: boolean; palette: HomePalette }) {
  const fern = useGLTF(HOME_FERN_MODEL);
  const material = useMemo(() => new THREE.MeshStandardMaterial({ color: palette.vegetation, roughness: 0.94, metalness: 0, side: THREE.DoubleSide }), [palette.vegetation]);
  useEffect(() => () => material.dispose(), [material]);
  const instances = useMemo(() => FERN_PLACEMENTS.map(([x, z, scale, rotation], index) => {
    const object = fern.scene.clone(true);
    object.name = `home-scanned-fern-${index + 1}`;
    object.position.set(x, terrainHeight(x, z) + 0.02, z);
    object.rotation.y = rotation;
    object.scale.setScalar(scale);
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = material;
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return object;
  }), [fern.scene, material]);
  const sway = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!sway.current || reducedMotion) return;
    sway.current.rotation.z = Math.sin(clock.elapsedTime * 0.18) * 0.0025;
  });
  return <group ref={sway} name="home-living-vegetation" userData={{ role: "scanned-cc0-natural-ground", reducedMotion }}>{instances.map((object) => <primitive key={object.name} object={object} />)}</group>;
}

function makePathRibbon(points: THREE.Vector3[], width: number) {
  const curve = new THREE.CatmullRomCurve3(points, false, "catmullrom", 0.32);
  const samples = curve.getPoints(48);
  const vertices: number[] = [];
  const indices: number[] = [];
  const up = new THREE.Vector3(0, 1, 0);
  const tangent = new THREE.Vector3();
  const side = new THREE.Vector3();
  for (let i = 0; i < samples.length; i += 1) {
    const point = samples[i];
    const before = samples[Math.max(0, i - 1)];
    const after = samples[Math.min(samples.length - 1, i + 1)];
    tangent.copy(after).sub(before).normalize();
    side.crossVectors(up, tangent).normalize().multiplyScalar(width * (0.78 + Math.sin((i / (samples.length - 1)) * Math.PI) * 0.22));
    const y = terrainHeight(point.x, point.z) + 0.018;
    vertices.push(point.x - side.x, y, point.z - side.z, point.x + side.x, y, point.z + side.z);
    if (i < samples.length - 1) {
      const a = i * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      indices.push(a, c, b, b, c, d);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function SanctuaryPath({ palette }: { palette: HomePalette }) {
  const paths = useMemo(() => [
    makePathRibbon([new THREE.Vector3(0, 0, 6.4), new THREE.Vector3(-1.8, 0, 1.5), new THREE.Vector3(-3.8, 0, -3.9), GROUND_THRESHOLD.clone()], 0.64),
    makePathRibbon([new THREE.Vector3(0.4, 0, 5.8), new THREE.Vector3(1.7, 0, 1.0), new THREE.Vector3(3.6, 0, -3.7), LIFE_MAP_LOOKOUT.clone()], 0.5),
  ], []);
  useEffect(() => () => paths.forEach((geometry) => geometry.dispose()), [paths]);
  return (
    <group name="home-sanctuary-path" userData={{ geometryOwner: "retained-owned-sanctuary-model", primitiveScenery: false }}>
      {paths.map((geometry, index) => <mesh key={index} geometry={geometry} receiveShadow><meshStandardMaterial color={index === 0 ? palette.path : palette.stone} roughness={0.98} metalness={0} transparent opacity={index === 0 ? 0.78 : 0.62} /></mesh>)}
    </group>
  );
}

function makeBoulderGeometry(seed: number) {
  const geometry = new THREE.IcosahedronGeometry(1, 2);
  const position = geometry.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    const scale = 0.84 + seeded(i + seed, 72) * 0.26 + y * 0.035;
    position.setXYZ(i, x * scale, y * (0.72 + seeded(i + seed, 73) * 0.18), z * scale);
  }
  geometry.computeVertexNormals();
  return geometry;
}

const BOULDERS = [makeBoulderGeometry(11), makeBoulderGeometry(23), makeBoulderGeometry(41)];

function SanctuaryPavilion({ palette }: { palette: HomePalette }) {
  const placements: Array<{ p: Vec3; s: Vec3; r: number }> = [
    { p: [-2.7, -0.12, -2.0], s: [1.65, 0.72, 1.15], r: 0.45 },
    { p: [2.8, -0.16, -1.4], s: [1.2, 0.58, 1.45], r: -0.8 },
    { p: [-7.3, -0.28, -9.4], s: [1.7, 1.0, 1.2], r: 0.2 },
    { p: [7.1, -0.24, -9.8], s: [1.55, 0.86, 1.3], r: -0.4 },
    { p: [0.8, -0.22, -11.8], s: [2.2, 0.72, 1.15], r: 1.1 },
  ];
  return (
    <group name="home-sanctuary-pavilion" userData={{ geometryOwner: "retained-owned-sanctuary-model", primitiveScenery: false }}>
      {placements.map(({ p, s, r }, index) => <mesh key={index} geometry={BOULDERS[index % BOULDERS.length]} position={p as [number, number, number]} scale={s as [number, number, number]} rotation={[0, r, 0]} castShadow receiveShadow><meshStandardMaterial color={palette.stone} roughness={0.99} metalness={0} /></mesh>)}
    </group>
  );
}

function ReflectingWater({ palette }: { palette: HomePalette }) {
  return <group name="home-reflecting-water" position={[5.15, terrainHeight(5.15, -7.35) + 0.02, -7.35]}><mesh rotation={[-Math.PI / 2, 0, 0]} scale={[1, 0.74, 1]}><circleGeometry args={[1.75, 64]} /><meshPhysicalMaterial color={palette.water} roughness={0.12} clearcoat={0.92} clearcoatRoughness={0.14} transparent opacity={0.74} /></mesh></group>;
}

function OrbDust({ reducedMotion }: { reducedMotion: boolean }) {
  const ref = useRef<THREE.Points>(null);
  const geometry = useMemo(() => {
    const positions = new Float32Array(72 * 3);
    for (let i = 0; i < 72; i += 1) {
      const radius = 0.64 + seeded(i, 44) * 0.44;
      const angle = seeded(i, 45) * Math.PI * 2;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = (seeded(i, 46) - 0.5) * 1.0;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame((_, delta) => { if (!reducedMotion && ref.current) ref.current.rotation.y += delta * 0.07; });
  return <points ref={ref} geometry={geometry}><pointsMaterial color="#d6fff4" size={0.025} transparent opacity={0.42} depthWrite={false} toneMapped={false} /></points>;
}

function OrbSanctuary({ onOpen, state }: { onOpen: () => void; state: OrbState }) {
  const reducedMotion = useContext(ReducedMotionContext);
  const gltf = useGLTF(HOME_ORB_MODEL);
  const root = useRef<THREE.Group>(null);
  const light = useRef<THREE.PointLight>(null);
  const model = useMemo(() => prepareOrbModel(gltf.scene), [gltf.scene]);
  const { actions } = useAnimations(gltf.animations, root);
  useEffect(() => {
    const action = actions[ORB_CLIPS[state]] || actions.Orb_Idle || actions.Orb_Resting;
    if (!action) return;
    action.reset().play();
    action.setEffectiveTimeScale(reducedMotion ? 0 : 1);
    action.paused = reducedMotion;
    if (reducedMotion) action.time = action.getClip().duration * 0.4;
    else action.fadeIn(0.24);
    return () => { action.fadeOut(0.16); action.stop(); };
  }, [actions, reducedMotion, state]);
  useFrame(({ clock }) => {
    if (!root.current || reducedMotion) return;
    const breath = 1 + Math.sin(clock.elapsedTime * 0.82) * 0.018;
    root.current.scale.setScalar(0.43 * breath);
    root.current.position.y = ORB.y + Math.sin(clock.elapsedTime * 0.55) * 0.045;
    if (light.current) light.current.intensity = 1.45 + Math.sin(clock.elapsedTime * 0.82) * 0.15;
  });
  return (
    <group ref={root} name="home-orb-sanctuary" position={ORB} scale={0.43} onClick={(event) => { event.stopPropagation(); onOpen(); }} userData={{ runtimeAsset: HOME_ORB_MODEL, semanticState: state }}>
      <primitive object={model} />
      <OrbDust reducedMotion={reducedMotion} />
      <pointLight ref={light} color="#99dce1" intensity={1.45} distance={8} decay={2} />
    </group>
  );
}

function MemorySignals({ scene, reducedMotion }: { scene: HomePersonalizedScene; reducedMotion: boolean }) {
  const count = Math.min(scene.places.length, 8);
  const geometry = useMemo(() => {
    const positions = new Float32Array(Math.max(1, count) * 3);
    for (let i = 0; i < Math.max(1, count); i += 1) {
      const angle = seeded(i, 81) * Math.PI * 2;
      const radius = 3.4 + seeded(i, 82) * 5.8;
      const x = Math.cos(angle) * radius;
      const z = -2.4 + Math.sin(angle) * radius * 0.7;
      positions[i * 3] = x;
      positions[i * 3 + 1] = terrainHeight(x, z) + 0.62 + seeded(i, 83) * 1.25;
      positions[i * 3 + 2] = z;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, [count]);
  const ref = useRef<THREE.Points>(null);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame(({ clock }) => {
    if (!ref.current || reducedMotion || count === 0) return;
    ref.current.rotation.y = Math.sin(clock.elapsedTime * 0.04) * 0.03;
  });
  if (count === 0) return <group name="home-memory-signals" userData={{ count: 0 }} />;
  return <group name="home-memory-signals" userData={{ count, privateDataMounted: scene.privateDataMounted }}><points ref={ref} geometry={geometry}><pointsMaterial color={scene.environment.weatherTone === "recovering" ? "#d9edaa" : "#bfe9da"} size={0.065} transparent opacity={0.5} depthWrite={false} toneMapped={false} /></points></group>;
}

function GroundThresholdLandmark({ onEnter, palette }: { onEnter: () => void; palette: HomePalette }) {
  const metadata = { transition: "physical-descent" };
  return (
    <group name="home-ground-environmental-threshold" position={GROUND_THRESHOLD} userData={metadata}>
      <mesh position={[0, 0.7, 0]} onClick={(event) => { event.stopPropagation(); onEnter(); }}><boxGeometry args={[3.8, 2.4, 3.8]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} /></mesh>
      {[-1, 0, 1].map((offset, index) => <mesh key={offset} geometry={BOULDERS[index % BOULDERS.length]} position={[offset * 0.78, -0.02 - index * 0.04, -index * 0.55]} scale={[0.62, 0.24, 0.5]} rotation={[0, index * 0.7, 0]} receiveShadow><meshStandardMaterial color={palette.path} roughness={1} /></mesh>)}
      <pointLight position={[0, 0.4, -1.1]} color="#9fbf9c" intensity={0.7} distance={4.8} decay={2} />
    </group>
  );
}

function LifeMapSkyLookout({ onEnter }: { onEnter: () => void }) {
  const geometry = useMemo(() => {
    const positions = new Float32Array(36 * 3);
    for (let i = 0; i < 36; i += 1) {
      const angle = seeded(i, 95) * Math.PI * 2;
      const radius = seeded(i, 96) * 1.25;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = 0.2 + seeded(i, 97) * 3.8;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <group name="home-life-map-sky-lookout" position={LIFE_MAP_LOOKOUT} userData={{ transition: "sky-ascent" }}><mesh position={[0, 0.7, 0]} onClick={(event) => { event.stopPropagation(); onEnter(); }}><boxGeometry args={[3.8, 2.4, 3.8]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} /></mesh><points geometry={geometry}><pointsMaterial color="#d7f5ff" size={0.04} transparent opacity={0.34} depthWrite={false} toneMapped={false} /></points><pointLight position={[0, 1.2, 0]} color="#b7e8f2" intensity={0.55} distance={5.4} decay={2} /></group>;
}

function EmbodiedPresence({ root }: { root: MutableRefObject<THREE.Group | null> }) {
  return <group ref={root} name="home-authored-embodied-self" position={SPAWN} userData={{ representation: "privacy-preserving-first-person-presence" }}><mesh position={[0, 0.012, 0.35]} rotation={[-Math.PI / 2, 0, 0]} scale={[0.46, 1.26, 1]}><circleGeometry args={[0.4, 40]} /><meshBasicMaterial color="#07110d" transparent opacity={0.16} depthWrite={false} /></mesh></group>;
}

function cubicPoint(target: THREE.Vector3, p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3, t: number) {
  const i = 1 - t;
  target.set(0, 0, 0).addScaledVector(p0, i * i * i).addScaledVector(p1, 3 * i * i * t).addScaledVector(p2, 3 * i * t * t).addScaledVector(p3, t * t * t);
}

function PlayerRig({ input, yaw, pitch, target, avatar, onNearby, groundDescent, onGroundComplete, reducedMotion }: { input: MovementInput; yaw: MutableRefObject<number>; pitch: MutableRefObject<number>; target: MutableRefObject<THREE.Vector3 | null>; avatar: MutableRefObject<THREE.Group | null>; onNearby: (value: Nearby) => void; groundDescent: boolean; onGroundComplete: () => void; reducedMotion: boolean; }) {
  const { camera, size } = useThree();
  const position = useRef(SPAWN.clone());
  const velocity = useRef(new THREE.Vector3());
  const lastNearby = useRef<Nearby>(null);
  const ascentStarted = useRef<number | null>(null);
  const groundStarted = useRef<number | null>(null);
  const ascentIssued = useRef(false);
  const groundIssued = useRef(false);
  const cameraStart = useRef(new THREE.Vector3());
  const point = useRef(new THREE.Vector3());
  const desired = useRef(new THREE.Vector3());
  const forward = useRef(new THREE.Vector3(0, 0, -1));
  const look = useRef(new THREE.Vector3());
  const up = useRef(new THREE.Vector3(0, 1, 0));

  const place = useCallback(() => {
    const portrait = size.height > size.width;
    forward.current.set(Math.sin(yaw.current), 0, -Math.cos(yaw.current));
    desired.current.copy(position.current).add(new THREE.Vector3(0, portrait ? 1.62 : 1.7, portrait ? 0.18 : 0.12).applyAxisAngle(up.current, yaw.current));
    camera.position.copy(desired.current);
    look.current.copy(position.current).addScaledVector(forward.current, portrait ? 6.6 : 8.6);
    camera.lookAt(look.current.x, 1.28 + pitch.current, look.current.z);
  }, [camera, pitch, size.height, size.width, yaw]);
  useLayoutEffect(() => { place(); }, [place]);

  useFrame(({ clock }, delta) => {
    const store = useSceneStore.getState();
    if (groundDescent) {
      if (groundStarted.current === null) { groundStarted.current = clock.elapsedTime; cameraStart.current.copy(camera.position); target.current = null; onNearby(null); }
      const duration = reducedMotion ? 0.45 : GROUND_DESCENT_DURATION_SECONDS;
      const linear = THREE.MathUtils.clamp((clock.elapsedTime - groundStarted.current) / duration, 0, 1);
      const eased = THREE.MathUtils.smootherstep(linear, 0, 1);
      cubicPoint(point.current, cameraStart.current, new THREE.Vector3(-3.5, 1.2, -5.4), new THREE.Vector3(-5.2, 0.1, -8.8), new THREE.Vector3(-3.8, -3.2, -13.7), eased);
      camera.position.copy(point.current);
      camera.lookAt(-4.8, -0.7 - eased, -13.2);
      store.setProgress(linear);
      if (linear >= 1 && !groundIssued.current) { groundIssued.current = true; onGroundComplete(); }
      return;
    }
    if (groundStarted.current !== null) { groundStarted.current = null; groundIssued.current = false; }
    if (store.phase === "ASCENT") {
      if (ascentStarted.current === null) { ascentStarted.current = clock.elapsedTime; cameraStart.current.copy(camera.position); target.current = null; onNearby(null); }
      const duration = reducedMotion ? 0.45 : ASCENT_DURATION_SECONDS;
      const linear = THREE.MathUtils.clamp((clock.elapsedTime - ascentStarted.current) / duration, 0, 1);
      const eased = THREE.MathUtils.smootherstep(linear, 0, 1);
      cubicPoint(point.current, cameraStart.current, new THREE.Vector3(3.8, 9, -8.5), new THREE.Vector3(1.4, 24, -22), new THREE.Vector3(0, 48, -57), eased);
      camera.position.copy(point.current);
      camera.lookAt(0, 10 + eased * 36, -30 - eased * 46);
      store.setProgress(linear);
      if (linear >= 1 && !ascentIssued.current) { ascentIssued.current = true; requestUraiWorldTravel({ destination: "life-map", href: "/life-map/?from=home-sky", entryPortal: "home-sky", cameraCheckpoint: "home-sky-ascent-complete" }); }
      return;
    }
    if (ascentStarted.current !== null) { ascentStarted.current = null; ascentIssued.current = false; }

    stepEmbodiedMotion({ delta, input, yaw: yaw.current, position: position.current, velocity: velocity.current, target, bounds: HOME_BOUNDS, speed: 3.1, acceleration: 9, deceleration: 12 });
    if (target.current && position.current.distanceTo(target.current) < 0.2) target.current = null;
    if (avatar.current) { avatar.current.position.copy(position.current); avatar.current.rotation.y = yaw.current; }
    const portrait = size.height > size.width;
    forward.current.set(Math.sin(yaw.current), 0, -Math.cos(yaw.current));
    desired.current.copy(position.current).add(new THREE.Vector3(0, portrait ? 1.62 : 1.7, portrait ? 0.18 : 0.12).applyAxisAngle(up.current, yaw.current));
    camera.position.lerp(desired.current, 1 - Math.pow(0.0008, delta));
    look.current.copy(position.current).addScaledVector(forward.current, portrait ? 6.6 : 8.6);
    camera.lookAt(look.current.x, 1.28 + pitch.current, look.current.z);

    const candidates: readonly [Nearby, THREE.Vector3, number][] = [["orb", ORB, 2.2], ["ground", GROUND_THRESHOLD, 2.55], ["life-map", LIFE_MAP_LOOKOUT, 2.55]];
    let next: Nearby = null;
    let best = Infinity;
    for (const [name, poi, radius] of candidates) {
      const distance = Math.hypot(position.current.x - poi.x, position.current.z - poi.z);
      if (distance < radius && distance < best) { next = name; best = distance; }
    }
    if (next !== lastNearby.current) { lastNearby.current = next; onNearby(next); }
  });
  return null;
}

function SceneReadiness({ onReady }: { onReady: () => void }) {
  const { scene } = useThree();
  const frames = useRef(0);
  const reported = useRef(false);
  useFrame(() => {
    frames.current += 1;
    if (reported.current || frames.current < 4) return;
    const required = ["home-authored-terrain", "home-authored-embodied-self", "home-orb-sanctuary", "home-ground-environmental-threshold", "home-life-map-sky-lookout", "home-mountain-horizon", "home-living-vegetation", "home-sanctuary-pavilion", "home-sanctuary-path"];
    if (!required.every((name) => scene.getObjectByName(name))) return;
    reported.current = true;
    onReady();
  });
  return null;
}

function HomeScene(props: { input: MovementInput; yaw: MutableRefObject<number>; pitch: MutableRefObject<number>; target: MutableRefObject<THREE.Vector3 | null>; avatar: MutableRefObject<THREE.Group | null>; onNearby: (value: Nearby) => void; onOrbOpen: () => void; onGround: () => void; onGroundComplete: () => void; onLifeMap: () => void; onSceneReady: () => void; groundDescent: boolean; reducedMotion: boolean; orbState: OrbState; personalizedScene: HomePersonalizedScene; }) {
  const phase = useSceneStore((state) => state.phase);
  const cosmic = phase === "ASCENT";
  const palette = useMemo(() => paletteFor(props.personalizedScene), [props.personalizedScene]);
  const fogDensity = cosmic ? 0.0017 : palette.fogDensity;
  return (
    <>
      <color attach="background" args={[cosmic ? "#01050b" : palette.sky]} />
      {(cosmic || palette.stars > 0) ? <Stars radius={190} depth={90} count={cosmic ? 2500 : palette.stars} factor={cosmic ? 2.8 : 1.0} saturation={0.12} fade speed={props.reducedMotion ? 0 : 0.025} /> : null}
      <fogExp2 attach="fog" args={[cosmic ? "#050b14" : palette.fog, fogDensity]} />
      <ambientLight intensity={cosmic ? 0.12 : palette.ambient} color="#d4e3dc" />
      <hemisphereLight args={[cosmic ? "#9cb8ca" : palette.horizon, cosmic ? "#071016" : palette.ground, cosmic ? 0.2 : 0.94]} />
      <directionalLight position={[9, 17, 4]} intensity={cosmic ? 0.32 : palette.key} color={cosmic ? "#d9e7f3" : "#fff1d4"} castShadow shadow-mapSize={[1024, 1024]} />
      <Terrain walkTarget={props.target} palette={palette} />
      <NaturalHorizon palette={palette} />
      <NaturalVegetation reducedMotion={props.reducedMotion} palette={palette} />
      <SanctuaryPath palette={palette} />
      <SanctuaryPavilion palette={palette} />
      <ReflectingWater palette={palette} />
      <MemorySignals scene={props.personalizedScene} reducedMotion={props.reducedMotion} />
      <ReducedMotionContext.Provider value={props.reducedMotion}>
        <OrbSanctuary onOpen={props.onOrbOpen} state={props.orbState} />
      </ReducedMotionContext.Provider>
      <EmbodiedPresence root={props.avatar} />
      <GroundThresholdLandmark onEnter={props.onGround} palette={palette} />
      <LifeMapSkyLookout onEnter={props.onLifeMap} />
      <PlayerRig input={props.input} yaw={props.yaw} pitch={props.pitch} target={props.target} avatar={props.avatar} onNearby={props.onNearby} groundDescent={props.groundDescent} onGroundComplete={props.onGroundComplete} reducedMotion={props.reducedMotion} />
      <SceneReadiness onReady={props.onSceneReady} />
      {!cosmic ? <ContactShadows position={[0, -0.08, -2.5]} opacity={0.16} scale={28} blur={4.8} far={14} resolution={512} frames={1} /> : null}
    </>
  );
}

export function HomeWorldProductionFinal({ onOrbOpen = requestUraiWorldOrbOpen, webglAvailable = true }: Props) {
  const { scene: personalizedScene, loading: personalizationLoading } = useHomePersonalizedScene();
  const [canvasReady, setCanvasReady] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const [nearby, setNearby] = useState<Nearby>(null);
  const [dragging, setDragging] = useState(false);
  const [reviewFixture, setReviewFixture] = useState("none");
  const [orbState, setOrbState] = useState<OrbState>("idle");
  const [orbReviewStateLocked, setOrbReviewStateLocked] = useState(false);
  const [transitionSequence, setTransitionSequence] = useState<TransitionSequence>("idle");
  const [groundDescent, setGroundDescent] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [mobileControls, setMobileControls] = useState(false);
  const phase = useSceneStore((state) => state.phase);
  const progress = useSceneStore((state) => state.progress);
  const inputLocked = useSceneStore((state) => state.inputLocked);
  const yaw = useRef(0);
  const pitch = useRef(-0.045);
  const target = useRef<THREE.Vector3 | null>(null);
  const avatar = useRef<THREE.Group | null>(null);

  const openOrb = useCallback(() => {
    if (useSceneStore.getState().inputLocked || groundDescent) return;
    if (!orbReviewStateLocked) setOrbState("listening");
    onOrbOpen();
  }, [groundDescent, onOrbOpen, orbReviewStateLocked]);
  const startGroundDescent = useCallback(() => { if (useSceneStore.getState().inputLocked || groundDescent) return; target.current = null; setOrbState("transition"); setTransitionSequence("ground:opening"); setGroundDescent(true); }, [groundDescent]);
  const finishGroundDescent = useCallback(() => { setTransitionSequence("ground:closing"); requestUraiWorldTravel({ destination: "infrastructure-hub", href: "/ground/", entryPortal: "home-ground", cameraCheckpoint: "home-ground-descent" }); }, []);
  const startLifeMapAscent = useCallback(() => { const store = useSceneStore.getState(); if (store.inputLocked || groundDescent || store.phase === "ASCENT") return; target.current = null; setOrbState("transition"); setTransitionSequence("life-map:opening"); store.enterLifeMap(); }, [groundDescent]);
  const interaction = useCallback(() => { if (useSceneStore.getState().inputLocked || groundDescent) return; if (nearby === "orb") openOrb(); if (nearby === "ground") startGroundDescent(); if (nearby === "life-map") startLifeMapAscent(); }, [groundDescent, nearby, openOrb, startGroundDescent, startLifeMapAscent]);
  const reset = useCallback(() => { if (groundDescent) return; yaw.current = 0; pitch.current = -0.045; target.current = SPAWN.clone(); setTransitionSequence("idle"); }, [groundDescent]);
  const input = useMovementInput({ enabled: !groundDescent, onInteract: interaction, onReset: reset });
  const look = useDragLook({ yaw, pitch, enabled: !groundDescent && phase !== "ASCENT", sensitivity: 0.0031, minPitch: -0.55, maxPitch: 0.68, onDragState: setDragging });
  const handleNearby = useCallback((value: Nearby) => {
    setNearby(value);
    if (orbReviewStateLocked || useSceneStore.getState().phase === "ASCENT" || groundDescent) return;
    setOrbState(value === "orb" ? "attention" : "idle");
  }, [groundDescent, orbReviewStateLocked]);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    setReviewFixture(query.get("homePrivateFixture") === "1" ? "safe-private" : "none");
    const requestedState = query.get("homeOrbState");
    if (requestedState && requestedState in ORB_CLIPS) {
      setOrbReviewStateLocked(true);
      setOrbState(requestedState as OrbState);
    } else {
      setOrbReviewStateLocked(false);
    }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mobile = window.matchMedia("(pointer: coarse), (max-width: 700px)");
    const apply = () => { setReducedMotion(reduced.matches); setMobileControls(mobile.matches); };
    apply();
    reduced.addEventListener?.("change", apply);
    mobile.addEventListener?.("change", apply);
    return () => { reduced.removeEventListener?.("change", apply); mobile.removeEventListener?.("change", apply); };
  }, []);
  useEffect(() => { if (phase === "ASCENT") setTransitionSequence("life-map:traversal"); }, [phase]);
  useEffect(() => { if (groundDescent) setTransitionSequence("ground:traversal"); }, [groundDescent]);
  useEffect(() => {
    if (orbReviewStateLocked || phase === "ASCENT" || groundDescent) return;
    if (personalizationLoading) setOrbState("thinking");
    else if (nearby === "orb") setOrbState("attention");
    else if (personalizedScene.environment.weatherTone === "heavy") setOrbState("calming");
    else setOrbState("idle");
  }, [groundDescent, nearby, orbReviewStateLocked, personalizationLoading, personalizedScene.environment.weatherTone, phase]);
  useEffect(() => {
    const cancel = (event: KeyboardEvent) => {
      const store = useSceneStore.getState();
      if (event.key !== "Escape") return;
      if (store.phase === "ASCENT") { event.preventDefault(); store.setPhase("HOME"); store.unlock(); setTransitionSequence("idle"); if (!orbReviewStateLocked) setOrbState("idle"); return; }
      if (groundDescent) { event.preventDefault(); setGroundDescent(false); setTransitionSequence("idle"); if (!orbReviewStateLocked) setOrbState("idle"); }
    };
    window.addEventListener("keydown", cancel, true);
    return () => window.removeEventListener("keydown", cancel, true);
  }, [groundDescent, orbReviewStateLocked]);

  if (!webglAvailable) return null;
  const ready = canvasReady && sceneReady;
  const transitioning = phase === "ASCENT" || groundDescent;
  const context = phase === "ASCENT" ? "Ascending through the sky" : groundDescent ? "Descending into Ground" : nearby === "orb" ? "The Orb is here" : nearby === "ground" ? "The path descends" : nearby === "life-map" ? "Look to the sky" : null;

  return (
    <main className={`${styles.world} urai-asset-home-world`} data-urai-home-production data-urai-true-3d="true" data-home-primary-owner="asset-driven" data-home-real-world-first="true" data-home-visible-world="authored-coherent-three-dimensional-sanctuary" data-home-world-character="believable-natural-inhabitable-environment" data-home-visible-portals="false" data-home-transition-affordances="ground-environmental-descent life-map-sky-lookout" data-home-provider-environment={HOME_PROVIDER_ENVIRONMENT} data-home-provider-role="atmospheric-support-only" data-home-provider-regions="home-atmospheric-horizon" data-home-generated-scenery="suppressed" data-home-physical-base="authored-coherent-world" data-home-visual-ownership="three-dimensional-geometry" data-home-desktop-mobile-world="same-scene" data-home-embodied-self="privacy-preserving-shadow" data-home-movement="walk-keyboard-click-touch" data-home-pointer-lock="false" data-home-audio="production-opus-consent-controlled" data-home-assets-ready={ready ? "true" : "false"} data-home-runtime-assets="home-entry-chamber-v1.glb polyhaven-fern-02-geometry-v1.glb urai-orb-avatar-v1.glb local-three-dimensional-terrain natural-horizon natural-path reflecting-water" data-home-authored-regions="home-sanctuary-geometry home-mountain-horizon home-living-vegetation home-reflecting-water" data-home-nearby={nearby ?? "none"} data-home-camera-mode={groundDescent ? "descent" : phase === "ASCENT" ? "ascent" : dragging ? "look" : "embodied-first-person"} data-home-scene-phase={groundDescent ? "GROUND_DESCENT" : phase} data-home-ascent-progress={phase === "ASCENT" ? progress.toFixed(3) : "0.000"} data-home-input-locked={transitioning || inputLocked ? "true" : "false"} data-home-portal-sequence={transitionSequence} data-home-portal-lifecycle="environmental-approach-traversal-arrival" data-home-review-fixture={reviewFixture} data-home-orb-state={orbState} data-home-orb-clip={ORB_CLIPS[orbState]} data-home-animation-owner={HOME_SCANNED_COMPOSITION_V1} data-home-personalization-mode={personalizedScene.mode} data-home-private-data-mounted={personalizedScene.privateDataMounted ? "true" : "false"} data-home-weather-tone={personalizedScene.environment.weatherTone} data-home-time-of-day={personalizedScene.environment.timeOfDay} data-home-place-count={personalizedScene.places.length} data-testid="home-visible-navigable-sanctuary-world" {...look}>
      <CinematicBackdrop scene={personalizedScene} />
      <div className={styles.canvasLayer}>
        <Canvas className={styles.canvas} dpr={[1, 1.4]} shadows camera={{ position: [0, 1.7, 8], fov: 50, near: 0.05, far: 300 }} gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }} onCreated={({ gl }) => { gl.outputColorSpace = THREE.SRGBColorSpace; gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.12; gl.shadowMap.type = THREE.PCFSoftShadowMap; gl.setClearColor(0x000000, 0); setCanvasReady(true); }}>
          <HomeScene input={input} yaw={yaw} pitch={pitch} target={target} avatar={avatar} onNearby={handleNearby} onOrbOpen={openOrb} onGround={startGroundDescent} onGroundComplete={finishGroundDescent} onLifeMap={startLifeMapAscent} onSceneReady={() => setSceneReady(true)} groundDescent={groundDescent} reducedMotion={reducedMotion} orbState={orbState} personalizedScene={personalizedScene} />
        </Canvas>
      </div>
      <header className={styles.brand} aria-label="URAI"><strong>URAI</strong></header>
      {context ? <div className={`${styles.worldHint} home-world-context`} data-home-world-context data-home-world-context-for={nearby ?? phase} role="status" aria-live="polite">{context}</div> : null}
      {!transitioning && mobileControls ? <MobileMovementPad input={input} label="Home movement controls" /> : null}
      <span className="sr-only" data-testid="urai-home-webgl-orb">The authored Orb companion is physically present in the Home environment and reflects its current semantic state.</span>
      <span className="sr-only" data-testid="urai-home-embodied-avatar">Your privacy-preserving embodied presence is represented without fabricating personal identity.</span>
      <span className="sr-only">Ground is reached by the descending natural path. Life Map is reached through the sky ascent. The Orb remains directly accessible.</span>
    </main>
  );
}

useGLTF.preload(HOME_SANCTUARY_MODEL);
useGLTF.preload(HOME_FERN_MODEL);
useGLTF.preload(HOME_ORB_MODEL);
