"use client";

import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { ContactShadows, Float, RoundedBox, Sky, Stars, useAnimations, useGLTF } from "@react-three/drei";
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import * as THREE from "three";
import { MobileMovementPad, stepEmbodiedMotion, useDragLook, useMovementInput, type MovementInput } from "@/spatial/navigation/EmbodiedNavigation";
import { useSceneStore } from "@/spatial/store/useSceneStore";
import { requestUraiWorldOrbOpen, requestUraiWorldTravel } from "@/spatial/world/worldEvents";
import styles from "./HomeWorldProduction.module.css";

const HOME_MODEL = "/assets/urai/generated/models/home-entry-chamber-v1.glb";
const HOME_PROVIDER_ENVIRONMENT = "/assets/urai/replay/replay-memory-film-main.webp";
const ORB_MODEL = "/assets/urai/generated/models/urai-orb-avatar-v1.glb";
const HOME_BOUNDS = { minX: -9.5, maxX: 9.5, minZ: -9.5, maxZ: 8 };
const SPAWN = new THREE.Vector3(0, 0, 5.9);
const ORB = new THREE.Vector3(0, 1.18, -1.85);
const GROUND_THRESHOLD = new THREE.Vector3(-4.9, 0, -7.2);
const LIFE_MAP_LOOKOUT = new THREE.Vector3(4.9, 0, -7.2);
const ASCENT_DURATION_SECONDS = 3.6;
const GROUND_DESCENT_DURATION_SECONDS = 2.8;
const DISABLED_RAYCAST = () => undefined;
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

const OrbStateContext = createContext<OrbState>("idle");
const ReducedMotionContext = createContext(false);

const TREE_SPECS: readonly { position: Vec3; scale: number; lean: number; tone: 0 | 1 | 2 }[] = [
  { position: [-8.0, 0, 4.5], scale: 1.18, lean: -0.08, tone: 0 },
  { position: [-7.2, 0, 1.1], scale: 0.92, lean: 0.05, tone: 1 },
  { position: [-8.3, 0, -2.4], scale: 1.28, lean: -0.04, tone: 2 },
  { position: [-7.4, 0, -5.7], scale: 1.08, lean: 0.07, tone: 0 },
  { position: [-5.8, 0, -8.0], scale: 0.86, lean: -0.05, tone: 1 },
  { position: [8.1, 0, 4.1], scale: 1.12, lean: 0.06, tone: 1 },
  { position: [7.1, 0, 0.8], scale: 0.96, lean: -0.08, tone: 2 },
  { position: [8.2, 0, -2.7], scale: 1.24, lean: 0.04, tone: 0 },
  { position: [7.3, 0, -5.8], scale: 1.02, lean: -0.05, tone: 2 },
  { position: [5.9, 0, -8.2], scale: 0.84, lean: 0.08, tone: 1 },
];

const BOULDER_SPECS: readonly { position: Vec3; scale: Vec3; rotation: Vec3 }[] = [
  { position: [-5.8, 0.18, 4.9], scale: [1.2, 0.55, 0.85], rotation: [0.08, 0.7, -0.06] },
  { position: [-5.4, 0.10, 2.2], scale: [0.75, 0.42, 0.62], rotation: [-0.04, -0.3, 0.08] },
  { position: [-6.2, 0.12, -1.1], scale: [0.86, 0.48, 0.72], rotation: [0.06, 1.1, 0.02] },
  { position: [5.7, 0.16, 4.6], scale: [1.05, 0.50, 0.82], rotation: [-0.03, 0.35, -0.04] },
  { position: [6.2, 0.10, 1.7], scale: [0.72, 0.38, 0.58], rotation: [0.05, -0.8, 0.06] },
  { position: [5.8, 0.13, -1.8], scale: [0.94, 0.46, 0.76], rotation: [-0.05, 0.95, -0.02] },
  { position: [-2.9, 0.04, -5.7], scale: [0.55, 0.28, 0.46], rotation: [0.03, 0.5, 0.05] },
  { position: [2.7, 0.05, -6.2], scale: [0.62, 0.30, 0.50], rotation: [-0.02, -0.55, 0.04] },
];

const PATH_STONES: readonly { position: Vec3; scale: Vec3; rotation: number }[] = Array.from({ length: 13 }, (_, index) => {
  const t = index / 12;
  return {
    position: [Math.sin(t * Math.PI * 1.7) * 0.24, -0.01 + Math.sin(t * Math.PI) * 0.025, 4.8 - t * 6.0] as Vec3,
    scale: [0.68 + (index % 3) * 0.08, 0.10, 0.48 + ((index + 1) % 3) * 0.05] as Vec3,
    rotation: (index % 2 ? 1 : -1) * (0.04 + (index % 4) * 0.015),
  };
});

