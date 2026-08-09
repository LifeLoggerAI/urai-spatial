"use client";

import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { ContactShadows, Environment, Float, Stars, useAnimations, useGLTF, useTexture } from "@react-three/drei";
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import * as THREE from "three";
import { MobileMovementPad, stepEmbodiedMotion, useDragLook, useMovementInput, type MovementInput } from "@/spatial/navigation/EmbodiedNavigation";
import { useSceneStore } from "@/spatial/store/useSceneStore";
import { requestUraiWorldOrbOpen, requestUraiWorldTravel } from "@/spatial/world/worldEvents";
import styles from "./HomeWorldProduction.module.css";

const HOME_MODEL = "/assets/urai/generated/models/home-entry-chamber-v1.glb";
const HOME_PROVIDER_ENVIRONMENT = "/assets/urai/replay/replay-memory-film-main.webp";
const ORB_MODEL = "/assets/urai/generated/models/urai-orb-avatar-v1.glb";

// Preview-only CC0 references. These replace visible proof geometry with real scanned/PBR assets.
// Before production lock these remote files must be vendored, hash-pinned, and retained with provenance.
const PH = "https://dl.polyhaven.org/file/ph-assets";
const NIGHT_HDRI = `${PH}/HDRIs/hdr/1k/qwantani_dusk_1_1k.hdr`;
const JACARANDA_MODEL = `${PH}/Models/gltf/1k/jacaranda_tree/jacaranda_tree_1k.gltf`;
const FERN_MODEL = `${PH}/Models/gltf/1k/fern_02/fern_02_1k.gltf`;
const SHRUB_MODEL = `${PH}/Models/gltf/1k/shrub_04/shrub_04_1k.gltf`;
const SORREL_MODEL = `${PH}/Models/gltf/1k/shrub_sorrel_01/shrub_sorrel_01_1k.gltf`;
const ROCK_MODEL = `${PH}/Models/gltf/1k/rock_moss_set_01/rock_moss_set_01_1k.gltf`;
const STUMP_MODEL = `${PH}/Models/gltf/1k/tree_stump_01/tree_stump_01_1k.gltf`;
const FOREST_FLOOR_DIFF = `${PH}/Textures/jpg/1k/forest_leaves_02/forest_leaves_02_diff_1k.jpg`;
const FOREST_FLOOR_NOR = `${PH}/Textures/jpg/1k/forest_leaves_02/forest_leaves_02_nor_gl_1k.jpg`;
const FOREST_FLOOR_ROUGH = `${PH}/Textures/jpg/1k/forest_leaves_02/forest_leaves_02_rough_1k.jpg`;

const HOME_BOUNDS = { minX: -12.5, maxX: 12.5, minZ: -15.5, maxZ: 10.5 };
const SPAWN = new THREE.Vector3(0, 0, 7.8);
const ORB = new THREE.Vector3(0, 1.72, -2.8);
const GROUND_THRESHOLD = new THREE.Vector3(-4.9, 0, -7.2);
const LIFE_MAP_LOOKOUT = new THREE.Vector3(4.9, 0, -7.2);
const ASCENT_DURATION_SECONDS = 3.6;
const GROUND_DESCENT_DURATION_SECONDS = 2.8;
const DISABLED_RAYCAST = () => undefined;
const GROUND_NORMAL_SCALE = new THREE.Vector2(0.55, 0.55);

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
type AssetPlacement = { position: Vec3; rotation?: Vec3; scale: number | Vec3 };

const OrbStateContext = createContext<OrbState>("idle");
const ReducedMotionContext = createContext(false);

const TREE_PLACEMENTS: readonly AssetPlacement[] = [
  { position: [-9.8, -0.25, 3.7], rotation: [0, 0.25, 0], scale: 0.29 },
  { position: [9.6, -0.25, 3.1], rotation: [0, -0.52, 0], scale: 0.31 },
  { position: [-10.8, -0.4, -9.2], rotation: [0, 1.1, 0], scale: 0.34 },
  { position: [10.2, -0.38, -9.8], rotation: [0, -1.05, 0], scale: 0.33 },
];

const FERN_PLACEMENTS: readonly AssetPlacement[] = [
  { position: [-6.6, 0, 4.8], rotation: [0, 0.3, 0], scale: 0.7 },
  { position: [-7.4, 0, 1.2], rotation: [0, -0.7, 0], scale: 0.55 },
  { position: [-6.3, 0, -3.7], rotation: [0, 1.5, 0], scale: 0.8 },
  { position: [-7.1, 0, -8.4], rotation: [0, 0.9, 0], scale: 0.62 },
  { position: [6.8, 0, 4.4], rotation: [0, -0.5, 0], scale: 0.72 },
  { position: [7.4, 0, 0.6], rotation: [0, 1.0, 0], scale: 0.58 },
  { position: [6.6, 0, -3.9], rotation: [0, -1.2, 0], scale: 0.78 },
  { position: [7.0, 0, -8.5], rotation: [0, 0.25, 0], scale: 0.64 },
];

const SHRUB_PLACEMENTS: readonly AssetPlacement[] = [
  { position: [-4.9, 0, 4.9], rotation: [0, 0.8, 0], scale: 1.1 },
  { position: [-5.8, 0, -0.7], rotation: [0, -0.2, 0], scale: 0.92 },
  { position: [-4.9, 0, -6.1], rotation: [0, 1.7, 0], scale: 1.0 },
  { position: [5.2, 0, 4.6], rotation: [0, -0.9, 0], scale: 1.08 },
  { position: [5.9, 0, -0.9], rotation: [0, 0.45, 0], scale: 0.96 },
  { position: [4.8, 0, -6.0], rotation: [0, -1.4, 0], scale: 1.04 },
];

