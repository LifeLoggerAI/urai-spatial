"use client";

import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Float, Sky, Sparkles, Stars, useAnimations, useGLTF } from "@react-three/drei";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import * as THREE from "three";
import { MobileMovementPad, stepEmbodiedMotion, useDragLook, useMovementInput, type MovementInput } from "@/spatial/navigation/EmbodiedNavigation";
import { useSceneStore } from "@/spatial/store/useSceneStore";
import { requestUraiWorldOrbOpen, requestUraiWorldTravel } from "@/spatial/world/worldEvents";
import styles from "./HomeWorldProduction.module.css";

const HOME_MODEL = "/assets/urai/generated/models/home-entry-chamber-v1.glb";
const ORB_MODEL = "/assets/urai/generated/models/urai-orb-avatar-v1.glb";
const HOME_BOUNDS = { minX: -9, maxX: 9, minZ: -9, maxZ: 9 };
const SPAWN = new THREE.Vector3(0, 0, 7.2);
const ORB = new THREE.Vector3(0, 1.06, -0.72);
const GROUND_THRESHOLD = new THREE.Vector3(-5.05, 0.05, -7.4);
const LIFE_MAP_LOOKOUT = new THREE.Vector3(5.05, 0.05, -7.45);
const ASCENT_DURATION_SECONDS = 3.6;
const GROUND_DESCENT_DURATION_SECONDS = 2.8;
const HOME_MOUNTAIN_NODE_PREFIX = "horizon-mountain-";
const HOME_VEGETATION_NODE_PREFIX = "living-growth-";
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
const DISABLED_RAYCAST = () => undefined;

type OrbState = keyof typeof ORB_CLIPS;
type Nearby = "orb" | "ground" | "life-map" | "self" | null;
type TransitionSequence = "idle" | "ground:opening" | "ground:traversal" | "ground:closing" | "life-map:opening" | "life-map:traversal" | "life-map:closing";
type MaterialProfile = "home" | "orb";

const HomeOrbStateContext = createContext<OrbState>("idle");

type HomeWorldProductionProps = {
  onOrbOpen?: () => void;
  webglAvailable?: boolean;
};

type MaterialLift = {
  color: string;
  emissive: string;
  emissiveIntensity: number;
  roughness?: number;
  metalness?: number;
  opacity?: number;
  transmission?: number;
};

const MATERIAL_LIFTS: Record<string, MaterialLift> = {
  "sculpted-stone": { color: "#817e6d", emissive: "#0d110b", emissiveIntensity: 0.015, roughness: 0.96, metalness: 0 },
  "provenance-gold": { color: "#8b7958", emissive: "#24190b", emissiveIntensity: 0.04, roughness: 0.88, metalness: 0.02 },
  "celestial-glass": { color: "#8ebdc0", emissive: "#10323a", emissiveIntensity: 0.16, roughness: 0.36, metalness: 0, opacity: 0.7, transmission: 0.04 },
  "threshold-violet": { color: "#786f86", emissive: "#241d2a", emissiveIntensity: 0.1, roughness: 0.62, metalness: 0.01, opacity: 0.66, transmission: 0.02 },
  "living-organic": { color: "#527448", emissive: "#071008", emissiveIntensity: 0.01, roughness: 0.98, metalness: 0 },
  "flowing-water": { color: "#6f9da0", emissive: "#0b2b31", emissiveIntensity: 0.06, roughness: 0.18, metalness: 0, opacity: 0.58, transmission: 0.05 },
  "moon-ivory": { color: "#9e927c", emissive: "#201b13", emissiveIntensity: 0.025, roughness: 0.9, metalness: 0 },
  "ember-memory": { color: "#8d684e", emissive: "#2b170d", emissiveIntensity: 0.05, roughness: 0.86, metalness: 0 },
};