function makeTerrainGeometry() {
  const geometry = new THREE.PlaneGeometry(38, 38, 150, 150);
  geometry.rotateX(-Math.PI / 2);
  const position = geometry.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i);
    const z = position.getZ(i);
    const distance = Math.hypot(x * 0.48, z * 0.44);
    const broad = Math.sin(x * 0.17) * 0.11 + Math.cos(z * 0.14) * 0.10 + Math.sin((x + z) * 0.09) * 0.06;
    const micro = Math.sin(x * 0.63 + z * 0.31) * 0.025 + Math.cos(z * 0.52 - x * 0.23) * 0.02;
    const basin = -Math.exp(-((x / 5.7) ** 2 + ((z + 4.7) / 4.9) ** 2)) * 0.28;
    const path = -Math.exp(-((x / 1.5) ** 2)) * Math.exp(-(((z - 1.2) / 7.6) ** 2)) * 0.08;
    const shoulder = Math.max(0, distance - 7.8) * 0.028;
    position.setY(i, broad + micro + basin + path + shoulder - 0.12);
  }
  geometry.computeVertexNormals();
  return geometry;
}

function makeTerrainTexture() {
  const size = 384;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = (y * size + x) * 4;
      const low = Math.sin(x * 0.043) * 0.5 + Math.cos(y * 0.051) * 0.5;
      const grain = Math.sin(x * 0.19 + y * 0.11) * 0.45 + Math.cos(y * 0.23 - x * 0.07) * 0.35;
      const n = THREE.MathUtils.clamp(low * 0.55 + grain * 0.45, -1, 1);
      data[index] = Math.round(82 + n * 13);
      data[index + 1] = Math.round(94 + n * 18);
      data[index + 2] = Math.round(67 + n * 11);
      data[index + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(8, 8);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

const TERRAIN_GEOMETRY = makeTerrainGeometry();
const TERRAIN_TEXTURE = makeTerrainTexture();

function tuneMaterial(name: string, source: THREE.Material | THREE.Material[]) {
  const inherited = Array.isArray(source) ? source[0] : source;
  const material = inherited instanceof THREE.MeshStandardMaterial ? inherited.clone() : new THREE.MeshStandardMaterial();
  const id = name.toLowerCase();
  material.metalness = /bronze|rim/.test(id) ? 0.08 : 0;
  material.roughness = /water|pool|stream/.test(id) ? 0.2 : /bronze|rim/.test(id) ? 0.62 : 0.9;
  material.transparent = false;
  material.opacity = 1;
  if (/path|step|terrace/.test(id)) material.color.set("#968b74");
  else if (/basin|pedestal|stone/.test(id)) material.color.set("#756f63");
  else if (/water|pool|stream/.test(id)) material.color.set("#5b8581");
  else if (/terrain|ground|moss|garden/.test(id)) material.color.set("#66745b");
  else if (/wood|beam|timber/.test(id)) material.color.set("#705740");
  else material.color.set("#827b6e");
  material.emissive.set("#090b08");
  material.emissiveIntensity = /heart/.test(id) ? 0.08 : 0.004;
  material.needsUpdate = true;
  return material;
}

function prepareAuthoredSanctuary(source: THREE.Object3D) {
  const world = source.clone(true);
  let visibleMeshCount = 0;
  world.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const id = object.name.toLowerCase();
    const rejected = /portal|ring|threshold|village|mannequin|avatar|debug|marker|label|embodied|presence|memory-place-anchor|living-growth/.test(id);
    object.visible = !rejected;
    if (object.visible && /mountain|ridge|vault|monolith|bridge|grove|firefly|sanctuary-terrain|sanctuary-inner-earth|sanctuary-foreground-landing|alcove|veil/.test(id)) object.visible = false;
    if (!object.visible) return;
    visibleMeshCount += 1;
    object.material = tuneMaterial(object.name, object.material);
    object.castShadow = !/terrain|ground|water|pool/.test(id);
    object.receiveShadow = true;
    object.frustumCulled = false;
  });
  if (visibleMeshCount < 3) throw new Error("Home authored 3D world is missing required physical geometry.");

  world.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(world);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const horizontal = Math.max(size.x, size.z, 0.001);
  const scale = THREE.MathUtils.clamp(11.8 / horizontal, 0.28, 2.2);
  world.scale.setScalar(scale);
  world.position.set(-center.x * scale, -box.min.y * scale + 0.02, -3.8 - center.z * scale);
  world.rotation.y = -0.035;
  world.userData.uraiVisibleWorld = "authored-coherent-three-dimensional-sanctuary";
  world.userData.suppressedPortalProps = true;
  world.userData.suppressedForgeScenery = true;
  world.userData.centeredForHomeCamera = true;
  return world;
}