const SORREL_PLACEMENTS: readonly AssetPlacement[] = [
  { position: [-3.7, 0, 2.9], rotation: [0, 0.2, 0], scale: 1.2 },
  { position: [-3.9, 0, -1.0], rotation: [0, -0.5, 0], scale: 1.0 },
  { position: [-3.4, 0, -5.0], rotation: [0, 1.1, 0], scale: 1.15 },
  { position: [3.5, 0, 3.0], rotation: [0, -0.4, 0], scale: 1.16 },
  { position: [3.8, 0, -1.2], rotation: [0, 0.7, 0], scale: 1.04 },
  { position: [3.3, 0, -5.2], rotation: [0, -1.2, 0], scale: 1.12 },
];

const ROCK_PLACEMENTS: readonly AssetPlacement[] = [
  { position: [-6.8, -0.05, 5.0], rotation: [0, 0.6, 0], scale: 0.2 },
  { position: [-7.2, -0.06, -2.6], rotation: [0, -0.5, 0], scale: 0.17 },
  { position: [-5.7, -0.04, -8.7], rotation: [0, 1.2, 0], scale: 0.19 },
  { position: [6.8, -0.05, 5.1], rotation: [0, -0.4, 0], scale: 0.19 },
  { position: [7.3, -0.05, -2.4], rotation: [0, 0.75, 0], scale: 0.18 },
  { position: [5.7, -0.05, -8.8], rotation: [0, -1.1, 0], scale: 0.2 },
];

function seeded(index: number, salt = 0) {
  const value = Math.sin(index * 91.73 + salt * 37.17) * 43758.5453;
  return value - Math.floor(value);
}

function terrainHeight(x: number, z: number) {
  const broad = Math.sin(x * 0.09) * 0.18 + Math.cos(z * 0.095) * 0.15 + Math.sin((x + z) * 0.05) * 0.09;
  const detail = Math.sin(x * 0.33 + z * 0.19) * 0.018 + Math.cos(z * 0.29 - x * 0.15) * 0.018;
  const clearing = -Math.exp(-((x / 8.8) ** 2 + ((z + 1.8) / 10.5) ** 2)) * 0.24;
  const pond = -Math.exp(-(((x - 5.0) / 3.3) ** 2 + ((z + 6.8) / 4.8) ** 2)) * 0.3;
  return broad + detail + clearing + pond - 0.12;
}

function makeTerrainGeometry() {
  const geometry = new THREE.PlaneGeometry(80, 80, 220, 220);
  geometry.rotateX(-Math.PI / 2);
  const position = geometry.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i);
    const z = position.getZ(i);
    position.setY(i, terrainHeight(x, z));
  }
  geometry.computeVertexNormals();
  return geometry;
}

const TERRAIN_GEOMETRY = makeTerrainGeometry();

function tuneMaterial(name: string, source: THREE.Material | THREE.Material[]) {
  const inherited = Array.isArray(source) ? source[0] : source;
  const material = inherited instanceof THREE.MeshStandardMaterial ? inherited.clone() : new THREE.MeshStandardMaterial();
  const id = name.toLowerCase();
  material.metalness = /bronze|rim/.test(id) ? 0.08 : 0;
  material.roughness = /water|pool|stream/.test(id) ? 0.2 : /bronze|rim/.test(id) ? 0.62 : 0.9;
  material.transparent = false;
  material.opacity = 1;
  if (/path|step|terrace/.test(id)) material.color.set("#46524a");
  else if (/basin|pedestal|stone/.test(id)) material.color.set("#53605a");
  else if (/water|pool|stream/.test(id)) material.color.set("#285667");
  else if (/terrain|ground|moss|garden/.test(id)) material.color.set("#315847");
  else if (/wood|beam|timber/.test(id)) material.color.set("#46382d");
  else material.color.set("#40514a");
  material.emissive.set("#020908");
  material.emissiveIntensity = /heart/.test(id) ? 0.08 : 0.002;
  material.needsUpdate = true;
  return material;
}

function prepareAuthoredSanctuary(source: THREE.Object3D) {
  const world = source.clone(true);
  let visibleMeshCount = 0;
  world.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const id = object.name.toLowerCase();
    const rejected = /portal|ring|threshold|village|mannequin|avatar|debug|marker|label|embodied|presence|memory-place-anchor|living-growth/;
    object.visible = !rejected.test(id);
    if (!object.visible) return;
    visibleMeshCount += 1;
    object.material = tuneMaterial(object.name, object.material);
    object.castShadow = false;
    object.receiveShadow = false;
    object.frustumCulled = false;
  });
  if (visibleMeshCount < 3) throw new Error("Home authored 3D world is missing required physical geometry.");
  world.visible = false;
  world.userData.uraiVisibleWorld = "authored-coherent-three-dimensional-sanctuary";
  world.userData.suppressedPortalProps = true;
  world.userData.suppressedForgeScenery = true;
  world.userData.retainedForGovernedCompatibilityOnly = true;
  world.userData.centeredForHomeCamera = true;
  return world;
}

function prepareOrb(source: THREE.Object3D) {
  const orb = source.clone(true);
  orb.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const inherited = Array.isArray(object.material) ? object.material[0] : object.material;
    const material = inherited instanceof THREE.MeshStandardMaterial ? inherited.clone() : new THREE.MeshStandardMaterial();
    material.transparent = true;
    material.opacity = 0;
    material.depthWrite = false;
    material.colorWrite = false;
    material.needsUpdate = true;
    object.material = material;
    object.castShadow = false;
    object.receiveShadow = false;
    object.frustumCulled = false;
  });
  return orb;
}

function prepareNaturalAsset(source: THREE.Object3D) {
  const clone = source.clone(true);
  clone.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.castShadow = true;
    object.receiveShadow = true;
    object.frustumCulled = true;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      if (material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshPhysicalMaterial) {
        material.roughness = Math.max(material.roughness, 0.58);
        material.needsUpdate = true;
      }
    }
  });
  return clone;
}

function NaturalAsset({ url, position, rotation = [0, 0, 0], scale }: { url: string; position: Vec3; rotation?: Vec3; scale: number | Vec3 }) {
  const { scene } = useGLTF(url);
  const asset = useMemo(() => prepareNaturalAsset(scene), [scene]);
  const resolvedScale = typeof scale === "number" ? scale : (scale as [number, number, number]);
  return (
    <primitive
      object={asset}
      position={position as [number, number, number]}
      rotation={rotation as [number, number, number]}
      scale={resolvedScale}
      dispose={null}
    />
  );
}

