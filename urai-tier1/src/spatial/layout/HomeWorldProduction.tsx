"use client";

import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Float, Sky, Sparkles, Stars, useAnimations, useGLTF, useTexture } from "@react-three/drei";
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
const HOME_BACKDROP = "/assets/urai/home/home-threshold-main.webp";
const HOME_BOUNDS = { minX: -9, maxX: 9, minZ: -9, maxZ: 9 };
const SPAWN = new THREE.Vector3(0, 0, 7.2);
const ORB = new THREE.Vector3(0, 1.18, -0.65);
const GROUND_PORTAL = new THREE.Vector3(-4.55, 0.35, -6.55);
const LIFE_MAP_PORTAL = new THREE.Vector3(4.55, 0.35, -6.65);
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
  "sculpted-stone": { color: "#536453", emissive: "#0b130d", emissiveIntensity: 0.08, roughness: 0.96, metalness: 0 },
  "provenance-gold": { color: "#c8964f", emissive: "#4a2e0c", emissiveIntensity: 0.28, roughness: 0.58, metalness: 0.16 },
  "celestial-glass": { color: "#8dc7cc", emissive: "#174b58", emissiveIntensity: 0.72, roughness: 0.24, metalness: 0.02, opacity: 0.68, transmission: 0.1 },
  "threshold-violet": { color: "#8b75b8", emissive: "#3c245c", emissiveIntensity: 0.62, roughness: 0.38, metalness: 0.02, opacity: 0.72, transmission: 0.04 },
  "living-organic": { color: "#416c45", emissive: "#0b2410", emissiveIntensity: 0.12, roughness: 0.94, metalness: 0 },
  "flowing-water": { color: "#75b8c2", emissive: "#123e4b", emissiveIntensity: 0.34, roughness: 0.2, metalness: 0, opacity: 0.58, transmission: 0.16 },
  "moon-ivory": { color: "#b99e78", emissive: "#3b2818", emissiveIntensity: 0.14, roughness: 0.82, metalness: 0.01 },
  "ember-memory": { color: "#b86742", emissive: "#5d210f", emissiveIntensity: 0.45, roughness: 0.58, metalness: 0.02 },
};