function prepareOrb(source: THREE.Object3D) {
  const orb = source.clone(true);
  orb.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    if (object.material instanceof THREE.MeshStandardMaterial) {
      const material = object.material.clone();
      material.roughness = Math.max(0.42, material.roughness);
      material.metalness = Math.min(0.22, material.metalness);
      material.emissiveIntensity = Math.max(0.055, material.emissiveIntensity * 0.34);
      material.needsUpdate = true;
      object.material = material;
    }
    object.castShadow = true;
    object.receiveShadow = true;
    object.frustumCulled = false;
  });
  return orb;
}

function NaturalTree({ position, scale, lean, tone }: { position: Vec3; scale: number; lean: number; tone: 0 | 1 | 2 }) {
  const leaf = tone === 0 ? "#4e6850" : tone === 1 ? "#596f54" : "#466058";
  const leafDark = tone === 0 ? "#3e5742" : tone === 1 ? "#465d44" : "#38504a";
  return (
    <group position={position as [number, number, number]} scale={scale} rotation={[0, lean * 2.5, lean]}>
      <mesh position={[0, 1.25, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.15, 0.26, 2.55, 14]} />
        <meshStandardMaterial color="#554332" roughness={0.96} metalness={0} />
      </mesh>
      <mesh position={[-0.18, 2.7, 0.05]} scale={[1.05, 0.82, 0.88]} castShadow receiveShadow>
        <sphereGeometry args={[1.12, 24, 18]} />
        <meshStandardMaterial color={leafDark} roughness={0.94} metalness={0} />
      </mesh>
      <mesh position={[0.58, 2.55, -0.18]} scale={[0.86, 0.72, 0.82]} castShadow receiveShadow>
        <sphereGeometry args={[0.92, 22, 16]} />
        <meshStandardMaterial color={leaf} roughness={0.92} metalness={0} />
      </mesh>
      <mesh position={[-0.58, 2.45, -0.22]} scale={[0.78, 0.66, 0.76]} castShadow receiveShadow>
        <sphereGeometry args={[0.84, 20, 15]} />
        <meshStandardMaterial color={leaf} roughness={0.93} metalness={0} />
      </mesh>
    </group>
  );
}

function NaturalVegetation() {
  return (
    <group name="home-living-vegetation" userData={{ role: "authored-runtime-natural-grove", repeatedForgeVegetation: false }}>
      {TREE_SPECS.map((tree, index) => <NaturalTree key={`tree-${index}`} {...tree} />)}
      {BOULDER_SPECS.map((rock, index) => (
        <mesh key={`boulder-${index}`} position={rock.position as [number, number, number]} scale={rock.scale as [number, number, number]} rotation={rock.rotation as [number, number, number]} castShadow receiveShadow>
          <sphereGeometry args={[1, 24, 18]} />
          <meshStandardMaterial color={index % 3 === 0 ? "#817b6d" : index % 3 === 1 ? "#6e7065" : "#777469"} roughness={0.97} metalness={0} />
        </mesh>
      ))}
    </group>
  );
}

function NaturalHorizon() {
  return (
    <group name="home-mountain-horizon" position={[0, 0, -12.5]} userData={{ role: "atmospheric-depth-boundary", form: "soft-rolling-horizon" }}>
      <mesh position={[-7.5, -2.45, -4]} scale={[9.2, 3.1, 4.4]} receiveShadow>
        <sphereGeometry args={[1, 42, 24]} />
        <meshStandardMaterial color="#60705f" roughness={1} metalness={0} />
      </mesh>
      <mesh position={[5.7, -2.65, -5.6]} scale={[8.5, 2.8, 4.2]} receiveShadow>
        <sphereGeometry args={[1, 40, 22]} />
        <meshStandardMaterial color="#697866" roughness={1} metalness={0} />
      </mesh>
      <mesh position={[0.4, -2.95, -8.4]} scale={[11.5, 2.65, 4.4]} receiveShadow>
        <sphereGeometry args={[1, 40, 22]} />
        <meshStandardMaterial color="#70806d" roughness={1} metalness={0} />
      </mesh>
    </group>
  );
}

