"use client";

import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { ContactShadows, Float, Sky, Stars, useAnimations, useGLTF } from "@react-three/drei";
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

const OrbStateContext = createContext<OrbState>("idle");
const ReducedMotionContext = createContext(false);

function makeTerrainGeometry() {
  const geometry = new THREE.PlaneGeometry(34, 34, 120, 120);
  geometry.rotateX(-Math.PI / 2);
  const position = geometry.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i);
    const z = position.getZ(i);
    const distance = Math.hypot(x * 0.58, z * 0.48);
    const broad = Math.sin(x * 0.26) * 0.22 + Math.cos(z * 0.21) * 0.18 + Math.sin((x + z) * 0.15) * 0.13;
    const basin = -Math.exp(-((x / 5.4) ** 2 + ((z + 4.8) / 4.2) ** 2)) * 0.72;
    const shoulder = Math.max(0, distance - 6.4) * 0.045;
    position.setY(i, broad + basin + shoulder - 0.18);
  }
  geometry.computeVertexNormals();
  return geometry;
}

function makeTerrainTexture() {
  const size = 256;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = (y * size + x) * 4;
      const n = Math.sin(x * 0.13) * 0.05 + Math.cos(y * 0.11) * 0.04 + Math.sin((x + y) * 0.037) * 0.035;
      data[index] = Math.round(101 + n * 255);
      data[index + 1] = Math.round(112 + n * 230);
      data[index + 2] = Math.round(83 + n * 190);
      data[index + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(10, 10);
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
  material.metalness = 0;
  material.roughness = /water|pool|stream/.test(id) ? 0.2 : 0.86;
  material.transparent = false;
  material.opacity = 1;
  if (/terrain|ground|moss|garden/.test(id)) material.color.set("#758067");
  else if (/wood|beam|timber/.test(id)) material.color.set("#80654c");
  else if (/path|step|terrace/.test(id)) material.color.set("#a29378");
  else if (/water|pool|stream/.test(id)) material.color.set("#668d8b");
  else material.color.multiply(new THREE.Color("#c8bfae"));
  material.emissive.set("#11130f");
  material.emissiveIntensity = 0.01;
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
  const scale = THREE.MathUtils.clamp(13.5 / horizontal, 0.28, 2.8);
  world.scale.setScalar(scale);
  world.position.set(-center.x * scale, -box.min.y * scale - 0.12, -4.4 - center.z * scale);
  world.rotation.y = -0.08;
  world.userData.uraiVisibleWorld = "authored-coherent-three-dimensional-sanctuary";
  world.userData.suppressedPortalProps = true;
  world.userData.centeredForHomeCamera = true;
  return world;
}

function prepareOrb(source: THREE.Object3D) {
  const orb = source.clone(true);
  orb.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    if (object.material instanceof THREE.MeshStandardMaterial) {
      const material = object.material.clone();
      material.roughness = Math.max(0.34, material.roughness);
      material.metalness = Math.min(0.34, material.metalness);
      material.emissiveIntensity = Math.max(0.08, material.emissiveIntensity * 0.46);
      material.needsUpdate = true;
      object.material = material;
    }
    object.castShadow = true;
    object.receiveShadow = true;
    object.frustumCulled = false;
  });
  return orb;
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
        <meshStandardMaterial map={TERRAIN_TEXTURE} color="#829071" roughness={0.98} metalness={0} />
      </mesh>
      <primitive object={authoredWorld} />
      <mesh name="home-walkable-navigation-surface" rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.5, -0.5]} onClick={onWalk}>
        <planeGeometry args={[19, 19]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
      <group name="home-mountain-horizon" position={[0, 0, -12.5]} userData={{ role: "atmospheric-depth-boundary" }} />
      <group name="home-living-vegetation" userData={{ role: "authored-model-vegetation-only" }} />
      <mesh name="home-reflecting-water" position={[0.2, -0.24, -6.5]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[2.35, 128]} />
        <meshPhysicalMaterial color="#6b9695" roughness={0.14} metalness={0.04} clearcoat={0.82} clearcoatRoughness={0.15} transparent opacity={0.78} />
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
    <group ref={root} name="home-orb-sanctuary" position={ORB} scale={0.24} userData={{ runtimeAsset: ORB_MODEL, semanticOwner: "urai-home-webgl-orb", clip }} raycast={interactive ? undefined : DISABLED_RAYCAST} onClick={(event) => { event.stopPropagation(); onOpen(); }}>
      <Float speed={reducedMotion ? 0 : 0.26} rotationIntensity={reducedMotion ? 0 : 0.008} floatIntensity={reducedMotion ? 0 : 0.02}>
        <primitive object={orb} />
      </Float>
      <pointLight color="#e6f4ef" intensity={1.1} distance={4} decay={2} position={[0, 0.8, 0.4]} />
      <pointLight color="#f0c88d" intensity={0.38} distance={3.2} decay={2} position={[-0.65, 0.2, 0.55]} />
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
      <pointLight color="#d6b37a" intensity={0.3} distance={4.2} decay={2} position={[0, 0.25, -0.55]} />
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
      <pointLight color="#dbe9dc" intensity={0.24} distance={4} decay={2} position={[0, 1.25, -0.35]} />
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
    look.current.copy(position.current).addScaledVector(forward.current, portrait ? 5.8 : 7.2);
    camera.lookAt(look.current.x, 1.28 + pitch.current, look.current.z);
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
    look.current.copy(position.current).addScaledVector(forward.current, portrait ? 5.8 : 7.2);
    camera.lookAt(look.current.x, 1.28 + pitch.current, look.current.z);

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
      <color attach="background" args={[cosmic ? "#07111b" : "#9ba99a"]} />
      {cosmic ? <Stars radius={160} depth={58} count={920} factor={2.1} saturation={0.08} fade speed={props.reducedMotion ? 0 : 0.08} /> : <Sky distance={450000} sunPosition={[5, 2.8, -8]} inclination={0.49} azimuth={0.18} mieCoefficient={0.004} mieDirectionalG={0.78} rayleigh={1.8} turbidity={7.2} />}
      {cosmic ? <fogExp2 attach="fog" args={["#101b28", 0.0024]} /> : <fogExp2 attach="fog" args={["#aab2a2", 0.018]} />}
      <ambientLight intensity={1.15} color="#f1ede2" />
      <hemisphereLight args={["#dfe8dc", "#555949", 1.25]} />
      <directionalLight position={[-10, 18, 8]} intensity={3.1} color="#ffe0a8" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-near={0.5} shadow-camera-far={52} shadow-camera-left={-18} shadow-camera-right={18} shadow-camera-top={18} shadow-camera-bottom={-18} />
      <directionalLight position={[10, 11, -10]} intensity={0.7} color="#c9e2dd" />
      <SceneReadiness onReady={props.onSceneReady} />
      <PlayerRig input={props.input} yaw={props.yaw} pitch={props.pitch} target={props.target} avatar={props.avatar} onNearby={props.onNearby} groundDescent={props.groundDescent} onGroundComplete={props.onGroundComplete} reducedMotion={props.reducedMotion} />
      <SanctuaryWorld walkTarget={props.target} />
      <EmbodiedPresence root={props.avatar} />
      <ReducedMotionContext.Provider value={props.reducedMotion}><OrbStateContext.Provider value={props.orbState}><OrbSanctuary onOpen={props.onOrbOpen} /></OrbStateContext.Provider></ReducedMotionContext.Provider>
      <GroundThresholdLandmark onEnter={props.onGround} />
      <LifeMapSkyLookout onEnter={props.onLifeMap} />
      {!cosmic ? <ContactShadows position={[0, 0.02, -2]} opacity={0.32} scale={23} blur={2.5} far={9} resolution={512} frames={props.reducedMotion ? 1 : Infinity} /> : null}
      <EffectComposer multisampling={0}><Bloom intensity={0.03} luminanceThreshold={1.15} luminanceSmoothing={0.22} mipmapBlur /><Vignette eskil={false} offset={0.2} darkness={0.045} /></EffectComposer>
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
  const pitch = useRef(-0.06);
  const target = useRef<THREE.Vector3 | null>(null);
  const avatar = useRef<THREE.Group | null>(null);

  const openOrb = useCallback(() => { if (!useSceneStore.getState().inputLocked && !groundDescent) onOrbOpen(); }, [groundDescent, onOrbOpen]);
  const startGroundDescent = useCallback(() => { if (useSceneStore.getState().inputLocked || groundDescent) return; target.current = null; setOrbState("transition"); setTransitionSequence("ground:opening"); setGroundDescent(true); }, [groundDescent]);
  const finishGroundDescent = useCallback(() => { setTransitionSequence("ground:closing"); requestUraiWorldTravel({ destination: "infrastructure-hub", href: "/ground/", entryPortal: "home-ground", cameraCheckpoint: "home-ground-descent" }); }, []);
  const startLifeMapAscent = useCallback(() => { const store = useSceneStore.getState(); if (store.inputLocked || groundDescent || store.phase === "ASCENT") return; target.current = null; setOrbState("transition"); setTransitionSequence("life-map:opening"); store.enterLifeMap(); }, [groundDescent]);
  const interaction = useCallback(() => { if (useSceneStore.getState().inputLocked || groundDescent) return; if (nearby === "orb") openOrb(); if (nearby === "ground") startGroundDescent(); if (nearby === "life-map") startLifeMapAscent(); }, [groundDescent, nearby, openOrb, startGroundDescent, startLifeMapAscent]);
  const reset = useCallback(() => { if (groundDescent) return; yaw.current = 0; pitch.current = -0.06; target.current = SPAWN.clone(); setTransitionSequence("idle"); }, [groundDescent]);
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
    <main className={`${styles.world} urai-asset-home-world`} data-urai-home-production data-urai-true-3d="true" data-home-primary-owner="asset-driven" data-home-real-world-first="true" data-home-visible-world="authored-coherent-three-dimensional-sanctuary" data-home-world-character="believable-natural-inhabitable-environment" data-home-visible-portals="false" data-home-transition-affordances="ground-environmental-descent life-map-sky-lookout" data-home-provider-environment={HOME_PROVIDER_ENVIRONMENT} data-home-provider-role="atmospheric-support-only" data-home-provider-regions="home-atmospheric-horizon" data-home-generated-scenery="suppressed" data-home-physical-base="authored-coherent-world" data-home-visual-ownership="three-dimensional-geometry" data-home-desktop-mobile-world="same-scene" data-home-embodied-self="privacy-preserving-shadow" data-home-movement="walk-keyboard-click-touch" data-home-pointer-lock="false" data-home-audio="silent-fallback" data-home-assets-ready={ready ? "true" : "false"} data-home-runtime-assets="home-entry-chamber-v1.glb urai-orb-avatar-v1.glb replay-memory-film-main.webp" data-home-authored-regions="home-sanctuary-geometry home-mountain-horizon home-living-vegetation home-reflecting-water" data-home-nearby={nearby ?? "none"} data-home-camera-mode={groundDescent ? "descent" : phase === "ASCENT" ? "ascent" : dragging ? "look" : "embodied-first-person"} data-home-scene-phase={groundDescent ? "GROUND_DESCENT" : phase} data-home-ascent-progress={phase === "ASCENT" ? progress.toFixed(3) : "0.000"} data-home-input-locked={transitioning || inputLocked ? "true" : "false"} data-home-portal-sequence={transitionSequence} data-home-portal-lifecycle="environmental-approach-traversal-arrival" data-home-review-fixture={reviewFixture} data-home-orb-state={orbState} data-home-orb-clip={ORB_CLIPS[orbState]} data-home-animation-owner="provider-natural-world-plus-authored-physical-interactions" data-testid="home-visible-navigable-sanctuary-world" {...look}>
      <Canvas className={styles.canvas} dpr={[1, 1.4]} shadows camera={{ position: [0, 1.7, 6], fov: 58, near: 0.05, far: 240 }} gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }} onCreated={({ gl }) => { gl.outputColorSpace = THREE.SRGBColorSpace; gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.2; gl.setClearColor(0x9ba99a, 1); setCanvasReady(true); }}>
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
