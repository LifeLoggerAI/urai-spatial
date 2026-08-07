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
const PORTAL_MODEL = "/assets/urai/generated/models/portal-ring-master-v1.glb";
const ORB_MODEL = "/assets/urai/generated/models/urai-orb-avatar-v1.glb";
const HOME_BOUNDS = { minX: -9, maxX: 9, minZ: -9, maxZ: 9 };
const SPAWN = new THREE.Vector3(0, 0, 7.2);
const ORB = new THREE.Vector3(0, 1.06, -0.72);
const GROUND_PORTAL = new THREE.Vector3(-5.35, 0.3, -7.65);
const LIFE_MAP_PORTAL = new THREE.Vector3(5.35, 0.3, -7.75);
const ASCENT_DURATION_SECONDS = 3.4;
const HOME_MOUNTAIN_NODE_PREFIX = "horizon-mountain-";
const HOME_VILLAGE_NODE_PREFIXES = ["inhabited-village-", "village-tower-", "village-roof-"] as const;
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
type PortalDestination = "ground" | "life-map";
type PortalSequence = "idle" | `${PortalDestination}:opening` | `${PortalDestination}:traversal` | `${PortalDestination}:closing`;
type MaterialProfile = "home" | "orb" | "portal";

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
  "sculpted-stone": { color: "#a79a7d", emissive: "#20190e", emissiveIntensity: 0.05, roughness: 0.94, metalness: 0 },
  "provenance-gold": { color: "#d2aa67", emissive: "#59350d", emissiveIntensity: 0.22, roughness: 0.64, metalness: 0.06 },
  "celestial-glass": { color: "#8fc6c8", emissive: "#194957", emissiveIntensity: 0.28, roughness: 0.34, metalness: 0, opacity: 0.72, transmission: 0.04 },
  "threshold-violet": { color: "#8e73aa", emissive: "#45245f", emissiveIntensity: 0.48, roughness: 0.44, metalness: 0.01, opacity: 0.72, transmission: 0.02 },
  "living-organic": { color: "#5f8653", emissive: "#0b2410", emissiveIntensity: 0.05, roughness: 0.96, metalness: 0 },
  "flowing-water": { color: "#82c6cb", emissive: "#164d59", emissiveIntensity: 0.22, roughness: 0.14, metalness: 0, opacity: 0.62, transmission: 0.08 },
  "moon-ivory": { color: "#d3c3a1", emissive: "#46321d", emissiveIntensity: 0.1, roughness: 0.84, metalness: 0 },
  "ember-memory": { color: "#c9855e", emissive: "#692711", emissiveIntensity: 0.3, roughness: 0.66, metalness: 0 },
};

function makeHomeMaterialSolid(material: THREE.MeshStandardMaterial) {
  material.opacity = 1;
  material.transparent = false;
  material.depthWrite = true;
  if (material instanceof THREE.MeshPhysicalMaterial) material.transmission = 0;
}

function applyHomeObjectCharacter(material: THREE.MeshStandardMaterial, objectName: string) {
  material.metalnessMap = null;
  material.roughnessMap = null;
  if (material.normalMap) material.normalScale.setScalar(0.3);
  if (objectName.includes("sanctuary-terrain") || objectName.startsWith("mountain-ridge") || objectName.startsWith("horizon-mountain")) {
    makeHomeMaterialSolid(material);
    material.color.set(objectName.startsWith("horizon-mountain") ? "#6f7e65" : "#698859");
    material.emissive.set("#08170d");
    material.emissiveIntensity = 0.02;
    if (material.normalMap) material.normalScale.setScalar(0.4);
    material.roughness = 0.96;
    material.metalness = 0;
  } else if (objectName.startsWith("inhabited-village")) {
    makeHomeMaterialSolid(material);
    material.color.set("#9b7c5d");
    material.emissive.set("#42240f");
    material.emissiveIntensity = 0.1;
    material.roughness = 0.9;
    material.metalness = 0;
  } else if (objectName.startsWith("village-tower")) {
    makeHomeMaterialSolid(material);
    material.color.set("#8f7054");
    material.emissive.set("#3b210f");
    material.emissiveIntensity = 0.09;
    material.roughness = 0.92;
    material.metalness = 0;
  } else if (objectName.startsWith("village-roof")) {
    makeHomeMaterialSolid(material);
    material.color.set("#a86f4f");
    material.emissive.set("#4b2410");
    material.emissiveIntensity = 0.12;
    material.roughness = 0.86;
    material.metalness = 0;
  } else if (objectName.startsWith("living-growth") || objectName.includes("vegetation")) {
    makeHomeMaterialSolid(material);
    material.color.set("#558253");
    material.emissive.set("#071d0f");
    material.emissiveIntensity = 0.025;
    if (material.normalMap) material.normalScale.setScalar(0.38);
    material.roughness = 0.96;
    material.metalness = 0;
  } else if (objectName.startsWith("sanctuary-waterfall")) {
    material.color.set("#91d5da");
    material.emissive.set("#105766");
    material.emissiveIntensity = 0.18;
    material.opacity = 0.5;
    material.transparent = true;
    material.depthWrite = false;
    if (material instanceof THREE.MeshPhysicalMaterial) material.transmission = 0.06;
    material.roughness = 0.12;
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
    object.castShadow = homeShadowCaster;
    object.receiveShadow = profile === "home";
    object.frustumCulled = false;
  });
  return source;
}

