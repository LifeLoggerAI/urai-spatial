"use client";

import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { ContactShadows, Float, Stars, useAnimations, useGLTF } from "@react-three/drei";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import * as THREE from "three";
import { MobileMovementPad, stepEmbodiedMotion, useDragLook, useMovementInput, type MovementInput } from "@/spatial/navigation/EmbodiedNavigation";
import { useSceneStore } from "@/spatial/store/useSceneStore";
import { requestUraiWorldOrbOpen, requestUraiWorldTravel } from "@/spatial/world/worldEvents";
import styles from "./HomeWorldProduction.module.css";

const HOME_MODEL = "/assets/urai/generated/models/home-entry-chamber-v1.glb";
const HOME_PROVIDER_ENVIRONMENT = "/assets/urai/replay/replay-memory-film-main.webp";
const ORB_MODEL = "/assets/urai/generated/models/urai-orb-avatar-v1.glb";
const HOME_BOUNDS = { minX: -9, maxX: 9, minZ: -9, maxZ: 9 };
const SPAWN = new THREE.Vector3(0, 0, 7.2);
const ORB = new THREE.Vector3(0, 0.96, -0.82);
const GROUND_THRESHOLD = new THREE.Vector3(-4.55, 0.02, -6.55);
const LIFE_MAP_LOOKOUT = new THREE.Vector3(4.55, 0.02, -6.65);
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
const DISABLED_RAYCAST = () => undefined;

type OrbState = keyof typeof ORB_CLIPS;
type Nearby = "orb" | "ground" | "life-map" | null;
type TransitionSequence = "idle" | "ground:opening" | "ground:traversal" | "ground:closing" | "life-map:opening" | "life-map:traversal" | "life-map:closing";

type HomeWorldProductionProps = {
  onOrbOpen?: () => void;
  webglAvailable?: boolean;
};

const HomeOrbStateContext = createContext<OrbState>("idle");
const HomeReducedMotionContext = createContext(false);