function SanctuaryPavilion() {
  return (
    <group name="home-sanctuary-geometry" position={[0, 0, -2.1]} userData={{ role: "inhabited-natural-shelter" }}>
      <RoundedBox args={[6.8, 0.24, 3.8]} radius={0.14} smoothness={4} position={[0, 0.12, 0.15]} receiveShadow castShadow>
        <meshStandardMaterial color="#847c6d" roughness={0.9} metalness={0} />
      </RoundedBox>
      {([-2.75, 2.75] as const).flatMap((x) => ([-1.25, 1.25] as const).map((z) => (
        <mesh key={`post-${x}-${z}`} position={[x, 1.8, z]} castShadow receiveShadow>
          <cylinderGeometry args={[0.16, 0.20, 3.55, 14]} />
          <meshStandardMaterial color="#624a36" roughness={0.94} metalness={0} />
        </mesh>
      )))}
      <RoundedBox args={[6.25, 0.22, 0.30]} radius={0.11} smoothness={4} position={[0, 3.38, -1.25]} castShadow receiveShadow>
        <meshStandardMaterial color="#5c4735" roughness={0.92} metalness={0} />
      </RoundedBox>
      <RoundedBox args={[6.25, 0.22, 0.30]} radius={0.11} smoothness={4} position={[0, 3.38, 1.25]} castShadow receiveShadow>
        <meshStandardMaterial color="#5c4735" roughness={0.92} metalness={0} />
      </RoundedBox>
      <mesh position={[-1.58, 3.62, 0]} rotation={[0, 0, 0.055]} castShadow receiveShadow>
        <boxGeometry args={[3.35, 0.13, 3.35]} />
        <meshStandardMaterial color="#4d5047" roughness={0.88} metalness={0.02} />
      </mesh>
      <mesh position={[1.58, 3.62, 0]} rotation={[0, 0, -0.055]} castShadow receiveShadow>
        <boxGeometry args={[3.35, 0.13, 3.35]} />
        <meshStandardMaterial color="#4b4f46" roughness={0.88} metalness={0.02} />
      </mesh>
      <RoundedBox args={[1.9, 0.28, 0.58]} radius={0.12} smoothness={4} position={[-2.0, 0.46, 0.75]} castShadow receiveShadow>
        <meshStandardMaterial color="#79624b" roughness={0.9} metalness={0} />
      </RoundedBox>
      <mesh position={[2.15, 0.55, 0.82]} castShadow receiveShadow>
        <cylinderGeometry args={[0.45, 0.55, 0.72, 22]} />
        <meshStandardMaterial color="#70695d" roughness={0.94} metalness={0} />
      </mesh>
      <pointLight color="#ffd7a0" intensity={0.34} distance={7} decay={2} position={[-2.25, 2.55, 0.75]} />
      <pointLight color="#e8efe5" intensity={0.22} distance={6} decay={2} position={[2.35, 2.35, 0.6]} />
    </group>
  );
}

function SanctuaryPath() {
  return (
    <group name="home-natural-path-network" userData={{ role: "walkable-stone-path" }}>
      {PATH_STONES.map((stone, index) => (
        <mesh key={`path-stone-${index}`} position={stone.position as [number, number, number]} scale={stone.scale as [number, number, number]} rotation={[0, stone.rotation, 0]} receiveShadow castShadow>
          <cylinderGeometry args={[1, 1.08, 1, 28]} />
          <meshStandardMaterial color={index % 2 ? "#978c77" : "#8b826f"} roughness={0.96} metalness={0} />
        </mesh>
      ))}
      <mesh position={[-3.6, 0.01, -5.75]} rotation={[0, -0.24, 0]} scale={[2.25, 0.12, 0.65]} receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#887d69" roughness={0.97} metalness={0} />
      </mesh>
      <mesh position={[3.65, 0.05, -5.9]} rotation={[0, 0.24, 0]} scale={[2.2, 0.12, 0.65]} receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#8c8372" roughness={0.97} metalness={0} />
      </mesh>
    </group>
  );
}