function bindHomeAuthoredRegions(source: THREE.Object3D) {
  const mountainNodes: THREE.Object3D[] = [];
  const villageNodes: THREE.Object3D[] = [];
  source.traverse((object) => {
    if (object.name.startsWith(HOME_MOUNTAIN_NODE_PREFIX)) mountainNodes.push(object);
    if (HOME_VILLAGE_NODE_PREFIXES.some((prefix) => object.name.startsWith(prefix))) villageNodes.push(object);
  });
  if (!mountainNodes.length) throw new Error("Authored Home is missing horizon-mountain-* nodes for home-mountain-horizon.");
  if (!villageNodes.length) throw new Error("Authored Home is missing inhabited-village-*, village-tower-*, and village-roof-* nodes for home-lantern-village.");
  for (const node of mountainNodes) node.userData.uraiAuthoredRegion = "home-mountain-horizon";
  for (const node of villageNodes) node.userData.uraiAuthoredRegion = "home-lantern-village";
  source.userData.uraiAuthoredRegions = {
    "home-mountain-horizon": mountainNodes.map((node) => node.name),
    "home-lantern-village": villageNodes.map((node) => node.name),
  };
  return source;
}

function composeSanctuary(source: THREE.Object3D) {
  source.traverse((object) => {
    if (object.name.startsWith("sanctuary-vault-") || object.name === "horizon-threshold-root") {
      object.visible = false;
      return;
    }
    const mountainIndex = indexedName(object.name, "horizon-mountain-");
    if (mountainIndex !== null) {
      const variation = nameVariation(object.name);
      object.scale.x *= 0.9 + variation * 0.38;
      object.scale.y *= 0.82 + (1 - variation) * 0.22;
      object.scale.z *= 0.9 + variation * 0.28;
      object.rotation.y += (variation - 0.5) * 0.46;
      return;
    }
    const villageIndex = indexedName(object.name, "inhabited-village-");
    if (villageIndex !== null) {
      if (villageIndex % 3 !== 1) object.visible = false;
      else {
        const variation = nameVariation(object.name);
        const scale = 0.7 + variation * 0.2;
        object.scale.multiplyScalar(scale);
        object.rotation.y += (variation - 0.5) * 0.54;
      }
      return;
    }
    const towerIndex = indexedName(object.name, "village-tower-");
    if (towerIndex !== null) {
      if (towerIndex % 3 !== 1) object.visible = false;
      else object.scale.multiplyScalar(0.66 + nameVariation(object.name) * 0.18);
      return;
    }
    const roofIndex = indexedName(object.name, "village-roof-");
    if (roofIndex !== null) {
      if (roofIndex % 3 !== 1) object.visible = false;
      else object.scale.multiplyScalar(0.68 + nameVariation(object.name) * 0.16);
      return;
    }
    const waterfallIndex = indexedName(object.name, "sanctuary-waterfall-");
    if (waterfallIndex !== null) {
      if (waterfallIndex % 3 === 0) object.visible = false;
      else object.scale.multiply(new THREE.Vector3(0.46, 0.72, 0.46));
      return;
    }
    const growthIndex = indexedName(object.name, "living-growth-");
    if (growthIndex !== null) {
      if (growthIndex % 3 === 0) object.visible = false;
      else {
        const variation = nameVariation(object.name);
        object.scale.multiplyScalar(0.66 + variation * 0.32);
        object.rotation.y += variation * Math.PI * 0.58;
      }
      return;
    }
    const anchorIndex = indexedName(object.name, "memory-place-anchor-");
    if (anchorIndex !== null) object.visible = false;
  });
  return source;
}