function organicTexture(low: [number, number, number], high: [number, number, number], seed: number, repeat: number) {
  const size = 192;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const broad = Math.sin((x + seed * 9) * 0.047) * 0.14 + Math.cos((y - seed * 5) * 0.053) * 0.12;
      const fine = Math.sin(x * 12.9898 + y * 78.233 + seed * 37.719) * 43758.5453;
      const noise = fine - Math.floor(fine);
      const t = THREE.MathUtils.clamp(0.46 + broad + (noise - 0.5) * 0.12, 0, 1);
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
  const size = 192;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const broad = Math.sin((x + seed) * 0.057) * 0.15 + Math.cos((y - seed) * 0.061) * 0.13;
      const fine = Math.sin(x * 17.171 + y * 43.117 + seed * 11.31) * 17341.317;
      const noise = fine - Math.floor(fine);
      const value = Math.round(THREE.MathUtils.clamp(0.52 + broad + (noise - 0.5) * 0.1, 0, 1) * 255);
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
      const alpha = Math.round(THREE.MathUtils.clamp(Math.max(head, torso, leftLeg, rightLeg) * 0.66, 0, 1) * 255);
      const offset = (y * size + x) * 4;
      data[offset] = 8;
      data[offset + 1] = 9;
      data[offset + 2] = 8;
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

const TERRAIN_TEXTURE = organicTexture([48, 52, 36], [101, 100, 67], 3, 7);
const TERRAIN_RELIEF = reliefTexture(7, 8);
const STONE_TEXTURE = organicTexture([83, 77, 66], [137, 126, 108], 11, 5);
const STONE_RELIEF = reliefTexture(13, 6);
const PATH_TEXTURE = organicTexture([92, 79, 61], [156, 137, 104], 17, 8);
const PATH_RELIEF = reliefTexture(19, 10);
const WOOD_TEXTURE = organicTexture([67, 45, 29], [121, 83, 48], 23, 7);
const PRESENCE_SHADOW_TEXTURE = presenceShadowTexture();

function materialForAuthoredMesh(name: string, source: THREE.Material | THREE.Material[]) {
  const inherited = Array.isArray(source) ? source[0] : source;
  const base = inherited instanceof THREE.MeshStandardMaterial ? inherited.clone() : new THREE.MeshStandardMaterial();
  const id = name.toLowerCase();
  base.metalness = 0;
  base.roughness = 0.9;
  base.transparent = false;
  base.opacity = 1;
  if (/terrain|ground|moss|earth|garden/.test(id)) {
    base.color.set("#72734f");
    base.map = TERRAIN_TEXTURE;
    base.bumpMap = TERRAIN_RELIEF;
    base.bumpScale = 0.12;
    base.roughness = 1;
  } else if (/path|step|walk|terrace/.test(id)) {
    base.color.set("#9b8665");
    base.map = PATH_TEXTURE;
    base.bumpMap = PATH_RELIEF;
    base.bumpScale = 0.08;
  } else if (/wood|beam|timber|bark/.test(id)) {
    base.color.set("#765138");
    base.map = WOOD_TEXTURE;
    base.bumpMap = TERRAIN_RELIEF;
    base.bumpScale = 0.05;
  } else if (/water|pool|stream/.test(id)) {
    base.color.set("#587d7b");
    base.roughness = 0.16;
    base.metalness = 0.08;
  } else {
    base.color.multiply(new THREE.Color("#b7aa93"));
    base.map = STONE_TEXTURE;
    base.bumpMap = STONE_RELIEF;
    base.bumpScale = 0.055;
    base.roughness = 0.94;
  }
  base.emissive.set("#090a07");
  base.emissiveIntensity = 0.004;
  base.needsUpdate = true;
  return base;
}

function preparePhysicalTerrain(source: THREE.Object3D) {
  const world = source.clone(true);
  let visibleMeshCount = 0;
  let terrainCount = 0;
  world.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const id = object.name.toLowerCase();
    const rejectedProp = /portal|ring|threshold|village|mannequin|avatar|doorway|debug|marker|label|embodied|presence|alcove|waterfall/.test(id);
    const rejectedLowPolyScenery = /mountain|tree|vegetation|living-growth|memory-place-anchor/.test(id);
    const visible = !rejectedProp && !rejectedLowPolyScenery;
    object.visible = visible;
    if (!visible) return;
    visibleMeshCount += 1;
    if (id.includes("sanctuary-terrain") || /terrain|ground/.test(id)) terrainCount += 1;
    object.material = materialForAuthoredMesh(object.name, object.material);
    object.castShadow = !/terrain|ground|water|pool/.test(id);
    object.receiveShadow = true;
    object.frustumCulled = false;
  });
  if (!terrainCount || visibleMeshCount < 3) throw new Error("Home authored 3D world is missing required physical geometry.");
  world.userData.uraiVisibleWorld = "authored-coherent-three-dimensional-sanctuary";
  world.userData.suppressedPortalProps = true;
  world.userData.suppressedLowPolyScenery = true;
  return world;
}

function prepareOrb(source: THREE.Object3D) {
  const orb = source.clone(true);
  orb.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    if (object.material instanceof THREE.MeshStandardMaterial) {
      const material = object.material.clone();
      material.roughness = Math.max(0.4, material.roughness);
      material.metalness = Math.min(0.38, material.metalness);
      material.emissiveIntensity *= 0.42;
      material.needsUpdate = true;
      object.material = material;
    }
    object.castShadow = true;
    object.receiveShadow = true;
    object.frustumCulled = false;
  });
  return orb;
}