function GroundSurface({ onWalk }: { onWalk: (event: ThreeEvent<MouseEvent>) => void }) {
  const [diffuse, normal, roughness] = useTexture([FOREST_FLOOR_DIFF, FOREST_FLOOR_NOR, FOREST_FLOOR_ROUGH]);
  useMemo(() => {
    diffuse.colorSpace = THREE.SRGBColorSpace;
    for (const texture of [diffuse, normal, roughness]) {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(9, 9);
      texture.anisotropy = 4;
      texture.needsUpdate = true;
    }
  }, [diffuse, normal, roughness]);
  return (
    <mesh name="home-natural-terrain" geometry={TERRAIN_GEOMETRY} receiveShadow onClick={onWalk}>
      <meshStandardMaterial
        map={diffuse}
        normalMap={normal}
        normalScale={GROUND_NORMAL_SCALE}
        roughnessMap={roughness}
        roughness={0.96}
        metalness={0}
        color="#d8e3d6"
      />
    </mesh>
  );
}

function FireflyField({ reducedMotion }: { reducedMotion: boolean }) {
  const points = useRef<THREE.Points>(null);
  const geometry = useMemo(() => {
    const positions = new Float32Array(180 * 3);
    for (let i = 0; i < 180; i += 1) {
      const x = (seeded(i, 17) - 0.5) * 28;
      const z = (seeded(i, 18) - 0.5) * 24 - 2;
      positions[i * 3] = x;
      positions[i * 3 + 1] = terrainHeight(x, z) + 0.35 + seeded(i, 19) * 2.4;
      positions[i * 3 + 2] = z;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, []);
  useFrame(({ clock }) => {
    if (reducedMotion || !points.current) return;
    points.current.position.y = Math.sin(clock.elapsedTime * 0.32) * 0.04;
    points.current.rotation.y = Math.sin(clock.elapsedTime * 0.04) * 0.01;
  });
  return (
    <points ref={points} geometry={geometry}>
      <pointsMaterial color="#dcf3c0" size={0.055} transparent opacity={0.55} depthWrite={false} sizeAttenuation toneMapped={false} />
    </points>
  );
}

function NaturalVegetation({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <group name="home-living-vegetation" userData={{ role: "cc0-photoreal-natural-grove", repeatedForgeVegetation: false }}>
      {TREE_PLACEMENTS.map((placement, index) => <NaturalAsset key={`tree-${index}`} url={JACARANDA_MODEL} {...placement} />)}
      {FERN_PLACEMENTS.map((placement, index) => <NaturalAsset key={`fern-${index}`} url={FERN_MODEL} {...placement} />)}
      {SHRUB_PLACEMENTS.map((placement, index) => <NaturalAsset key={`shrub-${index}`} url={SHRUB_MODEL} {...placement} />)}
      {SORREL_PLACEMENTS.map((placement, index) => <NaturalAsset key={`sorrel-${index}`} url={SORREL_MODEL} {...placement} />)}
      {ROCK_PLACEMENTS.map((placement, index) => <NaturalAsset key={`rock-${index}`} url={ROCK_MODEL} {...placement} />)}
      <NaturalAsset url={STUMP_MODEL} position={[-6.3, -0.08, -5.5]} rotation={[0, 0.45, 0]} scale={0.72} />
      <FireflyField reducedMotion={reducedMotion} />
    </group>
  );
}

function NaturalHorizon() {
  return (
    <group name="home-mountain-horizon" userData={{ role: "atmospheric-depth-boundary", form: "photo-hdri-horizon" }}>
      <NaturalAsset url={JACARANDA_MODEL} position={[-17, -1.0, -25]} rotation={[0, 0.7, 0]} scale={0.44} />
      <NaturalAsset url={JACARANDA_MODEL} position={[17, -1.0, -26]} rotation={[0, -0.55, 0]} scale={0.46} />
    </group>
  );
}

function SanctuaryPavilion() {
  const ring = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const angle = (index / 7) * Math.PI * 2;
    return {
      position: [Math.cos(angle) * 2.15, -0.09, -2.8 + Math.sin(angle) * 1.8] as Vec3,
      rotation: [0, angle + 0.35, 0] as Vec3,
      scale: 0.075 + (index % 3) * 0.008,
    };
  }), []);
  return (
    <group name="home-sanctuary-geometry" userData={{ role: "natural-stone-orb-clearing" }}>
      {ring.map((placement, index) => <NaturalAsset key={index} url={ROCK_MODEL} {...placement} />)}
      <pointLight color="#dcb780" intensity={0.34} distance={7} decay={2} position={[-2.4, 0.42, -2.6]} />
      <pointLight color="#8bd0c1" intensity={0.38} distance={7} decay={2} position={[2.4, 0.52, -2.8]} />
    </group>
  );
}

function SanctuaryPath() {
  return (
    <group name="home-natural-path-network" userData={{ role: "unmarked-walkable-clearing-path" }}>
      <NaturalAsset url={ROCK_MODEL} position={[-1.45, -0.08, 1.9]} rotation={[0, 0.6, 0]} scale={0.05} />
      <NaturalAsset url={ROCK_MODEL} position={[1.55, -0.08, 0.3]} rotation={[0, -0.75, 0]} scale={0.045} />
      <NaturalAsset url={ROCK_MODEL} position={[-1.2, -0.08, -1.0]} rotation={[0, 1.3, 0]} scale={0.04} />
    </group>
  );
}