function HomeEnvironment({ walkTarget }: { walkTarget: MutableRefObject<THREE.Vector3 | null> }) {
  const { scene, animations } = useGLTF(HOME_MODEL);
  const root = useRef<THREE.Group>(null);
  const world = useMemo(() => {
    const clone = composeSanctuary(bindHomeAuthoredRegions(prepareModel(scene.clone(true), "home")));
    for (const hiddenName of ["embodied-presence-root", "ground-alcove-root", "life-map-alcove-root"]) {
      const hidden = clone.getObjectByName(hiddenName);
      if (hidden) hidden.visible = false;
    }
    return clone;
  }, [scene]);
  const { actions } = useAnimations(animations, root);
  useEffect(() => {
    const action = actions.Home_Breathing;
    action?.reset().fadeIn(0.4).play();
    return () => { action?.fadeOut(0.25); };
  }, [actions]);
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
    <group ref={root} name="home-authored-terrain" userData={{ runtimeAsset: HOME_MODEL, authoredRegions: ["home-mountain-horizon", "home-lantern-village"] }}>
      <primitive object={world} />
      <mesh name="home-walkable-navigation-surface" userData={{ interactionRole: "walkable-surface" }} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]} onClick={onWalk}>
        <planeGeometry args={[19, 19]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
    </group>
  );
}

function OrbSanctuary({ onOpen }: { onOpen: () => void }) {
  const interactive = !useSceneStore((store) => store.inputLocked);
  const state = useContext(HomeOrbStateContext);
  const { scene, animations } = useGLTF(ORB_MODEL);
  const root = useRef<THREE.Group>(null);
  const orb = useMemo(() => prepareModel(scene.clone(true), "orb"), [scene]);
  const { actions } = useAnimations(animations, root);
  const clip = ORB_CLIPS[state];
  useEffect(() => {
    const action = actions[clip] || actions.Orb_Idle || actions.Orb_Resting;
    action?.reset().fadeIn(0.35).play();
    return () => { action?.fadeOut(0.2); };
  }, [actions, clip]);
  return (
    <group ref={root} name="home-orb-sanctuary" userData={{ runtimeAsset: ORB_MODEL, semanticOwner: "urai-home-webgl-orb", clip }} position={ORB} scale={0.72} raycast={interactive ? undefined : DISABLED_RAYCAST} onClick={(event) => { event.stopPropagation(); onOpen(); }}>
      <Float speed={0.52} rotationIntensity={0.035} floatIntensity={0.1}><primitive object={orb} /></Float>
      <pointLight color="#bfefff" intensity={7.2} distance={13} decay={2} position={[0, 2.1, 2.6]} />
      <pointLight color="#ffd09a" intensity={4.2} distance={10} decay={2} position={[-2.1, 1.7, 1.8]} />
    </group>
  );
}

function EmbodiedSelf({ root: outerRoot }: { root: MutableRefObject<THREE.Group | null> }) {
  const { scene } = useGLTF(HOME_MODEL);
  const avatar = useMemo(() => {
    const source = scene.getObjectByName("embodied-presence-root");
    if (!source) throw new Error("Authored Home is missing embodied-presence-root.");
    const clone = prepareModel(source.clone(true), "home");
    clone.traverse((object) => {
      if (/marker|pointer|chevron|rune|frame/i.test(object.name)) object.visible = false;
    });
    clone.position.set(0, 0, 0);
    clone.rotation.set(0, 0, 0);
    clone.scale.setScalar(0.23);
    clone.userData.semanticOwner = "urai-home-embodied-avatar";
    return clone;
  }, [scene]);
  return <group ref={outerRoot} name="home-authored-embodied-self" userData={{ semanticOwner: "urai-home-embodied-avatar" }} position={SPAWN}><primitive object={avatar} /></group>;
}