function HomeEnvironment({ walkTarget }: { walkTarget: MutableRefObject<THREE.Vector3 | null> }) {
  const { scene } = useGLTF(HOME_MODEL);
  const world = useMemo(() => preparePhysicalTerrain(scene), [scene]);

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
    <group
      name="home-authored-terrain"
      userData={{
        runtimeAsset: HOME_MODEL,
        visualEnvironment: HOME_PROVIDER_ENVIRONMENT,
        physicalBase: "authored-coherent-world",
        providerImageRole: "atmospheric-support-only",
        suppressedGeneratedScenery: true,
        regions: ["home-mountain-horizon", "home-living-vegetation"],
      }}
    >
      <primitive object={world} />
      <mesh name="home-walkable-navigation-surface" userData={{ interactionRole: "walkable-surface" }} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.12, 0]} onClick={onWalk}>
        <planeGeometry args={[19, 19]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
      <mesh name="home-mountain-horizon" position={[0, -0.34, -15]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[14, 96]} />
        <meshStandardMaterial color="#636249" map={TERRAIN_TEXTURE} bumpMap={TERRAIN_RELIEF} bumpScale={0.1} roughness={1} />
      </mesh>
      <group name="home-living-vegetation" userData={{ role: "subtle-ground-cover-not-placeholder-trees" }}>
        {[-7.7, -5.8, -3.4, 3.2, 5.5, 7.5].map((x, index) => (
          <mesh key={x} position={[x, 0.2, -4.8 - (index % 3) * 1.4]} scale={[1.4, 0.45, 1.15]} castShadow receiveShadow>
            <sphereGeometry args={[0.72, 32, 22]} />
            <meshStandardMaterial color={index % 2 ? "#59694b" : "#687352"} map={TERRAIN_TEXTURE} bumpMap={TERRAIN_RELIEF} bumpScale={0.04} roughness={1} />
          </mesh>
        ))}
      </group>
      <mesh name="home-reflecting-water" position={[0, 0.02, -6.8]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[2.25, 96]} />
        <meshPhysicalMaterial color="#527775" roughness={0.12} metalness={0.08} clearcoat={0.75} clearcoatRoughness={0.16} transparent opacity={0.72} />
      </mesh>
    </group>
  );
}

function OrbSanctuary({ onOpen }: { onOpen: () => void }) {
  const interactive = !useSceneStore((store) => store.inputLocked);
  const state = useContext(HomeOrbStateContext);
  const reducedMotion = useContext(HomeReducedMotionContext);
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
    <group ref={root} name="home-orb-sanctuary" userData={{ runtimeAsset: ORB_MODEL, semanticOwner: "urai-home-webgl-orb", clip }} position={ORB} scale={0.19} raycast={interactive ? undefined : DISABLED_RAYCAST} onClick={(event) => { event.stopPropagation(); onOpen(); }}>
      <Float speed={reducedMotion ? 0 : 0.28} rotationIntensity={reducedMotion ? 0 : 0.01} floatIntensity={reducedMotion ? 0 : 0.026}>
        <primitive object={orb} />
      </Float>
      <pointLight color="#d9e8e4" intensity={0.58} distance={3.1} decay={2} position={[0, 1.05, 0.55]} />
      <pointLight color="#deb985" intensity={0.22} distance={2.8} decay={2} position={[-0.7, 0.3, 0.4]} />
    </group>
  );
}

function EmbodiedPresenceShadow({ root }: { root: MutableRefObject<THREE.Group | null> }) {
  return (
    <group ref={root} name="home-authored-embodied-self" userData={{ semanticOwner: "urai-home-embodied-avatar", representation: "privacy-preserving-ground-shadow" }} position={SPAWN} raycast={DISABLED_RAYCAST}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.125, -0.32]} renderOrder={2}>
        <planeGeometry args={[0.92, 2.05]} />
        <meshBasicMaterial map={PRESENCE_SHADOW_TEXTURE} transparent opacity={0.28} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