function WaterGarden() {
  const pondY = terrainHeight(5.0, -6.8) + 0.05;
  return (
    <group position={[5.0, pondY, -6.8]} name="home-reflecting-water" userData={{ role: "moonlit-natural-water-garden" }}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[1.35, 1, 1]} receiveShadow>
        <circleGeometry args={[2.7, 128]} />
        <meshPhysicalMaterial color="#153c48" roughness={0.08} metalness={0.02} clearcoat={1} clearcoatRoughness={0.08} transparent opacity={0.78} />
      </mesh>
      <NaturalAsset url={ROCK_MODEL} position={[-2.5, -0.08, 0.3]} rotation={[0, 0.4, 0]} scale={0.07} />
      <NaturalAsset url={ROCK_MODEL} position={[2.4, -0.08, -0.5]} rotation={[0, -0.7, 0]} scale={0.065} />
      <NaturalAsset url={FERN_MODEL} position={[-2.1, 0, -1.2]} rotation={[0, 0.8, 0]} scale={0.48} />
      <NaturalAsset url={FERN_MODEL} position={[1.9, 0, 1.25]} rotation={[0, -1.1, 0]} scale={0.44} />
      <pointLight position={[-1.2, 0.6, 0.9]} color="#79c6bc" intensity={0.28} distance={5} decay={2} />
    </group>
  );
}

function LanternNook() {
  return (
    <group position={[-6.2, terrainHeight(-6.2, -5.5), -5.5]} name="home-warm-sanctuary-nook" userData={{ role: "warm-home-anchor" }}>
      <NaturalAsset url={STUMP_MODEL} position={[0, 0, 0]} rotation={[0, 0.4, 0]} scale={0.8} />
      <mesh position={[0.15, 0.72, 0.18]}>
        <sphereGeometry args={[0.07, 20, 16]} />
        <meshStandardMaterial color="#ffd79b" emissive="#f1a74f" emissiveIntensity={3.2} toneMapped={false} />
      </mesh>
      <pointLight position={[0.15, 0.82, 0.18]} color="#ffc77b" intensity={1.05} distance={6.5} decay={2} />
    </group>
  );
}

function AtmosphereParticles({ reducedMotion }: { reducedMotion: boolean }) {
  const points = useRef<THREE.Points>(null);
  const geometry = useMemo(() => {
    const positions = new Float32Array(420 * 3);
    for (let i = 0; i < 420; i += 1) {
      positions[i * 3] = (seeded(i, 12) - 0.5) * 62;
      positions[i * 3 + 1] = 1.0 + seeded(i, 13) * 14;
      positions[i * 3 + 2] = -40 + seeded(i, 14) * 55;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, []);
  useFrame(({ clock }, delta) => {
    if (reducedMotion || !points.current) return;
    points.current.rotation.y += delta * 0.0012;
    points.current.position.y = Math.sin(clock.elapsedTime * 0.11) * 0.04;
  });
  return (
    <points ref={points} geometry={geometry}>
      <pointsMaterial color="#c8dfda" size={0.025} transparent opacity={0.2} depthWrite={false} sizeAttenuation />
    </points>
  );
}

function Moon() {
  return (
    <group position={[11, 15.5, -48]} name="home-moon-rim-light">
      <mesh>
        <sphereGeometry args={[1.8, 56, 56]} />
        <meshBasicMaterial color="#edf4ef" toneMapped={false} />
      </mesh>
      <mesh scale={1.2}>
        <sphereGeometry args={[1.8, 48, 48]} />
        <meshBasicMaterial color="#a4d2cb" transparent opacity={0.045} depthWrite={false} toneMapped={false} />
      </mesh>
      <pointLight color="#c6ded9" intensity={0.95} distance={65} decay={2} />
    </group>
  );
}

function SanctuaryWorld({ walkTarget, reducedMotion }: { walkTarget: MutableRefObject<THREE.Vector3 | null>; reducedMotion: boolean }) {
  const { scene } = useGLTF(HOME_MODEL);
  const authoredWorld = useMemo(() => prepareAuthoredSanctuary(scene), [scene]);
  const onWalk = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    if (useSceneStore.getState().inputLocked) return;
    walkTarget.current = new THREE.Vector3(
      THREE.MathUtils.clamp(event.point.x, HOME_BOUNDS.minX, HOME_BOUNDS.maxX),
      0,
      THREE.MathUtils.clamp(event.point.z, HOME_BOUNDS.minZ, HOME_BOUNDS.maxZ),
    );
  };

  return (
    <group name="home-authored-terrain" userData={{ runtimeAsset: HOME_MODEL, visualEnvironment: HOME_PROVIDER_ENVIRONMENT, physicalBase: "authored-coherent-world", providerImageRole: "atmospheric-support-only", regions: ["home-mountain-horizon", "home-living-vegetation"] }}>
      <primitive object={authoredWorld} />
      <GroundSurface onWalk={onWalk} />
      <NaturalHorizon />
      <NaturalVegetation reducedMotion={reducedMotion} />
      <SanctuaryPath />
      <SanctuaryPavilion />
      <WaterGarden />
      <LanternNook />
      <mesh name="home-walkable-navigation-surface" rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.55, -1.5]} onClick={onWalk}>
        <planeGeometry args={[25, 27]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
    </group>
  );
}

function orbitGeometry(radiusX: number, radiusY: number) {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i < 112; i += 1) {
    const t = (i / 112) * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(t) * radiusX, Math.sin(t) * radiusY, 0));
  }
  return new THREE.BufferGeometry().setFromPoints(points);
}

function OrbOrbit({ rx, ry, rotation, opacity, color = "#c6fff0" }: { rx: number; ry: number; rotation: Vec3; opacity: number; color?: string }) {
  const geometry = useMemo(() => orbitGeometry(rx, ry), [rx, ry]);
  return (
    <lineLoop geometry={geometry} rotation={rotation as [number, number, number]}>
      <lineBasicMaterial color={color} transparent opacity={opacity} toneMapped={false} />
    </lineLoop>
  );
}