function WorldPortal({ type, position, onEnter }: { type: "ground" | "life-map"; position: THREE.Vector3; onEnter: () => void }) {
  const interactive = !useSceneStore((store) => store.inputLocked);
  const { scene, animations } = useGLTF(PORTAL_MODEL);
  const root = useRef<THREE.Group>(null);
  const portal = useMemo(() => prepareModel(scene.clone(true), "portal"), [scene]);
  const { actions } = useAnimations(animations, root);
  useEffect(() => {
    const action = actions.Portal_Available || actions.Portal_Closed;
    action?.reset().fadeIn(0.3).play();
    return () => { action?.fadeOut(0.2); };
  }, [actions]);
  return (
    <group ref={root} name={`home-${type}-portal-world-owned`} userData={{ runtimeAsset: PORTAL_MODEL, destination: type }} position={position} scale={type === "life-map" ? 0.22 : 0.21} raycast={interactive ? undefined : DISABLED_RAYCAST} onClick={(event) => { event.stopPropagation(); onEnter(); }}>
      <primitive object={portal} />
      <pointLight color={type === "ground" ? "#a99bca" : "#f0cc87"} intensity={2.2} distance={8.5} decay={2} position={[0, 1.8, 1.6]} />
    </group>
  );
}

function cubicPoint(target: THREE.Vector3, p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3, t: number) {
  const inverse = 1 - t;
  target.set(0, 0, 0).addScaledVector(p0, inverse * inverse * inverse).addScaledVector(p1, 3 * inverse * inverse * t).addScaledVector(p2, 3 * inverse * t * t).addScaledVector(p3, t * t * t);
}