function applyHomeObjectCharacter(material: THREE.MeshStandardMaterial, objectName: string) {
  material.metalnessMap = null;
  material.roughnessMap = null;
  if (material.normalMap) material.normalScale.setScalar(0.34);
  if (objectName.includes("sanctuary-terrain") || objectName.startsWith("mountain-ridge") || objectName.startsWith("horizon-mountain")) {
    material.color.set("#365e46");
    material.emissive.set("#07150d");
    material.emissiveIntensity = 0.07;
    if (material.normalMap) material.normalScale.setScalar(0.5);
    material.roughness = 0.94;
    material.metalness = 0;
  } else if (objectName.startsWith("village-tower")) {
    material.color.set("#5f4834");
    material.emissive.set("#26170d");
    material.emissiveIntensity = 0.07;
    material.roughness = 0.92;
    material.metalness = 0;
  } else if (objectName.startsWith("village-roof")) {
    material.color.set("#8f5632");
    material.emissive.set("#34190d");
    material.emissiveIntensity = 0.1;
    material.roughness = 0.82;
    material.metalness = 0.02;
  } else if (objectName.startsWith("living-growth") || objectName.includes("vegetation")) {
    material.color.set("#2f6a43");
    material.emissive.set("#071b0f");
    material.emissiveIntensity = 0.08;
    if (material.normalMap) material.normalScale.setScalar(0.46);
    material.roughness = 0.92;
    material.metalness = 0;
  } else if (objectName.startsWith("sanctuary-waterfall")) {
    material.color.set("#77c6cf");
    material.emissive.set("#0b3f4d");
    material.emissiveIntensity = 0.24;
    material.opacity = 0.42;
    material.transparent = true;
    material.depthWrite = false;
    material.roughness = 0.18;
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
    object.castShadow = false;
    object.receiveShadow = true;
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
      object.scale.x *= 0.72 + variation * 0.62;
      object.scale.y *= 0.76 + (1 - variation) * 0.42;
      object.scale.z *= 0.74 + variation * 0.48;
      object.rotation.y += (variation - 0.5) * 0.94;
      return;
    }
    const villageIndex = indexedName(object.name, "inhabited-village-");
    if (villageIndex !== null) {
      if (villageIndex % 4 !== 1) object.visible = false;
      else {
        const variation = nameVariation(object.name);
        const scale = 0.72 + variation * 0.18;
        object.scale.multiplyScalar(scale);
        object.rotation.y += (variation - 0.5) * 0.84;
      }
      return;
    }
    const towerIndex = indexedName(object.name, "village-tower-");
    if (towerIndex !== null) {
      if (towerIndex % 4 !== 1) object.visible = false;
      else object.scale.multiplyScalar(0.78 + nameVariation(object.name) * 0.16);
      return;
    }
    const roofIndex = indexedName(object.name, "village-roof-");
    if (roofIndex !== null) {
      if (roofIndex % 4 !== 1) object.visible = false;
      else object.scale.multiplyScalar(0.8 + nameVariation(object.name) * 0.14);
      return;
    }
    const waterfallIndex = indexedName(object.name, "sanctuary-waterfall-");
    if (waterfallIndex !== null) {
      if (waterfallIndex % 2 === 0) object.visible = false;
      else object.scale.multiply(new THREE.Vector3(0.48, 0.64, 0.48));
      return;
    }
    const growthIndex = indexedName(object.name, "living-growth-");
    if (growthIndex !== null) {
      if (growthIndex % 3 !== 1) object.visible = false;
      else {
        const variation = nameVariation(object.name);
        object.scale.multiplyScalar(0.76 + variation * 0.44);
        object.rotation.y += variation * Math.PI * 0.72;
      }
      return;
    }
    const anchorIndex = indexedName(object.name, "memory-place-anchor-");
    if (anchorIndex !== null) {
      object.visible = false;
      object.scale.multiplyScalar(0.34);
    }
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
    <group ref={root} name="home-orb-sanctuary" userData={{ runtimeAsset: ORB_MODEL, semanticOwner: "urai-home-webgl-orb", clip }} position={ORB} scale={0.78} raycast={interactive ? undefined : DISABLED_RAYCAST} onClick={(event) => { event.stopPropagation(); onOpen(); }}>
      <Float speed={0.64} rotationIntensity={0.06} floatIntensity={0.13}><primitive object={orb} /></Float>
      <pointLight color="#b6f1ff" intensity={8.5} distance={14} decay={2} position={[0, 2.2, 2.8]} />
      <pointLight color="#ffd69a" intensity={4.4} distance={11} decay={2} position={[-2.4, 1.8, 2.1]} />
    </group>
  );
}