function LivingOrbShell({ reducedMotion }: { reducedMotion: boolean }) {
  const group = useRef<THREE.Group>(null);
  const core = useRef<THREE.Mesh>(null);
  const inner = useRef<THREE.Mesh>(null);
  const light = useRef<THREE.PointLight>(null);
  useFrame(({ clock }, delta) => {
    if (reducedMotion) return;
    const breathe = 1 + Math.sin(clock.elapsedTime * 1.08) * 0.032;
    core.current?.scale.setScalar(breathe);
    inner.current?.scale.setScalar(1 + Math.sin(clock.elapsedTime * 0.82 + 0.8) * 0.018);
    if (group.current) group.current.rotation.y += delta * 0.085;
    if (light.current) light.current.intensity = 3.2 + Math.sin(clock.elapsedTime * 1.08) * 0.34;
  });
  return (
    <group ref={group}>
      <mesh scale={1.48}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshPhysicalMaterial color="#c9fff2" emissive="#4d9e8b" emissiveIntensity={0.24} roughness={0.035} metalness={0} transmission={0.58} thickness={0.26} transparent opacity={0.18} depthWrite={false} />
      </mesh>
      <mesh ref={inner} scale={1.06}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshPhysicalMaterial color="#e1fff7" emissive="#7fd9c4" emissiveIntensity={0.48} roughness={0.08} metalness={0} transmission={0.3} clearcoat={1} clearcoatRoughness={0.05} transparent opacity={0.48} />
      </mesh>
      <mesh ref={core} scale={0.55}>
        <sphereGeometry args={[1, 56, 56]} />
        <meshStandardMaterial color="#ffe6b7" emissive="#f3bb67" emissiveIntensity={3.2} roughness={0.14} metalness={0} toneMapped={false} />
      </mesh>
      <OrbOrbit rx={1.62} ry={0.71} rotation={[0.45, 0.2, 0.18]} opacity={0.34} />
      <OrbOrbit rx={1.54} ry={0.77} rotation={[-0.32, 0.8, -0.24]} opacity={0.24} color="#ffe1a2" />
      <OrbOrbit rx={1.4} ry={0.88} rotation={[0.1, -0.55, 0.7]} opacity={0.18} />
      <pointLight ref={light} color="#8ce8d2" intensity={3.2} distance={10.5} decay={2} />
      <pointLight color="#f4c37e" intensity={1.15} distance={6.2} decay={2} position={[0, -0.1, 0.55]} />
    </group>
  );
}

function OrbSanctuary({ onOpen }: { onOpen: () => void }) {
  const interactive = !useSceneStore((store) => store.inputLocked);
  const state = useContext(OrbStateContext);
  const reducedMotion = useContext(ReducedMotionContext);
  const { scene, animations } = useGLTF(ORB_MODEL);
  const root = useRef<THREE.Group>(null);
  const orb = useMemo(() => prepareOrb(scene), [scene]);
  const { actions } = useAnimations(animations, root);
  const clip = ORB_CLIPS[state];
  useEffect(() => {
    if (reducedMotion) return;
    const action = actions[clip] || actions.Orb_Idle || actions.Orb_Resting;
    action?.reset().fadeIn(0.3).play();
    return () => { action?.fadeOut(0.18); };
  }, [actions, clip, reducedMotion]);
  return (
    <group ref={root} name="home-orb-sanctuary" position={ORB} scale={0.5} userData={{ runtimeAsset: ORB_MODEL, semanticOwner: "urai-home-webgl-orb", clip }} raycast={interactive ? undefined : DISABLED_RAYCAST} onClick={(event) => { event.stopPropagation(); onOpen(); }}>
      <Float speed={reducedMotion ? 0 : 0.42} rotationIntensity={reducedMotion ? 0 : 0.024} floatIntensity={reducedMotion ? 0 : 0.1}>
        <primitive object={orb} />
        <LivingOrbShell reducedMotion={reducedMotion} />
      </Float>
    </group>
  );
}

function EmbodiedPresence({ root }: { root: MutableRefObject<THREE.Group | null> }) {
  return (
    <group ref={root} name="home-authored-embodied-self" position={SPAWN} userData={{ semanticOwner: "urai-home-embodied-avatar", representation: "privacy-preserving-first-person-presence" }} raycast={DISABLED_RAYCAST}>
      <mesh position={[0, 0.012, 0.3]} rotation={[-Math.PI / 2, 0, 0]} scale={[0.45, 1.15, 1]}>
        <circleGeometry args={[0.4, 32]} />
        <meshBasicMaterial color="#020706" transparent opacity={0.1} depthWrite={false} />
      </mesh>
    </group>
  );
}