function PlayerRig({ input, yaw, pitch, target, avatar, onNearby }: { input: MovementInput; yaw: MutableRefObject<number>; pitch: MutableRefObject<number>; target: MutableRefObject<THREE.Vector3 | null>; avatar: MutableRefObject<THREE.Group | null>; onNearby: (value: Nearby) => void }) {
  const { camera, size } = useThree();
  const position = useRef(SPAWN.clone());
  const velocity = useRef(new THREE.Vector3());
  const lastNearby = useRef<Nearby>(null);
  const ascentStartedAt = useRef<number | null>(null);
  const ascentCameraStart = useRef(new THREE.Vector3());
  const ascentLookStart = useRef(new THREE.Vector3());
  const ascentCameraPoint = useRef(new THREE.Vector3());
  const ascentLookPoint = useRef(new THREE.Vector3());
  const travelIssued = useRef(false);
  const cameraOffset = useRef(new THREE.Vector3());
  const cameraDesired = useRef(new THREE.Vector3());
  const cameraForward = useRef(new THREE.Vector3(0, 0, -1));
  const lookDesired = useRef(new THREE.Vector3());
  const upAxis = useRef(new THREE.Vector3(0, 1, 0));

  const placeHomeCamera = useCallback(() => {
    const portrait = size.height > size.width;
    cameraForward.current.set(Math.sin(yaw.current), 0, -Math.cos(yaw.current));
    camera.position.set(position.current.x, portrait ? 4.45 : 4.1, position.current.z + (portrait ? 6.9 : 6.55));
    lookDesired.current.copy(position.current).addScaledVector(cameraForward.current, portrait ? 5.0 : 5.4);
    camera.lookAt(lookDesired.current.x, 1.28 + pitch.current, lookDesired.current.z);
  }, [camera, pitch, size.height, size.width, yaw]);

  useLayoutEffect(() => { placeHomeCamera(); }, [placeHomeCamera]);

  useFrame(({ clock }, delta) => {
    const scene = useSceneStore.getState();
    if (scene.phase === "ASCENT") {
      if (ascentStartedAt.current === null) {
        ascentStartedAt.current = clock.elapsedTime;
        ascentCameraStart.current.copy(camera.position);
        ascentLookStart.current.set(position.current.x, 1.25 + pitch.current, position.current.z - 2.8);
        velocity.current.set(0, 0, 0);
        target.current = null;
        lastNearby.current = null;
        onNearby(null);
      }
      const linear = THREE.MathUtils.clamp((clock.elapsedTime - ascentStartedAt.current) / ASCENT_DURATION_SECONDS, 0, 1);
      const eased = THREE.MathUtils.smootherstep(linear, 0, 1);
      const p0 = ascentCameraStart.current;
      const p1 = new THREE.Vector3(p0.x * 0.72, Math.max(9, p0.y + 8), p0.z - 4);
      const p2 = new THREE.Vector3(1.6, 22, -16);
      const p3 = new THREE.Vector3(0, 34, -34);
      cubicPoint(ascentCameraPoint.current, p0, p1, p2, p3, eased);
      camera.position.copy(ascentCameraPoint.current);
      ascentLookPoint.current.copy(ascentLookStart.current).lerp(new THREE.Vector3(0, 12, -28), eased);
      camera.lookAt(ascentLookPoint.current);
      if (avatar.current) avatar.current.visible = linear < 0.48;
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

    stepEmbodiedMotion({ delta, input, yaw: yaw.current, position: position.current, velocity: velocity.current, target, bounds: HOME_BOUNDS, speed: 4.2, acceleration: 11, deceleration: 14 });
    if (target.current && position.current.distanceTo(target.current) < 0.2) target.current = null;
    if (avatar.current) { avatar.current.position.copy(position.current); avatar.current.rotation.y = yaw.current; }
    const portrait = size.height > size.width;
    cameraForward.current.set(Math.sin(yaw.current), 0, -Math.cos(yaw.current));
    cameraOffset.current.set(0, (portrait ? 4.45 : 4.1) + pitch.current * 0.7, portrait ? 6.9 : 6.55).applyAxisAngle(upAxis.current, yaw.current);
    cameraDesired.current.copy(position.current).add(cameraOffset.current);
    cameraDesired.current.y = Math.max(cameraDesired.current.y, 3.85);
    camera.position.lerp(cameraDesired.current, 1 - Math.pow(0.0015, delta));
    lookDesired.current.copy(position.current).addScaledVector(cameraForward.current, portrait ? 5.0 : 5.4);
    camera.lookAt(lookDesired.current.x, 1.28 + pitch.current, lookDesired.current.z);
    const distances: readonly [Nearby, THREE.Vector3, number][] = [["orb", ORB, 1.8], ["ground", GROUND_PORTAL, 2.2], ["life-map", LIFE_MAP_PORTAL, 2.2]];
    let next: Nearby = null;
    let best = Infinity;
    for (const [name, point, radius] of distances) {
      const distance = Math.hypot(position.current.x - point.x, position.current.z - point.z);
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
    const required = ["home-authored-terrain", "home-authored-embodied-self", "home-orb-sanctuary", "home-ground-portal-world-owned", "home-life-map-portal-world-owned"];
    if (!required.every((name) => scene.getObjectByName(name))) return;
    reported.current = true;
    onReady();
  });
  return null;
}

function CinematicHomeBackdrop() {
  return (
    <group name="home-authored-cinematic-horizon" raycast={DISABLED_RAYCAST}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.24, -7]} scale={[1.25, 1, 1]} receiveShadow>
        <circleGeometry args={[24, 72]} />
        <meshStandardMaterial color="#71885b" roughness={1} metalness={0} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-4.8, -0.13, -5.1]} scale={[1.45, 0.7, 1]}>
        <circleGeometry args={[4.9, 64]} />
        <meshStandardMaterial color="#82bec1" emissive="#174c50" emissiveIntensity={0.08} roughness={0.14} metalness={0} transparent opacity={0.58} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0.01, -0.72]} receiveShadow>
        <cylinderGeometry args={[2.2, 2.38, 0.18, 48]} />
        <meshStandardMaterial color="#a09579" roughness={0.96} metalness={0} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.115, -0.72]}>
        <ringGeometry args={[1.3, 1.42, 64]} />
        <meshStandardMaterial color="#d1ab69" emissive="#6a4516" emissiveIntensity={0.18} roughness={0.72} metalness={0.03} />
      </mesh>
    </group>
  );
}