function GroundThresholdLandmark({ onEnter }: { onEnter: () => void }) {
  return (
    <group name="home-ground-environmental-threshold" position={GROUND_THRESHOLD} userData={{ destination: "ground", transition: "physical-descent", visiblePortal: false }}>
      <mesh position={[0, 0.5, 0]} onClick={(event) => { event.stopPropagation(); onEnter(); }}>
        <boxGeometry args={[3.1, 1.4, 3.4]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
      <pointLight position={[0, 0.08, -0.6]} color="#c2a879" intensity={0.12} distance={3.1} decay={2} />
    </group>
  );
}

function LifeMapSkyLookout({ onEnter }: { onEnter: () => void }) {
  return (
    <group name="home-life-map-sky-lookout" position={LIFE_MAP_LOOKOUT} userData={{ destination: "life-map", transition: "sky-ascent", visiblePortal: false }}>
      <mesh position={[0, 0.65, 0]} onClick={(event) => { event.stopPropagation(); onEnter(); }}>
        <boxGeometry args={[3.1, 1.7, 3.4]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
      <pointLight position={[0, 1.1, -0.35]} color="#d5dfcf" intensity={0.1} distance={3} decay={2} />
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
    cameraDesired.current.copy(position.current).add(new THREE.Vector3(0, portrait ? 1.58 : 1.66, portrait ? 0.32 : 0.26).applyAxisAngle(upAxis.current, yaw.current));
    camera.position.copy(cameraDesired.current);
    lookDesired.current.copy(position.current).addScaledVector(cameraForward.current, portrait ? 6.2 : 7.5);
    camera.lookAt(lookDesired.current.x, 1.44 + pitch.current, lookDesired.current.z);
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
      cubicPoint(
        cameraPoint.current,
        cameraStart.current,
        new THREE.Vector3(GROUND_THRESHOLD.x * 0.7, 1.25, GROUND_THRESHOLD.z + 1.4),
        new THREE.Vector3(GROUND_THRESHOLD.x, 0.3, GROUND_THRESHOLD.z - 2),
        new THREE.Vector3(GROUND_THRESHOLD.x * 0.7, -2.5, GROUND_THRESHOLD.z - 5.3),
        eased,
      );
      camera.position.copy(cameraPoint.current);
      camera.lookAt(GROUND_THRESHOLD.x * 0.82, -0.5 - eased, GROUND_THRESHOLD.z - 5.4);
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
      cubicPoint(
        cameraPoint.current,
        cameraStart.current,
        new THREE.Vector3(cameraStart.current.x * 0.72, Math.max(8.5, cameraStart.current.y + 7), cameraStart.current.z - 4.5),
        new THREE.Vector3(1.2, 23, -19),
        new THREE.Vector3(0, 46, -54),
        eased,
      );
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
      speed: 3.05,
      acceleration: 9,
      deceleration: 12,
    });
    if (target.current && position.current.distanceTo(target.current) < 0.2) target.current = null;
    if (avatar.current) {
      avatar.current.position.copy(position.current);
      avatar.current.rotation.y = yaw.current;
    }

    const portrait = size.height > size.width;
    cameraForward.current.set(Math.sin(yaw.current), 0, -Math.cos(yaw.current));
    cameraDesired.current.copy(position.current).add(new THREE.Vector3(0, portrait ? 1.58 : 1.66, portrait ? 0.32 : 0.26).applyAxisAngle(upAxis.current, yaw.current));
    camera.position.lerp(cameraDesired.current, 1 - Math.pow(0.0008, delta));
    lookDesired.current.copy(position.current).addScaledVector(cameraForward.current, portrait ? 6.2 : 7.5);
    camera.lookAt(lookDesired.current.x, 1.44 + pitch.current, lookDesired.current.z);

    const distances: readonly [Nearby, THREE.Vector3, number][] = [
      ["orb", ORB, 1.55],
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
    const required = ["home-authored-terrain", "home-authored-embodied-self", "home-orb-sanctuary", "home-ground-environmental-threshold", "home-life-map-sky-lookout", "home-mountain-horizon", "home-living-vegetation"];
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
  const cosmic = phase === "ASCENT";

  return (
    <>
      {cosmic ? <color attach="background" args={["#07111b"]} /> : null}
      {cosmic ? <Stars radius={160} depth={58} count={920} factor={2.1} saturation={0.08} fade speed={reducedMotion ? 0 : 0.08} /> : null}
      {cosmic ? <fogExp2 attach="fog" args={["#101b28", 0.0024]} /> : <fogExp2 attach="fog" args={["#8b8975", 0.017]} />}
      <ambientLight intensity={0.62} color="#eee6d4" />
      <hemisphereLight args={["#e1d5bd", "#37372c", 0.96]} />
      <directionalLight position={[-12, 18, 7]} intensity={2.0} color="#e7c483" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-near={0.5} shadow-camera-far={48} shadow-camera-left={-18} shadow-camera-right={18} shadow-camera-top={18} shadow-camera-bottom={-18} />
      <directionalLight position={[8, 9, -12]} intensity={0.3} color="#c4ded8" />
      <SceneReadiness onReady={onSceneReady} />
      <PlayerRig input={input} yaw={yaw} pitch={pitch} target={target} avatar={avatar} onNearby={onNearby} groundDescent={groundDescent} onGroundComplete={onGroundComplete} reducedMotion={reducedMotion} />
      <HomeEnvironment walkTarget={target} />
      <EmbodiedPresenceShadow root={avatar} />
      <HomeReducedMotionContext.Provider value={reducedMotion}>
        <HomeOrbStateContext.Provider value={orbState}><OrbSanctuary onOpen={onOrbOpen} /></HomeOrbStateContext.Provider>
      </HomeReducedMotionContext.Provider>
      <GroundThresholdLandmark onEnter={onGround} />
      <LifeMapSkyLookout onEnter={onLifeMap} />
      {!cosmic ? <ContactShadows position={[0, 0.04, -1]} opacity={0.24} scale={22} blur={2.6} far={8} resolution={512} frames={reducedMotion ? 1 : Infinity} /> : null}
      <EffectComposer multisampling={0}>
        <Bloom intensity={0.018} luminanceThreshold={1.2} luminanceSmoothing={0.25} mipmapBlur />
        <Vignette eskil={false} offset={0.24} darkness={0.012} />
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
  const pitch = useRef(-0.08);
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
    pitch.current = -0.08;
    target.current = SPAWN.clone();
    setTransitionSequence("idle");
  }, [groundDescent]);

  const input = useMovementInput({ enabled: !groundDescent, onInteract: interaction, onReset: reset });
  const look = useDragLook({ yaw, pitch, enabled: !groundDescent && phase !== "ASCENT", sensitivity: 0.0031, minPitch: -0.65, maxPitch: 0.68, onDragState: setDragging });

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
      data-home-visible-world="authored-coherent-three-dimensional-sanctuary"
      data-home-world-character="believable-natural-inhabitable-environment"
      data-home-visible-portals="false"
      data-home-transition-affordances="ground-environmental-descent life-map-sky-lookout"
      data-home-provider-environment={HOME_PROVIDER_ENVIRONMENT}
      data-home-provider-role="atmospheric-support-only"
      data-home-provider-regions="home-atmospheric-horizon"
      data-home-generated-scenery="suppressed"
      data-home-physical-base="authored-coherent-world"
      data-home-visual-ownership="three-dimensional-geometry"
      data-home-desktop-mobile-world="same-scene"
      data-home-embodied-self="privacy-preserving-shadow"
      data-home-movement="walk-keyboard-click-touch"
      data-home-pointer-lock="false"
      data-home-audio="silent-fallback"
      data-home-assets-ready={ready ? "true" : "false"}
      data-home-runtime-assets="home-entry-chamber-v1.glb urai-orb-avatar-v1.glb replay-memory-film-main.webp"
      data-home-authored-regions="home-sanctuary-geometry home-mountain-horizon home-living-vegetation home-reflecting-water"
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
      data-home-animation-owner="provider-natural-world-plus-authored-physical-interactions"
      data-testid="home-visible-navigable-sanctuary-world"
      {...look}
    >
      <Canvas
        className={styles.canvas}
        dpr={[1, 1.35]}
        shadows
        camera={{ position: [0, 1.66, 7.46], fov: 56, near: 0.06, far: 220 }}
        gl={{ antialias: true, alpha: true, premultipliedAlpha: false, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.08;
          gl.setClearColor(0x000000, 0);
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