function SanctuaryWorld({ walkTarget }: { walkTarget: MutableRefObject<THREE.Vector3 | null> }) {
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
      <mesh name="home-natural-terrain" geometry={TERRAIN_GEOMETRY} receiveShadow onClick={onWalk}>
        <meshStandardMaterial map={TERRAIN_TEXTURE} color="#788369" roughness={0.99} metalness={0} />
      </mesh>
      <NaturalHorizon />
      <NaturalVegetation />
      <SanctuaryPath />
      <SanctuaryPavilion />
      <primitive object={authoredWorld} />
      <mesh name="home-walkable-navigation-surface" rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.5, -0.5]} onClick={onWalk}>
        <planeGeometry args={[19, 19]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
      <mesh name="home-reflecting-water" position={[0.2, -0.14, -6.5]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[2.2, 128]} />
        <meshPhysicalMaterial color="#5f8581" roughness={0.16} metalness={0.02} clearcoat={0.7} clearcoatRoughness={0.2} transparent opacity={0.74} />
      </mesh>
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
    <group ref={root} name="home-orb-sanctuary" position={ORB} scale={0.21} userData={{ runtimeAsset: ORB_MODEL, semanticOwner: "urai-home-webgl-orb", clip }} raycast={interactive ? undefined : DISABLED_RAYCAST} onClick={(event) => { event.stopPropagation(); onOpen(); }}>
      <Float speed={reducedMotion ? 0 : 0.22} rotationIntensity={reducedMotion ? 0 : 0.006} floatIntensity={reducedMotion ? 0 : 0.016}>
        <primitive object={orb} />
      </Float>
      <pointLight color="#e4f1eb" intensity={0.82} distance={4.2} decay={2} position={[0, 0.75, 0.42]} />
      <pointLight color="#f0c58f" intensity={0.24} distance={3.4} decay={2} position={[-0.55, 0.18, 0.5]} />
    </group>
  );
}

function EmbodiedPresence({ root }: { root: MutableRefObject<THREE.Group | null> }) {
  return <group ref={root} name="home-authored-embodied-self" position={SPAWN} userData={{ semanticOwner: "urai-home-embodied-avatar", representation: "privacy-preserving-first-person-presence" }} raycast={DISABLED_RAYCAST} />;
}