function SanctuaryPathAndLanterns() {
  const lanterns: [number, number, number][] = [[-2.7, 0.52, 5.0], [2.7, 0.52, 3.4], [-2.55, 0.52, 0.8], [2.45, 0.52, -2.0], [-2.3, 0.52, -4.6], [2.2, 0.52, -6.5], [-3.65, 0.52, -7.1], [3.7, 0.52, -7.2]];
  const stones = useMemo(() => Array.from({ length: 16 }, (_, index) => {
    const z = 6.35 - index * 0.64;
    const x = Math.sin(index * 0.74) * 0.32 + Math.sin(index * 0.19) * 0.12;
    return { position: [x, 0.105, z] as [number, number, number], rotation: (index % 5 - 2) * 0.08, scale: 0.7 + (index % 4) * 0.055 };
  }), []);
  const river = useMemo(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3(-5.2, 0.13, 7.5), new THREE.Vector3(-4.0, 0.13, 4.2), new THREE.Vector3(-4.6, 0.13, 0.5),
    new THREE.Vector3(-3.6, 0.13, -3.2), new THREE.Vector3(-4.1, 0.13, -7.4), new THREE.Vector3(-2.8, 0.13, -11.2),
  ], false, "catmullrom", 0.34), []);
  return (
    <group name="home-authored-sanctuary-path-and-lanterns" raycast={DISABLED_RAYCAST}>
      {stones.map((stone, index) => (
        <mesh key={`stone-${index}`} position={stone.position} rotation={[0, stone.rotation, 0]} scale={[stone.scale, 1, 0.74 + (index % 3) * 0.07]} receiveShadow>
          <cylinderGeometry args={[0.5, 0.58, 0.075, 18]} />
          <meshStandardMaterial color={index % 3 === 0 ? "#b0a185" : "#918774"} roughness={0.98} metalness={0} />
        </mesh>
      ))}
      <mesh geometry={new THREE.TubeGeometry(river, 72, 0.36, 14, false)} scale={[1, 0.18, 1]}>
        <meshStandardMaterial color="#7fbec0" emissive="#105056" emissiveIntensity={0.12} roughness={0.16} metalness={0} transparent opacity={0.56} depthWrite={false} />
      </mesh>
      {lanterns.map((position, index) => (
        <group key={index} position={position}>
          <mesh position={[0, -0.28, 0]} castShadow><cylinderGeometry args={[0.03, 0.045, 0.55, 10]} /><meshStandardMaterial color="#554b3b" roughness={0.94} /></mesh>
          <mesh><sphereGeometry args={[0.08, 14, 10]} /><meshStandardMaterial color="#fff0bd" emissive="#ff9f48" emissiveIntensity={2.1} roughness={0.4} /></mesh>
          <pointLight color="#ffc078" intensity={1.2} distance={4.8} decay={2} />
        </group>
      ))}
    </group>
  );
}