function GroundThresholdLandmark({ onEnter }: { onEnter: () => void }) {
  return (
    <group name="home-ground-environmental-threshold" position={GROUND_THRESHOLD} userData={{ destination: "ground", transition: "physical-descent", visiblePortal: false }}>
      <mesh position={[0, 0.55, 0]} onClick={(event) => { event.stopPropagation(); onEnter(); }}>
        <boxGeometry args={[3.6, 2.2, 3.6]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
      <pointLight color="#d6aa70" intensity={0.34} distance={5.4} decay={2} position={[0, 0.05, -0.7]} />
    </group>
  );
}

function LifeMapSkyLookout({ onEnter }: { onEnter: () => void }) {
  return (
    <group name="home-life-map-sky-lookout" position={LIFE_MAP_LOOKOUT} userData={{ destination: "life-map", transition: "sky-ascent", visiblePortal: false }}>
      <mesh position={[0, 0.8, 0]} onClick={(event) => { event.stopPropagation(); onEnter(); }}>
        <boxGeometry args={[3.6, 2.4, 3.6]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
      <pointLight color="#8ed3c4" intensity={0.3} distance={5.0} decay={2} position={[0, 1.3, -0.35]} />
    </group>
  );
}

function cubicPoint(target: THREE.Vector3, p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3, t: number) {
  const i = 1 - t;
  target.set(0, 0, 0).addScaledVector(p0, i * i * i).addScaledVector(p1, 3 * i * i * t).addScaledVector(p2, 3 * i * t * t).addScaledVector(p3, t * t * t);
}

function PlayerRig({ input, yaw, pitch, target, avatar, onNearby, groundDescent, onGroundComplete, reducedMotion }: {
  input: MovementInput;
  yaw: MutableRefObject<number>;
  pitch: MutableRefObject<number>;
  target: MutableRefObject<THREE.Vector3 | null>;
  avatar: MutableRefObject<THREE.Group | null>;
  onNearby: (value: Nearby) => void;
  groundDescent: boolean;
  onGroundComplete: () => void;
  reducedMotion: boolean;
}) {
  const { camera, size } = useThree();
  const position = useRef(SPAWN.clone());
  const velocity = useRef(new THREE.Vector3());
  const lastNearby = useRef<Nearby>(null);
  const ascentStarted = useRef<number | null>(null);
  const groundStarted = useRef<number | null>(null);
  const issued = useRef(false);
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
    look.current.copy(position.current).addScaledVector(forward.current, portrait ? 6.4 : 8.4);
    camera.lookAt(look.current.x, 1.38 + pitch.current, look.current.z);
  }, [camera, pitch, size.height, size.width, yaw]);
  useLayoutEffect(() => { place(); }, [place]);

  useFrame(({ clock }, delta) => {
    const store = useSceneStore.getState();
    if (groundDescent) {
      if (groundStarted.current === null) {
        groundStarted.current = clock.elapsedTime;
        cameraStart.current.copy(camera.position);
        velocity.current.set(0, 0, 0);
        target.current = null;
        onNearby(null);
      }
      const duration = reducedMotion ? 0.45 : GROUND_DESCENT_DURATION_SECONDS;
      const linear = THREE.MathUtils.clamp((clock.elapsedTime - groundStarted.current) / duration, 0, 1);
      const eased = THREE.MathUtils.smootherstep(linear, 0, 1);
      cubicPoint(point.current, cameraStart.current, new THREE.Vector3(-3.6, 1.3, -5.5), new THREE.Vector3(-5.1, 0.2, -8.7), new THREE.Vector3(-3.8, -3.1, -13.6), eased);
      camera.position.copy(point.current);
      camera.lookAt(-4.8, -0.7 - eased, -13.1);
      store.setProgress(linear);
      if (linear >= 1 && !groundIssued.current) {
        groundIssued.current = true;
        onGroundComplete();
      }
      return;
    }
    if (groundStarted.current !== null) {
      groundStarted.current = null;
      groundIssued.current = false;
    }
    if (store.phase === "ASCENT") {
      if (ascentStarted.current === null) {
        ascentStarted.current = clock.elapsedTime;
        cameraStart.current.copy(camera.position);
        velocity.current.set(0, 0, 0);
        target.current = null;
        onNearby(null);
      }
      const duration = reducedMotion ? 0.45 : ASCENT_DURATION_SECONDS;
      const linear = THREE.MathUtils.clamp((clock.elapsedTime - ascentStarted.current) / duration, 0, 1);
      const eased = THREE.MathUtils.smootherstep(linear, 0, 1);
      cubicPoint(point.current, cameraStart.current, new THREE.Vector3(3.8, 9.0, -8.5), new THREE.Vector3(1.4, 24, -22), new THREE.Vector3(0, 48, -57), eased);
      camera.position.copy(point.current);
      camera.lookAt(0, 10 + eased * 36, -30 - eased * 46);
      store.setProgress(linear);
      if (linear >= 1 && !issued.current) {
        issued.current = true;
        requestUraiWorldTravel({ destination: "life-map", href: "/life-map/?from=home-sky", entryPortal: "home-sky", cameraCheckpoint: "home-sky-ascent-complete" });
      }
      return;
    }
    if (ascentStarted.current !== null) {
      ascentStarted.current = null;
      issued.current = false;
    }

    stepEmbodiedMotion({ delta, input, yaw: yaw.current, position: position.current, velocity: velocity.current, target, bounds: HOME_BOUNDS, speed: 3.1, acceleration: 9, deceleration: 12 });
    if (target.current && position.current.distanceTo(target.current) < 0.2) target.current = null;
    if (avatar.current) {
      avatar.current.position.copy(position.current);
      avatar.current.rotation.y = yaw.current;
    }
    const portrait = size.height > size.width;
    forward.current.set(Math.sin(yaw.current), 0, -Math.cos(yaw.current));
    desired.current.copy(position.current).add(new THREE.Vector3(0, portrait ? 1.62 : 1.7, portrait ? 0.18 : 0.12).applyAxisAngle(up.current, yaw.current));
    camera.position.lerp(desired.current, 1 - Math.pow(0.0008, delta));
    look.current.copy(position.current).addScaledVector(forward.current, portrait ? 6.4 : 8.4);
    camera.lookAt(look.current.x, 1.38 + pitch.current, look.current.z);

    const distances: readonly [Nearby, THREE.Vector3, number][] = [
      ["orb", ORB, 2.2],
      ["ground", GROUND_THRESHOLD, 2.55],
      ["life-map", LIFE_MAP_LOOKOUT, 2.55],
    ];
    let next: Nearby = null;
    let best = Infinity;
    for (const [name, pointOfInterest, radius] of distances) {
      const distance = Math.hypot(position.current.x - pointOfInterest.x, position.current.z - pointOfInterest.z);
      if (distance < radius && distance < best) {
        next = name;
        best = distance;
      }
    }
    if (next !== lastNearby.current) {
      lastNearby.current = next;
      onNearby(next);
    }
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
    const required = ["home-authored-terrain", "home-authored-embodied-self", "home-orb-sanctuary", "home-ground-environmental-threshold", "home-life-map-sky-lookout", "home-mountain-horizon", "home-living-vegetation"];
    if (!required.every((name) => scene.getObjectByName(name))) return;
    reported.current = true;
    onReady();
  });
  return null;
}