function organicTexture(low: [number, number, number], high: [number, number, number], seed: number, repeat: number) {
  const size = 96;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const wave = Math.sin((x + seed * 7) * 0.17) * 0.16 + Math.cos((y - seed * 3) * 0.13) * 0.13 + Math.sin((x + y) * 0.047 + seed) * 0.11;
      const grain = Math.sin(x * 12.9898 + y * 78.233 + seed * 37.719) * 43758.5453;
      const noise = grain - Math.floor(grain);
      const t = THREE.MathUtils.clamp(0.42 + wave + (noise - 0.5) * 0.24, 0, 1);
      const offset = (y * size + x) * 4;
      data[offset] = Math.round(THREE.MathUtils.lerp(low[0], high[0], t));
      data[offset + 1] = Math.round(THREE.MathUtils.lerp(low[1], high[1], t));
      data[offset + 2] = Math.round(THREE.MathUtils.lerp(low[2], high[2], t));
      data[offset + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

function reliefTexture(seed: number, repeat: number) {
  const size = 96;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const wave = Math.sin((x + seed) * 0.19) * 0.18 + Math.cos((y - seed) * 0.16) * 0.15 + Math.sin((x + y) * 0.061) * 0.12;
      const grain = Math.sin(x * 17.171 + y * 43.117 + seed * 11.31) * 17341.317;
      const noise = grain - Math.floor(grain);
      const value = Math.round(THREE.MathUtils.clamp(0.52 + wave + (noise - 0.5) * 0.22, 0, 1) * 255);
      const offset = (y * size + x) * 4;
      data[offset] = value;
      data[offset + 1] = value;
      data[offset + 2] = value;
      data[offset + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

function presenceShadowTexture() {
  const size = 128;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const nx = (x / (size - 1) - 0.5) * 2;
      const ny = (y / (size - 1) - 0.5) * 2;
      const head = Math.exp(-((nx / 0.22) ** 2 + ((ny + 0.58) / 0.2) ** 2) * 2.5);
      const torso = Math.exp(-((nx / 0.36) ** 2 + ((ny + 0.1) / 0.58) ** 2) * 2.2);
      const leftLeg = Math.exp(-(((nx + 0.18) / 0.17) ** 2 + ((ny - 0.58) / 0.5) ** 2) * 2.4);
      const rightLeg = Math.exp(-(((nx - 0.18) / 0.17) ** 2 + ((ny - 0.58) / 0.5) ** 2) * 2.4);
      const alpha = Math.round(THREE.MathUtils.clamp(Math.max(head, torso, leftLeg, rightLeg) * 0.72, 0, 1) * 255);
      const offset = (y * size + x) * 4;
      data[offset] = 12;
      data[offset + 1] = 14;
      data[offset + 2] = 13;
      data[offset + 3] = alpha;
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

const TERRAIN_TEXTURE = organicTexture([58, 67, 43], [111, 126, 71], 3, 9);
const TERRAIN_RELIEF = reliefTexture(7, 12);
const ROCK_TEXTURE = organicTexture([80, 82, 74], [137, 137, 119], 13, 6);
const ROCK_RELIEF = reliefTexture(17, 8);
const LEAF_TEXTURE = organicTexture([35, 67, 35], [91, 126, 63], 23, 5);
const LEAF_RELIEF = reliefTexture(29, 5);
const BARK_TEXTURE = organicTexture([65, 46, 30], [119, 83, 51], 31, 7);
const BARK_RELIEF = reliefTexture(37, 9);
const PRESENCE_SHADOW_TEXTURE = presenceShadowTexture();

function makeHomeMaterialSolid(material: THREE.MeshStandardMaterial) {
  material.opacity = 1;
  material.transparent = false;
  material.depthWrite = true;
  if (material instanceof THREE.MeshPhysicalMaterial) material.transmission = 0;
}

function applyHomeObjectCharacter(material: THREE.MeshStandardMaterial, objectName: string) {
  material.metalnessMap = null;
  material.roughnessMap = null;
  material.normalMap = null;

  if (objectName.includes("sanctuary-terrain")) {
    makeHomeMaterialSolid(material);
    material.color.set("#ffffff");
    material.map = TERRAIN_TEXTURE;
    material.bumpMap = TERRAIN_RELIEF;
    material.bumpScale = 0.16;
    material.emissive.set("#030703");
    material.emissiveIntensity = 0.01;
    material.roughness = 0.98;
    material.metalness = 0;
    return;
  }

  if (objectName.startsWith("mountain-ridge") || objectName.startsWith("horizon-mountain")) {
    makeHomeMaterialSolid(material);
    material.color.set("#ffffff");
    material.map = ROCK_TEXTURE;
    material.bumpMap = ROCK_RELIEF;
    material.bumpScale = 0.28;
    material.emissive.set("#050705");
    material.emissiveIntensity = 0.008;
    material.roughness = 1;
    material.metalness = 0;
    return;
  }

  if (objectName.includes("living-growth-trunk")) {
    makeHomeMaterialSolid(material);
    material.color.set("#ffffff");
    material.map = BARK_TEXTURE;
    material.bumpMap = BARK_RELIEF;
    material.bumpScale = 0.12;
    material.emissive.set("#050301");
    material.emissiveIntensity = 0.006;
    material.roughness = 1;
    material.metalness = 0;
    return;
  }

  if (objectName.startsWith("living-growth") || objectName.includes("vegetation")) {
    makeHomeMaterialSolid(material);
    material.color.set("#ffffff");
    material.map = LEAF_TEXTURE;
    material.bumpMap = LEAF_RELIEF;
    material.bumpScale = 0.08;
    material.emissive.set("#020602");
    material.emissiveIntensity = 0.008;
    material.roughness = 0.97;
    material.metalness = 0;
    return;
  }

  if (objectName.startsWith("sanctuary-waterfall") || objectName.includes("mirror-basin-water")) {
    material.color.set("#739da0");
    material.map = null;
    material.bumpMap = null;
    material.emissive.set("#0b2529");
    material.emissiveIntensity = 0.045;
    material.opacity = 0.48;
    material.transparent = true;
    material.depthWrite = false;
    if (material instanceof THREE.MeshPhysicalMaterial) material.transmission = 0.04;
    material.roughness = 0.2;
    material.metalness = 0;
    return;
  }

  if (objectName.includes("orb-sanctuary-pedestal")) {
    makeHomeMaterialSolid(material);
    material.color.set("#777466");
    material.map = ROCK_TEXTURE;
    material.bumpMap = ROCK_RELIEF;
    material.bumpScale = 0.16;
    material.roughness = 0.98;
    material.metalness = 0;
  }
}

function liftMaterial(material: THREE.Material, objectName: string, profile: MaterialProfile) {
  const clone = material.clone();
  if (!(clone instanceof THREE.MeshStandardMaterial)) return clone;
  const lift = MATERIAL_LIFTS[clone.name];
  if (lift) {
    clone.color.set(lift.color);
    clone.emissive.set(lift.emissive);
    clone.emissiveIntensity = lift.emissiveIntensity;
    clone.emissiveMap = null;
    if (lift.roughness !== undefined) clone.roughness = lift.roughness;
    if (lift.metalness !== undefined) clone.metalness = lift.metalness;
    if (lift.opacity !== undefined) {
      clone.opacity = lift.opacity;
      clone.transparent = lift.opacity < 1;
    }
    if (clone instanceof THREE.MeshPhysicalMaterial && lift.transmission !== undefined) clone.transmission = lift.transmission;
  }
  if (profile === "home") applyHomeObjectCharacter(clone, objectName);
  if (clone.transparent) {
    clone.side = THREE.DoubleSide;
    clone.depthWrite = profile !== "home" && clone.opacity >= 0.72;
  }
  clone.needsUpdate = true;
  return clone;
}

function nameVariation(name: string) {
  let hash = 2166136261;
  for (let index = 0; index < name.length; index += 1) {
    hash ^= name.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0) / 4294967295;
}

function indexedName(name: string, prefix: string) {
  const match = name.match(new RegExp(`^${prefix}(\\d+)$`));
  return match ? Number.parseInt(match[1], 10) : null;
}

function prepareModel(source: THREE.Object3D, profile: MaterialProfile) {
  source.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.material = Array.isArray(object.material)
      ? object.material.map((material) => liftMaterial(material, object.name, profile))
      : liftMaterial(object.material, object.name, profile);
    const homeShadowCaster = profile === "home"
      && !object.name.startsWith("horizon-mountain")
      && !object.name.startsWith("sanctuary-waterfall")
      && !object.name.includes("water");
    object.castShadow = profile === "orb" || homeShadowCaster;
    object.receiveShadow = profile === "home";
    object.frustumCulled = false;
  });
  return source;
}

function bindHomeAuthoredRegions(source: THREE.Object3D) {
  const mountainNodes: THREE.Object3D[] = [];
  const vegetationNodes: THREE.Object3D[] = [];
  source.traverse((object) => {
    if (object.name.startsWith(HOME_MOUNTAIN_NODE_PREFIX)) mountainNodes.push(object);
    if (object.name.startsWith(HOME_VEGETATION_NODE_PREFIX)) vegetationNodes.push(object);
  });
  if (!mountainNodes.length) throw new Error("Authored Home is missing horizon-mountain-* nodes for the natural horizon.");
  if (!vegetationNodes.length) throw new Error("Authored Home is missing living-growth-* nodes for the natural vegetation field.");
  for (const node of mountainNodes) node.userData.uraiAuthoredRegion = "home-mountain-horizon";
  for (const node of vegetationNodes) node.userData.uraiAuthoredRegion = "home-living-vegetation";
  source.userData.uraiAuthoredRegions = {
    "home-mountain-horizon": mountainNodes.map((node) => node.name),
    "home-living-vegetation": vegetationNodes.map((node) => node.name),
  };
  return source;
}

function composeNaturalSanctuary(source: THREE.Object3D) {
  source.traverse((object) => {
    if (
      object.name.startsWith("sanctuary-vault-")
      || object.name === "horizon-threshold-root"
      || object.name.startsWith("inhabited-village-")
      || object.name.startsWith("village-tower-")
      || object.name.startsWith("village-roof-")
      || object.name.startsWith("memory-place-anchor-")
      || object.name === "ground-alcove-root"
      || object.name === "life-map-alcove-root"
      || object.name === "embodied-presence-root"
      || object.name === "mirror-basin-rim"
    ) {
      object.visible = false;
      return;
    }

    const mountainIndex = indexedName(object.name, "horizon-mountain-");
    if (mountainIndex !== null) {
      const variation = nameVariation(object.name);
      object.scale.x *= 1.02 + variation * 0.42;
      object.scale.y *= 0.96 + (1 - variation) * 0.34;
      object.scale.z *= 1.08 + variation * 0.3;
      object.rotation.y += (variation - 0.5) * 0.38;
      return;
    }

    const waterfallIndex = indexedName(object.name, "sanctuary-waterfall-");
    if (waterfallIndex !== null) {
      object.visible = waterfallIndex === 2 || waterfallIndex === 5;
      if (object.visible) object.scale.multiply(new THREE.Vector3(0.52, 0.86, 0.52));
      return;
    }

    const growthIndex = indexedName(object.name, "living-growth-");
    if (growthIndex !== null) {
      const variation = nameVariation(object.name);
      object.scale.multiplyScalar(1.18 + variation * 0.72);
      object.rotation.y += variation * Math.PI * 0.44;
      return;
    }

    if (object.name === "orb-sanctuary-pedestal") object.scale.multiplyScalar(0.68);
  });
  return source;
}

function HomeEnvironment({ walkTarget, reducedMotion }: { walkTarget: MutableRefObject<THREE.Vector3 | null>; reducedMotion: boolean }) {
  const { scene, animations } = useGLTF(HOME_MODEL);
  const root = useRef<THREE.Group>(null);
  const world = useMemo(() => composeNaturalSanctuary(bindHomeAuthoredRegions(prepareModel(scene.clone(true), "home"))), [scene]);
  const { actions } = useAnimations(animations, root);

  useEffect(() => {
    if (reducedMotion) return;
    const action = actions.Home_Breathing;
    action?.reset().fadeIn(0.4).play();
    return () => { action?.fadeOut(0.25); };
  }, [actions, reducedMotion]);

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
    <group ref={root} name="home-authored-terrain" userData={{ runtimeAsset: HOME_MODEL, authoredRegions: ["home-mountain-horizon", "home-living-vegetation"] }}>
      <primitive object={world} />
      <mesh name="home-walkable-navigation-surface" userData={{ interactionRole: "walkable-surface" }} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.09, 0]} onClick={onWalk}>
        <planeGeometry args={[19, 19]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
    </group>
  );
}

function OrbSanctuary({ onOpen, reducedMotion }: { onOpen: () => void; reducedMotion: boolean }) {
  const interactive = !useSceneStore((store) => store.inputLocked);
  const state = useContext(HomeOrbStateContext);
  const { scene, animations } = useGLTF(ORB_MODEL);
  const root = useRef<THREE.Group>(null);
  const orb = useMemo(() => prepareModel(scene.clone(true), "orb"), [scene]);
  const { actions } = useAnimations(animations, root);
  const clip = ORB_CLIPS[state];

  useEffect(() => {
    if (reducedMotion) return;
    const action = actions[clip] || actions.Orb_Idle || actions.Orb_Resting;
    action?.reset().fadeIn(0.35).play();
    return () => { action?.fadeOut(0.2); };
  }, [actions, clip, reducedMotion]);

  return (
    <group ref={root} name="home-orb-sanctuary" userData={{ runtimeAsset: ORB_MODEL, semanticOwner: "urai-home-webgl-orb", clip }} position={ORB} scale={0.54} raycast={interactive ? undefined : DISABLED_RAYCAST} onClick={(event) => { event.stopPropagation(); onOpen(); }}>
      <Float speed={reducedMotion ? 0 : 0.38} rotationIntensity={reducedMotion ? 0 : 0.018} floatIntensity={reducedMotion ? 0 : 0.055}>
        <primitive object={orb} />
      </Float>
      <pointLight color="#c9eef0" intensity={3.4} distance={8} decay={2} position={[0, 1.4, 1.2]} />
      <pointLight color="#e6c18c" intensity={1.5} distance={6.5} decay={2} position={[-1.2, 0.7, 0.8]} />
    </group>
  );
}

function EmbodiedPresenceShadow({ root }: { root: MutableRefObject<THREE.Group | null> }) {
  return (
    <group ref={root} name="home-authored-embodied-self" userData={{ semanticOwner: "urai-home-embodied-avatar", representation: "privacy-preserving-ground-shadow" }} position={SPAWN} raycast={DISABLED_RAYCAST}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.115, -0.35]} renderOrder={2}>
        <planeGeometry args={[1.05, 2.25]} />
        <meshBasicMaterial map={PRESENCE_SHADOW_TEXTURE} transparent opacity={0.32} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

function GroundThresholdLandmark({ onEnter }: { onEnter: () => void }) {
  const stones = [
    [-0.72, 0.02, 0.65, 0.5],
    [0.68, 0.04, 0.2, 0.44],
    [-0.48, -0.08, -0.45, 0.6],
    [0.52, -0.16, -0.85, 0.54],
    [0.02, -0.26, -1.38, 0.72],
  ] as const;
  return (
    <group name="home-ground-environmental-threshold" position={GROUND_THRESHOLD} userData={{ destination: "ground", transition: "physical-descent" }} onClick={(event) => { event.stopPropagation(); onEnter(); }}>
      {stones.map(([x, y, z, scale], index) => (
        <mesh key={index} position={[x, y, z]} rotation={[0.14 * index, index * 0.72, -0.05 * index]} scale={[scale * 1.25, scale * 0.42, scale]} castShadow receiveShadow>
          <dodecahedronGeometry args={[1, 1]} />
          <meshStandardMaterial map={ROCK_TEXTURE} bumpMap={ROCK_RELIEF} bumpScale={0.18} color="#7e806f" roughness={1} metalness={0} />
        </mesh>
      ))}
      <pointLight position={[0, -0.55, -1.65]} color="#8da698" intensity={0.9} distance={5.5} decay={2} />
    </group>
  );
}

function LifeMapSkyLookout({ onEnter, reducedMotion }: { onEnter: () => void; reducedMotion: boolean }) {
  return (
    <group name="home-life-map-sky-lookout" position={LIFE_MAP_LOOKOUT} userData={{ destination: "life-map", transition: "sky-ascent" }} onClick={(event) => { event.stopPropagation(); onEnter(); }}>
      <mesh position={[0, 0.02, 0]} rotation={[0.02, -0.4, -0.03]} scale={[1.45, 0.3, 1.1]} castShadow receiveShadow>
        <dodecahedronGeometry args={[1, 2]} />
        <meshStandardMaterial map={ROCK_TEXTURE} bumpMap={ROCK_RELIEF} bumpScale={0.22} color="#8b8d7d" roughness={1} metalness={0} />
      </mesh>
      <Sparkles count={reducedMotion ? 5 : 12} scale={[1.1, 4.8, 1.1]} position={[0, 2.2, -0.15]} size={0.18} speed={reducedMotion ? 0 : 0.035} opacity={0.12} color="#efe3bb" />
    </group>
  );
}

function cubicPoint(target: THREE.Vector3, p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3, t: number) {
  const inverse = 1 - t;
  target.set(0, 0, 0)
    .addScaledVector(p0, inverse * inverse * inverse)
    .addScaledVector(p1, 3 * inverse * inverse * t)
    .addScaledVector(p2, 3 * inverse * t * t)
    .addScaledVector(p3, t * t * t);
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
  const ascentStartedAt = useRef<number | null>(null);
  const groundStartedAt = useRef<number | null>(null);
  const travelIssued = useRef(false);
  const groundIssued = useRef(false);
  const cameraStart = useRef(new THREE.Vector3());
  const cameraPoint = useRef(new THREE.Vector3());
  const cameraDesired = useRef(new THREE.Vector3());
  const cameraForward = useRef(new THREE.Vector3(0, 0, -1));
  const lookDesired = useRef(new THREE.Vector3());
  const upAxis = useRef(new THREE.Vector3(0, 1, 0));

  const placeHomeCamera = useCallback(() => {
    const portrait = size.height > size.width;
    cameraForward.current.set(Math.sin(yaw.current), 0, -Math.cos(yaw.current));
    cameraDesired.current.copy(position.current).add(new THREE.Vector3(0, portrait ? 1.63 : 1.68, portrait ? 0.42 : 0.32).applyAxisAngle(upAxis.current, yaw.current));
    camera.position.copy(cameraDesired.current);
    lookDesired.current.copy(position.current).addScaledVector(cameraForward.current, 7.5);
    camera.lookAt(lookDesired.current.x, 1.56 + pitch.current, lookDesired.current.z);
  }, [camera, pitch, size.height, size.width, yaw]);

  useLayoutEffect(() => { placeHomeCamera(); }, [placeHomeCamera]);

  useFrame(({ clock }, delta) => {
    const scene = useSceneStore.getState();

    if (groundDescent) {
      if (groundStartedAt.current === null) {
        groundStartedAt.current = clock.elapsedTime;
        cameraStart.current.copy(camera.position);
        velocity.current.set(0, 0, 0);
        target.current = null;
        lastNearby.current = null;
        onNearby(null);
      }
      const duration = reducedMotion ? 0.45 : GROUND_DESCENT_DURATION_SECONDS;
      const linear = THREE.MathUtils.clamp((clock.elapsedTime - groundStartedAt.current) / duration, 0, 1);
      const eased = THREE.MathUtils.smootherstep(linear, 0, 1);
      const p0 = cameraStart.current;
      const p1 = new THREE.Vector3(GROUND_THRESHOLD.x * 0.72, 1.35, GROUND_THRESHOLD.z + 1.4);
      const p2 = new THREE.Vector3(GROUND_THRESHOLD.x, 0.45, GROUND_THRESHOLD.z - 2.2);
      const p3 = new THREE.Vector3(GROUND_THRESHOLD.x * 0.68, -2.4, GROUND_THRESHOLD.z - 5.4);
      cubicPoint(cameraPoint.current, p0, p1, p2, p3, eased);
      camera.position.copy(cameraPoint.current);
      camera.lookAt(GROUND_THRESHOLD.x * 0.8, -0.55 - eased * 1.1, GROUND_THRESHOLD.z - 5.8);
      scene.setProgress(linear);
      if (linear >= 1 && !groundIssued.current) {
        groundIssued.current = true;
        onGroundComplete();
      }
      return;
    }

    if (groundStartedAt.current !== null) {
      groundStartedAt.current = null;
      groundIssued.current = false;
    }

    if (scene.phase === "ASCENT") {
      if (ascentStartedAt.current === null) {
        ascentStartedAt.current = clock.elapsedTime;
        cameraStart.current.copy(camera.position);
        velocity.current.set(0, 0, 0);
        target.current = null;
        lastNearby.current = null;
        onNearby(null);
      }
      const duration = reducedMotion ? 0.45 : ASCENT_DURATION_SECONDS;
      const linear = THREE.MathUtils.clamp((clock.elapsedTime - ascentStartedAt.current) / duration, 0, 1);
      const eased = THREE.MathUtils.smootherstep(linear, 0, 1);
      const p0 = cameraStart.current;
      const p1 = new THREE.Vector3(p0.x * 0.72, Math.max(8.5, p0.y + 7), p0.z - 4.5);
      const p2 = new THREE.Vector3(1.2, 23, -19);
      const p3 = new THREE.Vector3(0, 46, -54);
      cubicPoint(cameraPoint.current, p0, p1, p2, p3, eased);
      camera.position.copy(cameraPoint.current);
      lookDesired.current.set(0, 9 + eased * 34, -28 - eased * 46);
      camera.lookAt(lookDesired.current);
      if (avatar.current) avatar.current.visible = linear < 0.12;
      scene.setProgress(linear);
      if (linear >= 1 && !travelIssued.current) {
        travelIssued.current = true;
        requestUraiWorldTravel({ destination: "life-map", href: "/life-map/?from=home-sky", entryPortal: "home-sky", cameraCheckpoint: "home-sky-ascent-complete" });
      }
      return;
    }

    if (ascentStartedAt.current !== null) {
      ascentStartedAt.current = null;
      travelIssued.current = false;
      if (avatar.current) avatar.current.visible = true;
    }

    stepEmbodiedMotion({
      delta,
      input,
      yaw: yaw.current,
      position: position.current,
      velocity: velocity.current,
      target,
      bounds: HOME_BOUNDS,
      speed: 3.15,
      acceleration: 9.5,
      deceleration: 12,
    });
    if (target.current && position.current.distanceTo(target.current) < 0.2) target.current = null;
    if (avatar.current) {
      avatar.current.position.copy(position.current);
      avatar.current.rotation.y = yaw.current;
    }

    const portrait = size.height > size.width;
    cameraForward.current.set(Math.sin(yaw.current), 0, -Math.cos(yaw.current));
    cameraDesired.current.copy(position.current).add(new THREE.Vector3(0, portrait ? 1.63 : 1.68, portrait ? 0.42 : 0.32).applyAxisAngle(upAxis.current, yaw.current));
    camera.position.lerp(cameraDesired.current, 1 - Math.pow(0.0008, delta));
    lookDesired.current.copy(position.current).addScaledVector(cameraForward.current, 7.5);
    camera.lookAt(lookDesired.current.x, 1.56 + pitch.current, lookDesired.current.z);

    const distances: readonly [Nearby, THREE.Vector3, number][] = [
      ["orb", ORB, 1.75],
      ["ground", GROUND_THRESHOLD, 2.45],
      ["life-map", LIFE_MAP_LOOKOUT, 2.45],
    ];
    let next: Nearby = null;
    let best = Infinity;
    for (const [name, point, radius] of distances) {
      const distance = Math.hypot(position.current.x - point.x, position.current.z - point.z);
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
    const required = [
      "home-authored-terrain",
      "home-authored-embodied-self",
      "home-orb-sanctuary",
      "home-ground-environmental-threshold",
      "home-life-map-sky-lookout",
    ];
    if (!required.every((name) => scene.getObjectByName(name))) return;
    reported.current = true;
    onReady();
  });
  return null;
}

function HomeScene({ input, yaw, pitch, target, avatar, onNearby, onOrbOpen, onGround, onGroundComplete, onLifeMap, orbState, onSceneReady, groundDescent, reducedMotion }: {
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
  const progress = useSceneStore((state) => state.progress);
  const cosmic = phase === "ASCENT" && progress > 0.54;

  return (
    <>
      <color attach="background" args={[cosmic ? "#07111b" : "#b9c9bd"]} />
      {!cosmic ? <Sky distance={450000} sunPosition={[-20, 18, -46]} turbidity={3.4} rayleigh={1.75} mieCoefficient={0.0042} mieDirectionalG={0.76} /> : null}
      <Stars radius={160} depth={58} count={phase === "ASCENT" ? 920 : 14} factor={phase === "ASCENT" ? 2.1 : 0.1} saturation={0.08} fade speed={reducedMotion ? 0 : 0.08} />
      <fogExp2 attach="fog" args={[cosmic ? "#101b28" : "#bdc9b8", cosmic ? 0.0024 : 0.015]} />
      <ambientLight intensity={0.46} color="#f4ead8" />
      <hemisphereLight args={["#dce8e2", "#4e5842", 0.92]} />
      <directionalLight position={[-18, 22, 10]} intensity={2.65} color="#f1d29e" castShadow shadow-mapSize={[1536, 1536]} shadow-camera-near={0.5} shadow-camera-far={54} shadow-camera-left={-20} shadow-camera-right={20} shadow-camera-top={20} shadow-camera-bottom={-20} />
      <directionalLight position={[12, 9, -15]} intensity={0.46} color="#b9d5d5" />
      <Sparkles count={reducedMotion ? 12 : 28} scale={[20, 4.6, 24]} position={[0, 2.1, -4]} size={0.22} speed={reducedMotion ? 0 : 0.018} opacity={0.055} color="#f5e7bd" />
      <SceneReadiness onReady={onSceneReady} />
      <PlayerRig input={input} yaw={yaw} pitch={pitch} target={target} avatar={avatar} onNearby={onNearby} groundDescent={groundDescent} onGroundComplete={onGroundComplete} reducedMotion={reducedMotion} />
      <HomeEnvironment walkTarget={target} reducedMotion={reducedMotion} />
      <EmbodiedPresenceShadow root={avatar} />
      <HomeOrbStateContext.Provider value={orbState}><OrbSanctuary onOpen={onOrbOpen} reducedMotion={reducedMotion} /></HomeOrbStateContext.Provider>
      <GroundThresholdLandmark onEnter={onGround} />
      <LifeMapSkyLookout onEnter={onLifeMap} reducedMotion={reducedMotion} />
      <EffectComposer multisampling={0}>
        <Bloom intensity={0.055} luminanceThreshold={1.05} luminanceSmoothing={0.34} mipmapBlur />
        <Vignette eskil={false} offset={0.24} darkness={0.035} />
      </EffectComposer>
    </>
  );
}

export function HomeWorldProduction({ onOrbOpen = requestUraiWorldOrbOpen, webglAvailable = true }: HomeWorldProductionProps) {
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
    const scene = useSceneStore.getState();
    if (scene.inputLocked || groundDescent || scene.phase === "ASCENT") return;
    target.current = null;
    setOrbState("transition");
    setTransitionSequence("life-map:opening");
    scene.enterLifeMap();
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
  const look = useDragLook({ yaw, pitch, enabled: !groundDescent && phase !== "ASCENT", sensitivity: 0.0031, minPitch: -0.7, maxPitch: 0.78, onDragState: setDragging });

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    setReviewFixture(query.get("homePrivateFixture") === "1" ? "safe-private" : "none");
    const requestedState = query.get("homeOrbState");
    if (requestedState && requestedState in ORB_CLIPS) setOrbState(requestedState as OrbState);

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReducedMotion(media.matches);
    apply();
    media.addEventListener?.("change", apply);
    return () => media.removeEventListener?.("change", apply);
  }, []);

  useEffect(() => {
    if (phase === "ASCENT") setTransitionSequence("life-map:traversal");
  }, [phase]);

  useEffect(() => {
    if (groundDescent) setTransitionSequence("ground:traversal");
  }, [groundDescent]);

  useEffect(() => {
    const cancelTransition = (event: KeyboardEvent) => {
      const scene = useSceneStore.getState();
      if (event.key !== "Escape") return;
      if (scene.phase === "ASCENT") {
        event.preventDefault();
        event.stopImmediatePropagation();
        scene.setPhase("HOME");
        scene.unlock();
        setTransitionSequence("idle");
        setOrbState("idle");
        return;
      }
      if (groundDescent) {
        event.preventDefault();
        event.stopImmediatePropagation();
        setGroundDescent(false);
        setTransitionSequence("idle");
        setOrbState("idle");
      }
    };
    window.addEventListener("keydown", cancelTransition, true);
    return () => window.removeEventListener("keydown", cancelTransition, true);
  }, [groundDescent]);

  if (!webglAvailable) return null;
  const ready = canvasReady && sceneReady;
  const orbClip = ORB_CLIPS[orbState];
  const transitioning = phase === "ASCENT" || groundDescent;
  const context = phase === "ASCENT"
    ? "Ascending through the sky"
    : groundDescent
      ? "Descending into Ground"
      : nearby === "orb"
        ? "The Orb is here"
        : nearby === "ground"
          ? "The path descends"
          : nearby === "life-map"
            ? "Look to the sky"
            : null;

  return (
    <main
      className={`${styles.world} urai-asset-home-world`}
      data-urai-home-production
      data-urai-true-3d="true"
      data-home-primary-owner="asset-driven"
      data-home-real-world-first="true"
      data-home-visible-world="final-physical-sanctuary-memory-rooms"
      data-home-world-character="believable-natural-inhabitable-environment"
      data-home-visible-portals="false"
      data-home-transition-affordances="ground-environmental-descent life-map-sky-lookout"
      data-home-embodied-self="privacy-preserving-shadow"
      data-home-movement="walk-keyboard-click-touch"
      data-home-pointer-lock="false"
      data-home-audio="silent-fallback"
      data-home-assets-ready={ready ? "true" : "false"}
      data-home-runtime-assets="home-entry-chamber-v1.glb urai-orb-avatar-v1.glb"
      data-home-authored-regions="home-mountain-horizon home-living-vegetation"
      data-home-nearby={nearby ?? "none"}
      data-home-camera-mode={groundDescent ? "descent" : phase === "ASCENT" ? "ascent" : dragging ? "look" : "embodied-first-person"}
      data-home-scene-phase={groundDescent ? "GROUND_DESCENT" : phase}
      data-home-ascent-progress={phase === "ASCENT" ? progress.toFixed(3) : "0.000"}
      data-home-input-locked={transitioning || inputLocked ? "true" : "false"}
      data-home-portal-sequence={transitionSequence}
      data-home-portal-lifecycle="environmental-approach-traversal-arrival"
      data-home-review-fixture={reviewFixture}
      data-home-orb-state={orbState}
      data-home-orb-clip={orbClip}
      data-home-animation-owner="natural-sanctuary-plus-gltf-interactions"
      data-testid="home-visible-navigable-sanctuary-world"
      {...look}
    >
      <Canvas
        className={styles.canvas}
        dpr={[1, 1.35]}
        shadows
        camera={{ position: [0, 1.68, 7.52], fov: 57, near: 0.06, far: 220 }}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.04;
          setCanvasReady(true);
        }}
      >
        <HomeScene
          input={input}
          yaw={yaw}
          pitch={pitch}
          target={target}
          avatar={avatar}
          onNearby={setNearby}
          onOrbOpen={openOrb}
          onGround={startGroundDescent}
          onGroundComplete={finishGroundDescent}
          onLifeMap={startLifeMapAscent}
          orbState={orbState}
          onSceneReady={() => setSceneReady(true)}
          groundDescent={groundDescent}
          reducedMotion={reducedMotion}
        />
      </Canvas>
      <header className={styles.brand} aria-label="URAI"><strong>URAI</strong></header>
      {context ? <div className={styles.worldHint} role="status" aria-live="polite">{context}</div> : null}
      {!transitioning ? <MobileMovementPad input={input} label="Home movement controls" /> : null}
      <span className="sr-only" data-testid="urai-home-webgl-orb">The authored Orb companion is physically present in the Home environment.</span>
      <span className="sr-only" data-testid="urai-home-embodied-avatar">Your privacy-preserving embodied presence is represented without fabricating personal identity.</span>
      <span className="sr-only">Ground is reached by the descending natural path. Life Map is reached through the sky ascent. The Orb remains directly accessible.</span>
    </main>
  );
}

useGLTF.preload(HOME_MODEL);
useGLTF.preload(ORB_MODEL);