function HomeScene({ input, yaw, pitch, target, avatar, onNearby, onOrbOpen, onGround, onLifeMap, orbState, onSceneReady }: { input: MovementInput; yaw: MutableRefObject<number>; pitch: MutableRefObject<number>; target: MutableRefObject<THREE.Vector3 | null>; avatar: MutableRefObject<THREE.Group | null>; onNearby: (value: Nearby) => void; onOrbOpen: () => void; onGround: () => void; onLifeMap: () => void; orbState: OrbState; onSceneReady: () => void; }) {
  return (
    <>
      <color attach="background" args={["#d3e0d9"]} />
      <Sky distance={450000} sunPosition={[-14, 12, -42]} turbidity={2.7} rayleigh={1.65} mieCoefficient={0.0035} mieDirectionalG={0.74} />
      <Stars radius={140} depth={46} count={8} factor={0.08} saturation={0} fade speed={0.001} />
      <fogExp2 attach="fog" args={["#c3d1c1", 0.0085]} />
      <ambientLight intensity={1.02} color="#fff2da" />
      <hemisphereLight args={["#ecf7f2", "#61704d", 1.52]} />
      <directionalLight position={[-12, 14, 10]} intensity={3.35} color="#ffd294" castShadow shadow-mapSize={[1024, 1024]} shadow-camera-near={0.5} shadow-camera-far={48} shadow-camera-left={-18} shadow-camera-right={18} shadow-camera-top={18} shadow-camera-bottom={-18} />
      <directionalLight position={[10, 11, -11]} intensity={1.2} color="#c7eef1" />
      <pointLight position={[0, 5.4, -6.8]} color="#ffc36f" intensity={2.1} distance={30} decay={2} />
      <pointLight position={[0, 3.4, -0.8]} color="#ffcf8a" intensity={1.25} distance={18} decay={2} />
      <Sparkles count={28} scale={[20, 5.5, 24]} position={[0, 2.6, -5]} size={0.38} speed={0.014} opacity={0.035} color="#fff0c6" />
      <SceneReadiness onReady={onSceneReady} />
      <PlayerRig input={input} yaw={yaw} pitch={pitch} target={target} avatar={avatar} onNearby={onNearby} />
      <CinematicHomeBackdrop />
      <HomeEnvironment walkTarget={target} />
      <SanctuaryPathAndLanterns />
      <EmbodiedSelf root={avatar} />
      <HomeOrbStateContext.Provider value={orbState}><OrbSanctuary onOpen={onOrbOpen} /></HomeOrbStateContext.Provider>
      <WorldPortal type="ground" position={GROUND_PORTAL} onEnter={onGround} />
      <WorldPortal type="life-map" position={LIFE_MAP_PORTAL} onEnter={onLifeMap} />
      <EffectComposer multisampling={0}><Bloom intensity={0.16} luminanceThreshold={0.82} luminanceSmoothing={0.28} mipmapBlur /><Vignette eskil={false} offset={0.18} darkness={0.06} /></EffectComposer>
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
  const [portalSequence, setPortalSequence] = useState<PortalSequence>("idle");
  const phase = useSceneStore((state) => state.phase);
  const progress = useSceneStore((state) => state.progress);
  const inputLocked = useSceneStore((state) => state.inputLocked);
  const yaw = useRef(0);
  const pitch = useRef(-0.08);
  const target = useRef<THREE.Vector3 | null>(null);
  const avatar = useRef<THREE.Group | null>(null);
  const portalTimers = useRef<number[]>([]);

  const clearPortalTimers = useCallback(() => {
    portalTimers.current.forEach((timer) => window.clearTimeout(timer));
    portalTimers.current = [];
  }, []);
  const beginPortalTravel = useCallback((destination: PortalDestination, travel: () => void) => {
    const scene = useSceneStore.getState();
    if (scene.inputLocked || portalTimers.current.length) return;
    clearPortalTimers();
    setOrbState("transition");
    setPortalSequence(`${destination}:opening`);
    const openingTimer = window.setTimeout(() => {
      setPortalSequence(`${destination}:traversal`);
      const traversalTimer = window.setTimeout(() => {
        setPortalSequence(`${destination}:closing`);
        const closingTimer = window.setTimeout(() => {
          portalTimers.current = [];
          setOrbState("idle");
          travel();
        }, 700);
        portalTimers.current.push(closingTimer);
      }, 730);
      portalTimers.current.push(traversalTimer);
    }, 320);
    portalTimers.current = [openingTimer];
  }, [clearPortalTimers]);
  const onGround = useCallback(() => beginPortalTravel("ground", () => requestUraiWorldTravel({ destination: "infrastructure-hub", href: "/ground/", entryPortal: "home-ground", cameraCheckpoint: "home-ground-descent" })), [beginPortalTravel]);
  const onLifeMap = useCallback(() => beginPortalTravel("life-map", () => {
    const scene = useSceneStore.getState();
    scene.enterLifeMap();
  }), [beginPortalTravel]);
  const openOrb = useCallback(() => { if (!useSceneStore.getState().inputLocked) onOrbOpen(); }, [onOrbOpen]);
  const interaction = useCallback(() => { if (useSceneStore.getState().inputLocked) return; if (nearby === "orb") openOrb(); if (nearby === "ground") onGround(); if (nearby === "life-map") onLifeMap(); }, [nearby, onGround, onLifeMap, openOrb]);
  const reset = useCallback(() => { yaw.current = 0; pitch.current = -0.08; target.current = SPAWN.clone(); setPortalSequence("idle"); }, []);
  const input = useMovementInput({ onInteract: interaction, onReset: reset });
  const look = useDragLook({ yaw, pitch, sensitivity: 0.0034, onDragState: setDragging });

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    setReviewFixture(query.get("homePrivateFixture") === "1" ? "safe-private" : "none");
    const requestedState = query.get("homeOrbState");
    if (requestedState && requestedState in ORB_CLIPS) setOrbState(requestedState as OrbState);
  }, []);

  useEffect(() => () => clearPortalTimers(), [clearPortalTimers]);

  useEffect(() => {
    const cancelAscent = (event: KeyboardEvent) => {
      const scene = useSceneStore.getState();
      if (event.key !== "Escape" || scene.phase !== "ASCENT") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      scene.setPhase("HOME");
      scene.unlock();
      setPortalSequence("idle");
    };
    window.addEventListener("keydown", cancelAscent, true);
    return () => window.removeEventListener("keydown", cancelAscent, true);
  }, []);

  if (!webglAvailable) return null;
  const ready = canvasReady && sceneReady;
  const orbClip = ORB_CLIPS[orbState];
  return (
    <main
      className={`${styles.world} urai-asset-home-world`}
      data-urai-home-production
      data-urai-true-3d="true"
      data-home-primary-owner="asset-driven"
      data-home-visible-world="final-physical-sanctuary-memory-rooms"
      data-home-movement="walk-keyboard-click-touch"
      data-home-pointer-lock="false"
      data-home-audio="silent-fallback"
      data-home-assets-ready={ready ? "true" : "false"}
      data-home-runtime-assets="home-entry-chamber-v1.glb portal-ring-master-v1.glb urai-orb-avatar-v1.glb"
      data-home-authored-regions="home-mountain-horizon home-lantern-village"
      data-home-nearby={nearby ?? "none"}
      data-home-camera-mode={phase === "ASCENT" ? "ascent" : dragging ? "look" : "embodied"}
      data-home-scene-phase={phase}
      data-home-ascent-progress={phase === "ASCENT" ? progress.toFixed(3) : "0.000"}
      data-home-input-locked={inputLocked ? "true" : "false"}
      data-home-portal-sequence={portalSequence}
      data-home-portal-lifecycle="opening-traversal-closing"
      data-home-review-fixture={reviewFixture}
      data-home-orb-state={orbState}
      data-home-orb-clip={orbClip}
      data-home-animation-owner="authored-sanctuary-plus-gltf-interactions"
      data-testid="home-visible-navigable-sanctuary-world"
      {...look}
    >
      <Canvas
        className={styles.canvas}
        dpr={[1, 1.1]}
        shadows
        camera={{ position: [0, 4.1, 13.75], fov: 48, near: 0.08, far: 180 }}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.22;
          setCanvasReady(true);
        }}
      >
        <HomeScene input={input} yaw={yaw} pitch={pitch} target={target} avatar={avatar} onNearby={setNearby} onOrbOpen={openOrb} onGround={onGround} onLifeMap={onLifeMap} orbState={orbState} onSceneReady={() => setSceneReady(true)} />
      </Canvas>
      <header className={styles.brand} aria-label="URAI"><strong>URAI</strong><span>Always connected</span></header>
      <div className={styles.worldHint} role="status" aria-live="polite">{phase === "ASCENT" ? "Ascending to Life Map" : nearby === "orb" ? "The Orb is ready" : nearby === "ground" ? "Enter Ground" : nearby === "life-map" ? "Ascend to Life Map" : "Walk the living world"}</div>
      <div className={styles.destinationNames} aria-hidden="true"><span>GROUND</span><span>LIFE MAP</span></div>
      <MobileMovementPad input={input} label="Home movement controls" />
      <span className="sr-only" data-testid="urai-home-webgl-orb">The authored Orb companion is present in the Home scene.</span>
      <span className="sr-only" data-testid="urai-home-embodied-avatar">Your authored embodied presence is active in the Home scene.</span>
      <span className="sr-only">Open Ground directly. Ascend to Life Map. Open URAI Orb companion.</span>
    </main>
  );
}

useGLTF.preload(HOME_MODEL);
useGLTF.preload(PORTAL_MODEL);
useGLTF.preload(ORB_MODEL);