function HomeScene(props: {
  input: MovementInput;
  yaw: MutableRefObject<number>;
  pitch: MutableRefObject<number>;
  target: MutableRefObject<THREE.Vector3 | null>;
  avatar: MutableRefObject<THREE.Group | null>;
  onNearby: (value: Nearby) => void;
  onOrbOpen: () => void;
  onGround: () => void;
  onGroundComplete: () => void;
  onLifeMap: () => void;
  orbState: OrbState;
  onSceneReady: () => void;
  groundDescent: boolean;
  reducedMotion: boolean;
}) {
  const phase = useSceneStore((state) => state.phase);
  const cosmic = phase === "ASCENT";
  return (
    <>
      <color attach="background" args={[cosmic ? "#01050b" : "#0b171a"]} />
      {!cosmic ? <Environment files={NIGHT_HDRI} background /> : null}
      <Stars radius={190} depth={90} count={cosmic ? 2400 : 1050} factor={cosmic ? 2.6 : 1.25} saturation={0.16} fade speed={props.reducedMotion ? 0 : 0.04} />
      <fogExp2 attach="fog" args={[cosmic ? "#050b14" : "#102528", cosmic ? 0.0017 : 0.011]} />
      <ambientLight intensity={cosmic ? 0.14 : 0.28} color="#c2d7d2" />
      <hemisphereLight args={["#9fc1c4", "#07100d", cosmic ? 0.24 : 0.52]} />
      <directionalLight position={[12, 18, -18]} intensity={cosmic ? 0.36 : 1.45} color="#d7e4df" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-near={0.5} shadow-camera-far={72} shadow-camera-left={-24} shadow-camera-right={24} shadow-camera-top={24} shadow-camera-bottom={-24} />
      <directionalLight position={[-8, 9, 7]} intensity={cosmic ? 0.12 : 0.34} color="#e0b77f" />
      <Moon />
      <AtmosphereParticles reducedMotion={props.reducedMotion} />
      <SceneReadiness onReady={props.onSceneReady} />
      <PlayerRig input={props.input} yaw={props.yaw} pitch={props.pitch} target={props.target} avatar={props.avatar} onNearby={props.onNearby} groundDescent={props.groundDescent} onGroundComplete={props.onGroundComplete} reducedMotion={props.reducedMotion} />
      <SanctuaryWorld walkTarget={props.target} reducedMotion={props.reducedMotion} />
      <EmbodiedPresence root={props.avatar} />
      <ReducedMotionContext.Provider value={props.reducedMotion}>
        <OrbStateContext.Provider value={props.orbState}>
          <OrbSanctuary onOpen={props.onOrbOpen} />
        </OrbStateContext.Provider>
      </ReducedMotionContext.Provider>
      <GroundThresholdLandmark onEnter={props.onGround} />
      <LifeMapSkyLookout onEnter={props.onLifeMap} />
      {!cosmic ? <ContactShadows position={[0, -0.08, -2.2]} opacity={0.22} scale={30} blur={4.2} far={15} resolution={512} frames={1} /> : null}
    </>
  );
}