function EmbodiedSelf({ root: outerRoot }: { root: MutableRefObject<THREE.Group | null> }) {
  const { scene } = useGLTF(HOME_MODEL);
  const avatar = useMemo(() => {
    const source = scene.getObjectByName("embodied-presence-root");
    if (!source) throw new Error("Authored Home is missing embodied-presence-root.");
    const clone = prepareModel(source.clone(true), "home");
    clone.position.set(0, 0, 0);
    clone.rotation.set(0, 0, 0);
    clone.scale.setScalar(0.32);
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
    <group ref={root} name={`home-${type}-portal-world-owned`} userData={{ runtimeAsset: PORTAL_MODEL, destination: type }} position={position} scale={type === "life-map" ? 0.34 : 0.32} raycast={interactive ? undefined : DISABLED_RAYCAST} onClick={(event) => { event.stopPropagation(); onEnter(); }}>
      <primitive object={portal} />
      <pointLight color={type === "ground" ? "#9d8acb" : "#e6be78"} intensity={3.8} distance={10} decay={2} position={[0, 2.2, 2]} />
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
  const upAxis = useRef(new THREE.Vector3(0, 1, 0));

  const placeHomeCamera = useCallback(() => {
    const portrait = size.height > size.width;
    camera.position.set(position.current.x, portrait ? 3.55 : 3.72, position.current.z + (portrait ? 13.7 : 13.05));
    camera.lookAt(position.current.x, 1.12 + pitch.current, position.current.z - (portrait ? 7.2 : 7.8));
  }, [camera, pitch, size.height, size.width]);

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
    cameraOffset.current.set(0, (portrait ? 3.55 : 3.72) + pitch.current * 0.82, portrait ? 13.7 : 13.05).applyAxisAngle(upAxis.current, yaw.current);
    cameraDesired.current.copy(position.current).add(cameraOffset.current);
    camera.position.lerp(cameraDesired.current, 1 - Math.pow(0.0018, delta));
    camera.lookAt(position.current.x, 1.12 + pitch.current, position.current.z - (portrait ? 7.2 : 7.8));
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
  const texture = useTexture(HOME_BACKDROP);
  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.max(texture.anisotropy, 4);
    texture.needsUpdate = true;
  }, [texture]);
  return (
    <group name="home-authored-cinematic-horizon" raycast={DISABLED_RAYCAST}>
      <mesh position={[0, 7.4, -34]} scale={[44, 24, 1]} renderOrder={-4}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={texture} transparent opacity={0.72} depthWrite={false} toneMapped={false} fog={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.22, -8]} scale={[1.25, 1, 1]}>
        <circleGeometry args={[22, 64]} />
        <meshStandardMaterial color="#234735" roughness={1} metalness={0} />
      </mesh>
    </group>
  );
}

function SanctuaryPathAndLanterns() {
  const lanterns: [number, number, number][] = [[-3.5, 0.52, 5.0], [3.5, 0.52, 3.4], [-3.2, 0.52, 0.7], [3.1, 0.52, -2.1], [-2.7, 0.52, -4.7], [2.5, 0.52, -6.2]];
  const stones = useMemo(() => Array.from({ length: 15 }, (_, index) => {
    const z = 6.2 - index * 0.92;
    const x = Math.sin(index * 0.78) * 0.56 + Math.sin(index * 0.21) * 0.2;
    return { position: [x, 0.115, z] as [number, number, number], rotation: (index % 5 - 2) * 0.08, scale: 0.82 + (index % 4) * 0.06 };
  }), []);
  const river = useMemo(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3(-4.8, 0.13, 7.5), new THREE.Vector3(-3.2, 0.13, 3.8), new THREE.Vector3(-4.0, 0.13, 0.2),
    new THREE.Vector3(-2.8, 0.13, -3.3), new THREE.Vector3(-3.7, 0.13, -7.5), new THREE.Vector3(-2.4, 0.13, -10.8),
  ], false, "catmullrom", 0.34), []);
  return (
    <group name="home-authored-sanctuary-path-and-lanterns" raycast={DISABLED_RAYCAST}>
      {stones.map((stone, index) => (
        <mesh key={`stone-${index}`} position={stone.position} rotation={[0, stone.rotation, 0]} scale={[stone.scale, 1, 0.72 + (index % 3) * 0.08]}>
<cylinderGeometry args={[0.5, 0.56, 0.08, 18]} />
<meshStandardMaterial color={index % 3 === 0 ? "#8d7a61" : "#756b58"} roughness={0.98} metalness={0} />
        </mesh>
      ))}
      <mesh geometry={new THREE.TubeGeometry(river, 72, 0.42, 14, false)} scale={[1, 0.22, 1]}>
        <meshStandardMaterial color="#4f918b" emissive="#0c3537" emissiveIntensity={0.17} roughness={0.22} metalness={0} transparent opacity={0.58} depthWrite={false} />
      </mesh>
      {lanterns.map((position, index) => (
        <group key={index} position={position}>
<mesh position={[0, -0.28, 0]}><cylinderGeometry args={[0.035, 0.055, 0.55, 10]} /><meshStandardMaterial color="#3e372f" roughness={0.94} /></mesh>
<mesh><sphereGeometry args={[0.09, 16, 10]} /><meshStandardMaterial color="#ffe5ad" emissive="#ff9b46" emissiveIntensity={2.5} roughness={0.38} /></mesh>
<pointLight color="#ffb866" intensity={1.7} distance={5.6} decay={2} />
        </group>
      ))}
    </group>
  );
}