function GroundThresholdLandmark({ onEnter }: { onEnter: () => void }) {
  return (
    <group name="home-ground-environmental-threshold" position={GROUND_THRESHOLD} userData={{ destination: "ground", transition: "physical-descent", visiblePortal: false }}>
      <mesh position={[0, 0.7, 0]} onClick={(event) => { event.stopPropagation(); onEnter(); }}>
        <boxGeometry args={[3.2, 2.1, 3.2]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
      <pointLight color="#d9b77e" intensity={0.22} distance={4.2} decay={2} position={[0, 0.22, -0.55]} />
    </group>
  );
}

function LifeMapSkyLookout({ onEnter }: { onEnter: () => void }) {
  return (
    <group name="home-life-map-sky-lookout" position={LIFE_MAP_LOOKOUT} userData={{ destination: "life-map", transition: "sky-ascent", visiblePortal: false }}>
      <mesh position={[0, 0.8, 0]} onClick={(event) => { event.stopPropagation(); onEnter(); }}>
        <boxGeometry args={[3.2, 2.4, 3.2]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
      <pointLight color="#d8e8df" intensity={0.18} distance={4} decay={2} position={[0, 1.25, -0.35]} />
    </group>
  );
}

function cubicPoint(target: THREE.Vector3, p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3, t: number) {
  const i = 1 - t;
  target.set(0, 0, 0).addScaledVector(p0, i * i * i).addScaledVector(p1, 3 * i * i * t).addScaledVector(p2, 3 * i * t * t).addScaledVector(p3, t * t * t);
}

function PlayerRig({ input, yaw, pitch, target, avatar, onNearby, groundDescent, onGroundComplete, reducedMotion }: {
  input: MovementInput; yaw: MutableRefObject<number>; pitch: MutableRefObject<number>; target: MutableRefObject<THREE.Vector3 | null>; avatar: MutableRefObject<THREE.Group | null>; onNearby: (value: Nearby) => void; groundDescent: boolean; onGroundComplete: () => void; reducedMotion: boolean;
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
    look.current.copy(position.current).addScaledVector(forward.current, portrait ? 5.6 : 7.0);
    camera.lookAt(look.current.x, 1.2 + pitch.current, look.current.z);
  }, [camera, pitch, size.height, size.width, yaw]);
  useLayoutEffect(() => { place(); }, [place]);

  useFrame(({ clock }, delta) => {
    const store = useSceneStore.getState();
    if (groundDescent) {
      if (groundStarted.current === null) { groundStarted.current = clock.elapsedTime; cameraStart.current.copy(camera.position); velocity.current.set(0, 0, 0); target.current = null; onNearby(null); }
      const duration = reducedMotion ? 0.45 : GROUND_DESCENT_DURATION_SECONDS;
      const linear = THREE.MathUtils.clamp((clock.elapsedTime - groundStarted.current) / duration, 0, 1);
      const eased = THREE.MathUtils.smootherstep(linear, 0, 1);
      cubicPoint(point.current, cameraStart.current, new THREE.Vector3(-3.5, 1.4, -5.5), new THREE.Vector3(-5.2, 0.35, -8.2), new THREE.Vector3(-3.5, -2.8, -12.5), eased);
      camera.position.copy(point.current); camera.lookAt(-4.8, -0.7 - eased, -12); store.setProgress(linear);
      if (linear >= 1 && !groundIssued.current) { groundIssued.current = true; onGroundComplete(); }
      return;
    }
    if (groundStarted.current !== null) { groundStarted.current = null; groundIssued.current = false; }
    if (store.phase === "ASCENT") {
      if (ascentStarted.current === null) { ascentStarted.current = clock.elapsedTime; cameraStart.current.copy(camera.position); velocity.current.set(0, 0, 0); target.current = null; onNearby(null); }
      const duration = reducedMotion ? 0.45 : ASCENT_DURATION_SECONDS;
      const linear = THREE.MathUtils.clamp((clock.elapsedTime - ascentStarted.current) / duration, 0, 1);
      const eased = THREE.MathUtils.smootherstep(linear, 0, 1);
      cubicPoint(point.current, cameraStart.current, new THREE.Vector3(3.4, 8.5, -8), new THREE.Vector3(1.2, 23, -20), new THREE.Vector3(0, 46, -54), eased);
      camera.position.copy(point.current); camera.lookAt(0, 9 + eased * 34, -28 - eased * 46); store.setProgress(linear);
      if (linear >= 1 && !issued.current) { issued.current = true; requestUraiWorldTravel({ destination: "life-map", href: "/life-map/?from=home-sky", entryPortal: "home-sky", cameraCheckpoint: "home-sky-ascent-complete" }); }
      return;
    }
    if (ascentStarted.current !== null) { ascentStarted.current = null; issued.current = false; }

    stepEmbodiedMotion({ delta, input, yaw: yaw.current, position: position.current, velocity: velocity.current, target, bounds: HOME_BOUNDS, speed: 3.1, acceleration: 9, deceleration: 12 });
    if (target.current && position.current.distanceTo(target.current) < 0.2) target.current = null;
    if (avatar.current) { avatar.current.position.copy(position.current); avatar.current.rotation.y = yaw.current; }
    const portrait = size.height > size.width;
    forward.current.set(Math.sin(yaw.current), 0, -Math.cos(yaw.current));
    desired.current.copy(position.current).add(new THREE.Vector3(0, portrait ? 1.62 : 1.7, portrait ? 0.18 : 0.12).applyAxisAngle(up.current, yaw.current));
    camera.position.lerp(desired.current, 1 - Math.pow(0.0008, delta));
    look.current.copy(position.current).addScaledVector(forward.current, portrait ? 5.6 : 7.0);
    camera.lookAt(look.current.x, 1.2 + pitch.current, look.current.z);

    const distances: readonly [Nearby, THREE.Vector3, number][] = [["orb", ORB, 2.05], ["ground", GROUND_THRESHOLD, 2.55], ["life-map", LIFE_MAP_LOOKOUT, 2.55]];
    let next: Nearby = null; let best = Infinity;
    for (const [name, p, radius] of distances) { const d = Math.hypot(position.current.x - p.x, position.current.z - p.z); if (d < radius && d < best) { next = name; best = d; } }
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
    const required = ["home-authored-terrain", "home-authored-embodied-self", "home-orb-sanctuary", "home-ground-environmental-threshold", "home-life-map-sky-lookout", "home-mountain-horizon", "home-living-vegetation"];
    if (!required.every((name) => scene.getObjectByName(name))) return;
    reported.current = true; onReady();
  });
  return null;
}

function HomeScene(props: { input: MovementInput; yaw: MutableRefObject<number>; pitch: MutableRefObject<number>; target: MutableRefObject<THREE.Vector3 | null>; avatar: MutableRefObject<THREE.Group | null>; onNearby: (value: Nearby) => void; onOrbOpen: () => void; onGround: () => void; onGroundComplete: () => void; onLifeMap: () => void; orbState: OrbState; onSceneReady: () => void; groundDescent: boolean; reducedMotion: boolean }) {
  const phase = useSceneStore((state) => state.phase);
  const cosmic = phase === "ASCENT";
  return (
    <>
      <color attach="background" args={[cosmic ? "#07111b" : "#879b93"]} />
      {cosmic ? <Stars radius={160} depth={58} count={920} factor={2.1} saturation={0.08} fade speed={props.reducedMotion ? 0 : 0.08} /> : <Sky distance={450000} sunPosition={[7, 4.5, -10]} inclination={0.46} azimuth={0.2} mieCoefficient={0.0035} mieDirectionalG={0.76} rayleigh={2.35} turbidity={5.8} />}
      {cosmic ? <fogExp2 attach="fog" args={["#101b28", 0.0024]} /> : <fogExp2 attach="fog" args={["#8fa097", 0.013]} />}
      <ambientLight intensity={0.68} color="#ece8dc" />
      <hemisphereLight args={["#d9e7e0", "#4b5148", 0.88]} />
      <directionalLight position={[-9, 17, 9]} intensity={2.15} color="#f8d6a2" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-near={0.5} shadow-camera-far={54} shadow-camera-left={-19} shadow-camera-right={19} shadow-camera-top={19} shadow-camera-bottom={-19} />
      <directionalLight position={[10, 9, -9]} intensity={0.42} color="#c7ded8" />
      <SceneReadiness onReady={props.onSceneReady} />
      <PlayerRig input={props.input} yaw={props.yaw} pitch={props.pitch} target={props.target} avatar={props.avatar} onNearby={props.onNearby} groundDescent={props.groundDescent} onGroundComplete={props.onGroundComplete} reducedMotion={props.reducedMotion} />
      <SanctuaryWorld walkTarget={props.target} />
      <EmbodiedPresence root={props.avatar} />
      <ReducedMotionContext.Provider value={props.reducedMotion}><OrbStateContext.Provider value={props.orbState}><OrbSanctuary onOpen={props.onOrbOpen} /></OrbStateContext.Provider></ReducedMotionContext.Provider>
      <GroundThresholdLandmark onEnter={props.onGround} />
      <LifeMapSkyLookout onEnter={props.onLifeMap} />
      {!cosmic ? <ContactShadows position={[0, 0.025, -2.2]} opacity={0.42} scale={24} blur={2.9} far={10} resolution={512} frames={props.reducedMotion ? 1 : Infinity} /> : null}
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
  const phase = useSceneStore((state) => state.phase);
  const progress = useSceneStore((state) => state.progress);
  const inputLocked = useSceneStore((state) => state.inputLocked);
  const yaw = useRef(0);
  const pitch = useRef(-0.14);
  const target = useRef<THREE.Vector3 | null>(null);
  const avatar = useRef<THREE.Group | null>(null);

  const openOrb = useCallback(() => { if (!useSceneStore.getState().inputLocked && !groundDescent) onOrbOpen(); }, [groundDescent, onOrbOpen]);
  const startGroundDescent = useCallback(() => { if (useSceneStore.getState().inputLocked || groundDescent) return; target.current = null; setOrbState("transition"); setTransitionSequence("ground:opening"); setGroundDescent(true); }, [groundDescent]);
  const finishGroundDescent = useCallback(() => { setTransitionSequence("ground:closing"); requestUraiWorldTravel({ destination: "infrastructure-hub", href: "/ground/", entryPortal: "home-ground", cameraCheckpoint: "home-ground-descent" }); }, []);
  const startLifeMapAscent = useCallback(() => { const store = useSceneStore.getState(); if (store.inputLocked || groundDescent || store.phase === "ASCENT") return; target.current = null; setOrbState("transition"); setTransitionSequence("life-map:opening"); store.enterLifeMap(); }, [groundDescent]);
  const interaction = useCallback(() => { if (useSceneStore.getState().inputLocked || groundDescent) return; if (nearby === "orb") openOrb(); if (nearby === "ground") startGroundDescent(); if (nearby === "life-map") startLifeMapAscent(); }, [groundDescent, nearby, openOrb, startGroundDescent, startLifeMapAscent]);
  const reset = useCallback(() => { if (groundDescent) return; yaw.current = 0; pitch.current = -0.14; target.current = SPAWN.clone(); setTransitionSequence("idle"); }, [groundDescent]);
  const input = useMovementInput({ enabled: !groundDescent, onInteract: interaction, onReset: reset });
  const look = useDragLook({ yaw, pitch, enabled: !groundDescent && phase !== "ASCENT", sensitivity: 0.0031, minPitch: -0.55, maxPitch: 0.62, onDragState: setDragging });

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    setReviewFixture(query.get("homePrivateFixture") === "1" ? "safe-private" : "none");
    const requestedState = query.get("homeOrbState"); if (requestedState && requestedState in ORB_CLIPS) setOrbState(requestedState as OrbState);
    const media = window.matchMedia("(prefers-reduced-motion: reduce)"); const apply = () => setReducedMotion(media.matches); apply(); media.addEventListener?.("change", apply); return () => media.removeEventListener?.("change", apply);
  }, []);
  useEffect(() => { if (phase === "ASCENT") setTransitionSequence("life-map:traversal"); }, [phase]);
  useEffect(() => { if (groundDescent) setTransitionSequence("ground:traversal"); }, [groundDescent]);
  useEffect(() => {
    const cancel = (event: KeyboardEvent) => { const store = useSceneStore.getState(); if (event.key !== "Escape") return; if (store.phase === "ASCENT") { event.preventDefault(); store.setPhase("HOME"); store.unlock(); setTransitionSequence("idle"); setOrbState("idle"); return; } if (groundDescent) { event.preventDefault(); setGroundDescent(false); setTransitionSequence("idle"); setOrbState("idle"); } };
    window.addEventListener("keydown", cancel, true); return () => window.removeEventListener("keydown", cancel, true);
  }, [groundDescent]);

  if (!webglAvailable) return null;
  const ready = canvasReady && sceneReady;
  const transitioning = phase === "ASCENT" || groundDescent;
  const context = phase === "ASCENT" ? "Ascending through the sky" : groundDescent ? "Descending into Ground" : nearby === "orb" ? "The Orb is here" : nearby === "ground" ? "The path descends" : nearby === "life-map" ? "Look to the sky" : null;

  return (
    <main className={`${styles.world} urai-asset-home-world`} data-urai-home-production data-urai-true-3d="true" data-home-primary-owner="asset-driven" data-home-real-world-first="true" data-home-visible-world="authored-coherent-three-dimensional-sanctuary" data-home-world-character="believable-natural-inhabitable-environment" data-home-visible-portals="false" data-home-transition-affordances="ground-environmental-descent life-map-sky-lookout" data-home-provider-environment={HOME_PROVIDER_ENVIRONMENT} data-home-provider-role="atmospheric-support-only" data-home-provider-regions="home-atmospheric-horizon" data-home-generated-scenery="suppressed" data-home-physical-base="authored-coherent-world" data-home-visual-ownership="three-dimensional-geometry" data-home-desktop-mobile-world="same-scene" data-home-embodied-self="privacy-preserving-shadow" data-home-movement="walk-keyboard-click-touch" data-home-pointer-lock="false" data-home-audio="production-opus-consent-controlled" data-home-assets-ready={ready ? "true" : "false"} data-home-runtime-assets="home-entry-chamber-v1.glb urai-orb-avatar-v1.glb replay-memory-film-main.webp" data-home-authored-regions="home-sanctuary-geometry home-mountain-horizon home-living-vegetation home-reflecting-water" data-home-nearby={nearby ?? "none"} data-home-camera-mode={groundDescent ? "descent" : phase === "ASCENT" ? "ascent" : dragging ? "look" : "embodied-first-person"} data-home-scene-phase={groundDescent ? "GROUND_DESCENT" : phase} data-home-ascent-progress={phase === "ASCENT" ? progress.toFixed(3) : "0.000"} data-home-input-locked={transitioning || inputLocked ? "true" : "false"} data-home-portal-sequence={transitionSequence} data-home-portal-lifecycle="environmental-approach-traversal-arrival" data-home-review-fixture={reviewFixture} data-home-orb-state={orbState} data-home-orb-clip={ORB_CLIPS[orbState]} data-home-animation-owner="provider-natural-world-plus-authored-physical-interactions" data-testid="home-visible-navigable-sanctuary-world" {...look}>
      <Canvas className={styles.canvas} dpr={[1, 1.4]} shadows camera={{ position: [0, 1.7, 6], fov: 56, near: 0.05, far: 240 }} gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }} onCreated={({ gl }) => { gl.outputColorSpace = THREE.SRGBColorSpace; gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.05; gl.setClearColor(0x000000, 0); setCanvasReady(true); }}>
        <HomeScene input={input} yaw={yaw} pitch={pitch} target={target} avatar={avatar} onNearby={setNearby} onOrbOpen={openOrb} onGround={startGroundDescent} onGroundComplete={finishGroundDescent} onLifeMap={startLifeMapAscent} orbState={orbState} onSceneReady={() => setSceneReady(true)} groundDescent={groundDescent} reducedMotion={reducedMotion} />
      </Canvas>
      <header className={styles.brand} aria-label="URAI"><strong>URAI</strong></header>
      {context ? <div className={`${styles.worldHint} home-world-context`} data-home-world-context data-home-world-context-for={nearby ?? phase} role="status" aria-live="polite">{context}</div> : null}
      {!transitioning ? <MobileMovementPad input={input} label="Home movement controls" /> : null}
      <span className="sr-only" data-testid="urai-home-webgl-orb">The authored Orb companion is physically present in the Home environment.</span>
      <span className="sr-only" data-testid="urai-home-embodied-avatar">Your privacy-preserving embodied presence is represented without fabricating personal identity.</span>
      <span className="sr-only">Ground is reached by the descending natural path. Life Map is reached through the sky ascent. The Orb remains directly accessible.</span>
    </main>
  );
}

useGLTF.preload(HOME_MODEL);
useGLTF.preload(ORB_MODEL);