export function HomeWorldProductionFinal({ onOrbOpen = requestUraiWorldOrbOpen, webglAvailable = true }: Props) {
  const [canvasReady, setCanvasReady] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const [nearby, setNearby] = useState<Nearby>(null);
  const [dragging, setDragging] = useState(false);
  const [reviewFixture, setReviewFixture] = useState("none");
  const [orbState, setOrbState] = useState<OrbState>("idle");
  const [transitionSequence, setTransitionSequence] = useState<TransitionSequence>("idle");
  const [groundDescent, setGroundDescent] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [mobileControls, setMobileControls] = useState(false);
  const phase = useSceneStore((state) => state.phase);
  const progress = useSceneStore((state) => state.progress);
  const inputLocked = useSceneStore((state) => state.inputLocked);
  const yaw = useRef(0);
  const pitch = useRef(-0.04);
  const target = useRef<THREE.Vector3 | null>(null);
  const avatar = useRef<THREE.Group | null>(null);

  const openOrb = useCallback(() => {
    if (!useSceneStore.getState().inputLocked && !groundDescent) onOrbOpen();
  }, [groundDescent, onOrbOpen]);
  const startGroundDescent = useCallback(() => {
    if (useSceneStore.getState().inputLocked || groundDescent) return;
    target.current = null;
    setOrbState("transition");
    setTransitionSequence("ground:opening");
    setGroundDescent(true);
  }, [groundDescent]);
  const finishGroundDescent = useCallback(() => {
    setTransitionSequence("ground:closing");
    requestUraiWorldTravel({ destination: "infrastructure-hub", href: "/ground/", entryPortal: "home-ground", cameraCheckpoint: "home-ground-descent" });
  }, []);
  const startLifeMapAscent = useCallback(() => {
    const store = useSceneStore.getState();
    if (store.inputLocked || groundDescent || store.phase === "ASCENT") return;
    target.current = null;
    setOrbState("transition");
    setTransitionSequence("life-map:opening");
    store.enterLifeMap();
  }, [groundDescent]);
  const interaction = useCallback(() => {
    if (useSceneStore.getState().inputLocked || groundDescent) return;
    if (nearby === "orb") openOrb();
    if (nearby === "ground") startGroundDescent();
    if (nearby === "life-map") startLifeMapAscent();
  }, [groundDescent, nearby, openOrb, startGroundDescent, startLifeMapAscent]);
  const reset = useCallback(() => {
    if (groundDescent) return;
    yaw.current = 0;
    pitch.current = -0.04;
    target.current = SPAWN.clone();
    setTransitionSequence("idle");
  }, [groundDescent]);
  const input = useMovementInput({ enabled: !groundDescent, onInteract: interaction, onReset: reset });
  const look = useDragLook({ yaw, pitch, enabled: !groundDescent && phase !== "ASCENT", sensitivity: 0.0031, minPitch: -0.55, maxPitch: 0.68, onDragState: setDragging });

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    setReviewFixture(query.get("homePrivateFixture") === "1" ? "safe-private" : "none");
    const requestedState = query.get("homeOrbState");
    if (requestedState && requestedState in ORB_CLIPS) setOrbState(requestedState as OrbState);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mobile = window.matchMedia("(pointer: coarse), (max-width: 700px)");
    const apply = () => {
      setReducedMotion(reduced.matches);
      setMobileControls(mobile.matches);
    };
    apply();
    reduced.addEventListener?.("change", apply);
    mobile.addEventListener?.("change", apply);
    return () => {
      reduced.removeEventListener?.("change", apply);
      mobile.removeEventListener?.("change", apply);
    };
  }, []);
  useEffect(() => {
    if (phase === "ASCENT") setTransitionSequence("life-map:traversal");
  }, [phase]);
  useEffect(() => {
    if (groundDescent) setTransitionSequence("ground:traversal");
  }, [groundDescent]);
  useEffect(() => {
    const cancel = (event: KeyboardEvent) => {
      const store = useSceneStore.getState();
      if (event.key !== "Escape") return;
      if (store.phase === "ASCENT") {
        event.preventDefault();
        store.setPhase("HOME");
        store.unlock();
        setTransitionSequence("idle");
        setOrbState("idle");
        return;
      }
      if (groundDescent) {
        event.preventDefault();
        setGroundDescent(false);
        setTransitionSequence("idle");
        setOrbState("idle");
      }
    };
    window.addEventListener("keydown", cancel, true);
    return () => window.removeEventListener("keydown", cancel, true);
  }, [groundDescent]);

  if (!webglAvailable) return null;
  const ready = canvasReady && sceneReady;
  const transitioning = phase === "ASCENT" || groundDescent;
  const context = phase === "ASCENT" ? "Ascending through the sky" : groundDescent ? "Descending into Ground" : nearby === "orb" ? "The Orb is here" : nearby === "ground" ? "The path descends" : nearby === "life-map" ? "Look to the sky" : null;

  return (
    <main className={`${styles.world} urai-asset-home-world`} data-urai-home-production data-urai-true-3d="true" data-home-primary-owner="asset-driven" data-home-real-world-first="true" data-home-visible-world="authored-coherent-three-dimensional-sanctuary" data-home-world-character="believable-natural-inhabitable-environment" data-home-visible-portals="false" data-home-transition-affordances="ground-environmental-descent life-map-sky-lookout" data-home-provider-environment={HOME_PROVIDER_ENVIRONMENT} data-home-provider-role="atmospheric-support-only" data-home-provider-regions="home-atmospheric-horizon" data-home-generated-scenery="suppressed" data-home-physical-base="authored-coherent-world" data-home-visual-ownership="three-dimensional-geometry" data-home-desktop-mobile-world="same-scene" data-home-embodied-self="privacy-preserving-shadow" data-home-movement="walk-keyboard-click-touch" data-home-pointer-lock="false" data-home-audio="production-opus-consent-controlled" data-home-assets-ready={ready ? "true" : "false"} data-home-runtime-assets="home-entry-chamber-v1.glb urai-orb-avatar-v1.glb polyhaven-qwantani-dusk-1 polyhaven-jacaranda-tree polyhaven-fern-02 polyhaven-shrub-04 polyhaven-rock-moss-set-01" data-home-authored-regions="home-sanctuary-geometry home-mountain-horizon home-living-vegetation home-reflecting-water" data-home-nearby={nearby ?? "none"} data-home-camera-mode={groundDescent ? "descent" : phase === "ASCENT" ? "ascent" : dragging ? "look" : "embodied-first-person"} data-home-scene-phase={groundDescent ? "GROUND_DESCENT" : phase} data-home-ascent-progress={phase === "ASCENT" ? progress.toFixed(3) : "0.000"} data-home-input-locked={transitioning || inputLocked ? "true" : "false"} data-home-portal-sequence={transitionSequence} data-home-portal-lifecycle="environmental-approach-traversal-arrival" data-home-review-fixture={reviewFixture} data-home-orb-state={orbState} data-home-orb-clip={ORB_CLIPS[orbState]} data-home-animation-owner="provider-natural-world-plus-authored-physical-interactions" data-home-asset-provenance="polyhaven-cc0-preview" data-testid="home-visible-navigable-sanctuary-world" {...look}>
      <Canvas className={styles.canvas} dpr={[1, 1.35]} shadows camera={{ position: [0, 1.7, 8], fov: 52, near: 0.05, far: 300 }} gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }} onCreated={({ gl }) => {
        gl.outputColorSpace = THREE.SRGBColorSpace;
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.14;
        gl.shadowMap.type = THREE.PCFSoftShadowMap;
        gl.setClearColor(0x000000, 0);
        setCanvasReady(true);
      }}>
        <HomeScene input={input} yaw={yaw} pitch={pitch} target={target} avatar={avatar} onNearby={setNearby} onOrbOpen={openOrb} onGround={startGroundDescent} onGroundComplete={finishGroundDescent} onLifeMap={startLifeMapAscent} orbState={orbState} onSceneReady={() => setSceneReady(true)} groundDescent={groundDescent} reducedMotion={reducedMotion} />
      </Canvas>
      <header className={styles.brand} aria-label="URAI"><strong>URAI</strong></header>
      {context ? <div className={`${styles.worldHint} home-world-context`} data-home-world-context data-home-world-context-for={nearby ?? phase} role="status" aria-live="polite">{context}</div> : null}
      {!transitioning && mobileControls ? <MobileMovementPad input={input} label="Home movement controls" /> : null}
      <span className="sr-only" data-testid="urai-home-webgl-orb">The authored Orb companion is physically present in the Home environment.</span>
      <span className="sr-only" data-testid="urai-home-embodied-avatar">Your privacy-preserving embodied presence is represented without fabricating personal identity.</span>
      <span className="sr-only">Ground is reached by the descending natural path. Life Map is reached through the sky ascent. The Orb remains directly accessible.</span>
    </main>
  );
}

useGLTF.preload(HOME_MODEL);
useGLTF.preload(ORB_MODEL);
useGLTF.preload(JACARANDA_MODEL);
useGLTF.preload(FERN_MODEL);
useGLTF.preload(SHRUB_MODEL);
useGLTF.preload(SORREL_MODEL);
useGLTF.preload(ROCK_MODEL);
useGLTF.preload(STUMP_MODEL);