function HomeScene({ input, yaw, pitch, target, avatar, onNearby, onOrbOpen, onGround, onLifeMap, orbState, onSceneReady }: { input: MovementInput; yaw: MutableRefObject<number>; pitch: MutableRefObject<number>; target: MutableRefObject<THREE.Vector3 | null>; avatar: MutableRefObject<THREE.Group | null>; onNearby: (value: Nearby) => void; onOrbOpen: () => void; onGround: () => void; onLifeMap: () => void; orbState: OrbState; onSceneReady: () => void; }) {
  return (
    <>
      <color attach="background" args={["#17333a"]} />
      <Sky distance={450000} sunPosition={[-14, 2.2, -34]} inclination={0.36} azimuth={0.18} turbidity={5.4} rayleigh={1.25} mieCoefficient={0.009} mieDirectionalG={0.84} />
      <fogExp2 attach="fog" args={["#38564e", 0.0082]} />
      <ambientLight intensity={0.62} color="#ffe2bd" />
      <hemisphereLight args={["#ffd7a4", "#183b2a", 1.22]} />
      <directionalLight position={[-10, 8, 10]} intensity={3.45} color="#ffb868" />
      <directionalLight position={[10, 7, -9]} intensity={0.72} color="#addfe2" />
      <pointLight position={[0, 5.5, -7]} color="#ffad5b" intensity={3.25} distance={34} decay={2} />
      <pointLight position={[5, 3.5, 2]} color="#cce8cf" intensity={1.2} distance={22} decay={2} />
      <Stars radius={115} depth={76} count={90} factor={0.5} saturation={0.03} fade speed={0.008} />
      <Sparkles count={30} scale={[24, 7, 28]} position={[0, 2.6, -5]} size={0.52} speed={0.022} opacity={0.055} color="#f5d7a7" />
      <SceneReadiness onReady={onSceneReady} />
      <PlayerRig input={input} yaw={yaw} pitch={pitch} target={target} avatar={avatar} onNearby={onNearby} />
      <CinematicHomeBackdrop />
      <HomeEnvironment walkTarget={target} />
      <SanctuaryPathAndLanterns />
      <EmbodiedSelf root={avatar} />
      <HomeOrbStateContext.Provider value={orbState}><OrbSanctuary onOpen={onOrbOpen} /></HomeOrbStateContext.Provider>
      <WorldPortal type="ground" position={GROUND_PORTAL} onEnter={onGround} />
      <WorldPortal type="life-map" position={LIFE_MAP_PORTAL} onEnter={onLifeMap} />
      <EffectComposer multisampling={0}><Bloom intensity={0.16} luminanceThreshold={0.9} luminanceSmoothing={0.16} mipmapBlur /><Vignette eskil={false} offset={0.14} darkness={0.08} /></EffectComposer>
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
    portalTimers.current = [
      window.setTimeout(() => setPortalSequence(`${destination}:traversal`), 320),
      window.setTimeout(() => setPortalSequence(`${destination}:closing`), 1050),
      window.setTimeout(() => { setOrbState("idle"); travel(); }, 1750),
    ];
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
        camera={{ position: [0, 3.72, 20.25], fov: 46, near: 0.08, far: 180 }}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 0.94;
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
useTexture.preload(HOME_BACKDROP);