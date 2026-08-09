"use client";

import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { ContactShadows, Stars, useGLTF } from "@react-three/drei";
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import * as THREE from "three";
import { MobileMovementPad, stepEmbodiedMotion, useDragLook, useMovementInput, type MovementInput } from "@/spatial/navigation/EmbodiedNavigation";
import { useSceneStore } from "@/spatial/store/useSceneStore";
import { requestUraiWorldOrbOpen, requestUraiWorldTravel } from "@/spatial/world/worldEvents";
import styles from "./HomeWorldProduction.module.css";

const HOME_PROVIDER_ENVIRONMENT = "/assets/urai/replay/replay-memory-film-main.webp";
const HOME_SANCTUARY_MODEL = "/assets/urai/generated/models/home-entry-chamber-v1.glb";
const HOME_FERN_MODEL = "/assets/urai/home-production/cc0/polyhaven-fern-02-geometry-v1.glb";
const HOME_SCANNED_COMPOSITION_V1 = "owned-sanctuary-plus-cc0-fern";
const HOME_BOUNDS = { minX: -12.5, maxX: 12.5, minZ: -15.5, maxZ: 10.5 };
const SPAWN = new THREE.Vector3(0, 0, 7.8);
const ORB = new THREE.Vector3(0, 1.45, -2.85);
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

function prepareAuthoredSanctuary(source: THREE.Object3D) {
  const world = source.clone(true);
  const rejected = /portal|ring|threshold|village|mannequin|avatar|debug|marker|label|embodied|presence|memory-place-anchor|living-growth/i;
  const rejectedForgeForms = /vault|monolith|bridge|grove|firefly|alcove|veil|waterfall|mountain|vegetation|tree|sculpture/i;
  let visibleMeshCount = 0;
  world.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.visible = !rejected.test(object.name) && !rejectedForgeForms.test(object.name);
    if (!object.visible) return;
    const name = object.name.toLowerCase();
    const stone = /basin|pedestal|path|ground|terrain|stone/.test(name);
    object.material = new THREE.MeshStandardMaterial({ color: stone ? "#526158" : "#3f5148", roughness: stone ? 0.92 : 0.98, metalness: 0.01 });
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

function CinematicBackdrop() {
  return <div aria-hidden="true" style={{ position: "absolute", inset: 0, zIndex: 0, overflow: "hidden", background: "radial-gradient(circle at 50% 42%, #244a4a 0%, #123239 28%, #0b2029 58%, #061015 100%)" }} />;
}

function Terrain({ walkTarget }: { walkTarget: MutableRefObject<THREE.Vector3 | null> }) {
  const sanctuary = useGLTF(HOME_SANCTUARY_MODEL);
  const authored = useMemo(() => prepareAuthoredSanctuary(sanctuary.scene), [sanctuary.scene]);
  const onWalk = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    if (useSceneStore.getState().inputLocked) return;
    walkTarget.current = new THREE.Vector3(THREE.MathUtils.clamp(event.point.x, HOME_BOUNDS.minX, HOME_BOUNDS.maxX), 0, THREE.MathUtils.clamp(event.point.z, HOME_BOUNDS.minZ, HOME_BOUNDS.maxZ));
  };
  return (
    <group name="home-authored-terrain" userData={{ providerImageRole: "atmospheric-support-only", physicalBase: "authored-coherent-world" }}>
      <primitive object={authored} />
      <mesh name="home-natural-terrain" geometry={TERRAIN_GEOMETRY} receiveShadow onClick={onWalk}>
        <meshStandardMaterial color="#29483a" roughness={0.98} metalness={0} />
      </mesh>
      <mesh name="home-walkable-navigation-surface" rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.55, -1.8]} onClick={onWalk}>
        <planeGeometry args={[25, 28]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
    </group>
  );
}

function NaturalHorizon() {
  return <group name="home-mountain-horizon" userData={{ role: "terrain-fog-continuity-without-procedural-ridge" }} />;
}

const FERN_PLACEMENTS = [
  [-7.4,-4.9,0.82,-0.3],[-6.3,-7.4,1.08,0.7],[-5.1,-10.2,0.9,1.8],[-3.8,-3.7,0.72,-1.4],[-3.1,-8.8,1.16,2.3],[-2.2,-11.6,0.86,0.2],
  [2.3,-4.1,0.8,0.9],[3.2,-9.4,1.12,-0.6],[4.1,-11.1,0.88,1.4],[5.6,-4.8,0.76,2.6],[6.5,-8.2,1.04,-1.8],[7.2,-10.7,0.9,0.4],
  [-8.0,0.8,0.8,1.1],[-5.8,2.6,0.72,-2.2],[5.9,2.1,0.78,2.0],[7.8,0.2,0.86,-0.8],
] as const;

function NaturalVegetation({ reducedMotion }: { reducedMotion: boolean }) {
  const fern = useGLTF(HOME_FERN_MODEL);
  const material = useMemo(() => new THREE.MeshStandardMaterial({ color: "#6f9a70", roughness: 0.92, metalness: 0, side: THREE.DoubleSide }), []);
  useEffect(() => () => material.dispose(), [material]);
  const instances = useMemo(() => FERN_PLACEMENTS.map(([x,z,scale,rotation], index) => {
    const object = fern.scene.clone(true); object.name = `home-scanned-fern-${index+1}`; object.position.set(x, terrainHeight(x,z)+0.02, z); object.rotation.y = rotation; object.scale.setScalar(scale);
    object.traverse((child) => { if (child instanceof THREE.Mesh) { child.material = material; child.castShadow = true; child.receiveShadow = true; } });
    return object;
  }), [fern.scene, material]);
  return <group name="home-living-vegetation" userData={{ role: "scanned-cc0-natural-ground", reducedMotion }}>{instances.map((object) => <primitive key={object.name} object={object} />)}</group>;
}

function SanctuaryPath() { return <group name="home-sanctuary-path" userData={{ geometryOwner: "retained-owned-sanctuary-model", primitiveScenery: false }} />; }

function SanctuaryPavilion() { return <group name="home-sanctuary-pavilion" userData={{ geometryOwner: "retained-owned-sanctuary-model", primitiveScenery: false }} />; }

function ReflectingWater() { return <group name="home-reflecting-water" position={[4.9, terrainHeight(4.9,-7.2)+0.015,-7.2]}><mesh rotation={[-Math.PI/2,0,0]}><planeGeometry args={[5.6,4.2,1,1]} /><meshPhysicalMaterial color="#123f48" roughness={0.08} clearcoat={1} clearcoatRoughness={0.1} transparent opacity={0.62} /></mesh></group>; }

function orbitGeometry(rx: number, ry: number) {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i < 128; i += 1) { const t = (i / 128) * Math.PI * 2; points.push(new THREE.Vector3(Math.cos(t) * rx, Math.sin(t) * ry, 0)); }
  return new THREE.BufferGeometry().setFromPoints(points);
}

function OrbRing({ rx, ry, rotation, color, opacity }: { rx: number; ry: number; rotation: Vec3; color: string; opacity: number }) {
  const geometry = useMemo(() => orbitGeometry(rx, ry), [rx, ry]);
  return <lineLoop geometry={geometry} rotation={rotation as [number, number, number]}><lineBasicMaterial color={color} transparent opacity={opacity} toneMapped={false} /></lineLoop>;
}

function OrbDust({ reducedMotion }: { reducedMotion: boolean }) {
  const ref = useRef<THREE.Points>(null);
  const geometry = useMemo(() => {
    const positions = new Float32Array(90 * 3);
    for (let i = 0; i < 90; i += 1) {
      const radius = 0.65 + seeded(i, 44) * 0.52;
      const angle = seeded(i, 45) * Math.PI * 2;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = (seeded(i, 46) - 0.5) * 1.05;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, []);
  useFrame((_, delta) => { if (!reducedMotion && ref.current) ref.current.rotation.y += delta * 0.07; });
  return <points ref={ref} geometry={geometry}><pointsMaterial color="#c9fff1" size={0.028} transparent opacity={0.48} depthWrite={false} toneMapped={false} /></points>;
}

function OrbSanctuary({ onOpen }: { onOpen: () => void }) {
  const reducedMotion = useContext(ReducedMotionContext); const core = useRef<THREE.Mesh>(null); const light = useRef<THREE.PointLight>(null);
  useFrame(({clock}) => { if (reducedMotion) return; const breathe = 1 + Math.sin(clock.elapsedTime*0.9)*0.018; core.current?.scale.setScalar(0.48*breathe); if (light.current) light.current.intensity = 1.35 + Math.sin(clock.elapsedTime*0.9)*0.12; });
  return <group name="home-orb-sanctuary" position={ORB} onClick={(event) => { event.stopPropagation(); onOpen(); }}><mesh ref={core} scale={0.48}><sphereGeometry args={[1,64,64]} /><meshPhysicalMaterial color="#b9dfe2" emissive="#4d8f9d" emissiveIntensity={0.72} roughness={0.18} metalness={0.08} clearcoat={0.9} clearcoatRoughness={0.16} /></mesh><OrbDust reducedMotion={reducedMotion} /><pointLight ref={light} color="#8bc9cf" intensity={1.35} distance={7} decay={2} /></group>;
}

function GroundThresholdLandmark({ onEnter }: { onEnter: () => void }) {
  const metadata = { transition: "physical-descent" };
  return <group name="home-ground-environmental-threshold" position={GROUND_THRESHOLD} userData={metadata}><mesh position={[0, 0.7, 0]} onClick={(event) => { event.stopPropagation(); onEnter(); }}><boxGeometry args={[3.8, 2.4, 3.8]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} /></mesh></group>;
}

function LifeMapSkyLookout({ onEnter }: { onEnter: () => void }) {
  return <group name="home-life-map-sky-lookout" position={LIFE_MAP_LOOKOUT} userData={{ transition: "sky-ascent" }}><mesh position={[0, 0.7, 0]} onClick={(event) => { event.stopPropagation(); onEnter(); }}><boxGeometry args={[3.8, 2.4, 3.8]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} /></mesh></group>;
}

function EmbodiedPresence({ root }: { root: MutableRefObject<THREE.Group | null> }) {
  return <group ref={root} name="home-authored-embodied-self" position={SPAWN} userData={{ representation: "privacy-preserving-first-person-presence" }}><mesh position={[0, 0.01, 0.25]} rotation={[-Math.PI / 2, 0, 0]} scale={[0.42, 1, 1]}><circleGeometry args={[0.38, 40]} /><meshBasicMaterial color="#000806" transparent opacity={0.08} depthWrite={false} /></mesh></group>;
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

function HomeScene(props: { input: MovementInput; yaw: MutableRefObject<number>; pitch: MutableRefObject<number>; target: MutableRefObject<THREE.Vector3 | null>; avatar: MutableRefObject<THREE.Group | null>; onNearby: (value: Nearby) => void; onOrbOpen: () => void; onGround: () => void; onGroundComplete: () => void; onLifeMap: () => void; onSceneReady: () => void; groundDescent: boolean; reducedMotion: boolean; }) {
  const phase = useSceneStore((state) => state.phase);
  const cosmic = phase === "ASCENT";
  return (
    <>
      {cosmic ? <color attach="background" args={["#01050b"]} /> : null}
      <Stars radius={190} depth={90} count={cosmic ? 2500 : 1100} factor={cosmic ? 2.8 : 1.25} saturation={0.16} fade speed={props.reducedMotion ? 0 : 0.035} />
      <fogExp2 attach="fog" args={[cosmic ? "#050b14" : "#0b1b1c", cosmic ? 0.0017 : 0.014]} />
      <ambientLight intensity={cosmic ? 0.12 : 0.42} color="#c6dbd4" />
      <hemisphereLight args={["#a7cdd0", "#101b13", cosmic ? 0.2 : 0.72]} />
      <directionalLight position={[9, 17, 4]} intensity={cosmic ? 0.32 : 1.7} color="#e8eee5" castShadow />
      <Terrain walkTarget={props.target} />
      <NaturalHorizon />
      <NaturalVegetation reducedMotion={props.reducedMotion} />
      <SanctuaryPath />
      <SanctuaryPavilion />
      <ReflectingWater />
      <ReducedMotionContext.Provider value={props.reducedMotion}>
        <OrbSanctuary onOpen={props.onOrbOpen} />
      </ReducedMotionContext.Provider>
      <EmbodiedPresence root={props.avatar} />
      <GroundThresholdLandmark onEnter={props.onGround} />
      <LifeMapSkyLookout onEnter={props.onLifeMap} />
      <PlayerRig input={props.input} yaw={props.yaw} pitch={props.pitch} target={props.target} avatar={props.avatar} onNearby={props.onNearby} groundDescent={props.groundDescent} onGroundComplete={props.onGroundComplete} reducedMotion={props.reducedMotion} />
      <SceneReadiness onReady={props.onSceneReady} />
      {!cosmic ? <ContactShadows position={[0, -0.08, -2.5]} opacity={0.2} scale={28} blur={4.5} far={14} resolution={512} frames={1} /> : null}
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
  const pitch = useRef(-0.045);
  const target = useRef<THREE.Vector3 | null>(null);
  const avatar = useRef<THREE.Group | null>(null);

  const openOrb = useCallback(() => { if (!useSceneStore.getState().inputLocked && !groundDescent) onOrbOpen(); }, [groundDescent, onOrbOpen]);
  const startGroundDescent = useCallback(() => { if (useSceneStore.getState().inputLocked || groundDescent) return; target.current = null; setOrbState("transition"); setTransitionSequence("ground:opening"); setGroundDescent(true); }, [groundDescent]);
  const finishGroundDescent = useCallback(() => { setTransitionSequence("ground:closing"); requestUraiWorldTravel({ destination: "infrastructure-hub", href: "/ground/", entryPortal: "home-ground", cameraCheckpoint: "home-ground-descent" }); }, []);
  const startLifeMapAscent = useCallback(() => { const store = useSceneStore.getState(); if (store.inputLocked || groundDescent || store.phase === "ASCENT") return; target.current = null; setOrbState("transition"); setTransitionSequence("life-map:opening"); store.enterLifeMap(); }, [groundDescent]);
  const interaction = useCallback(() => { if (useSceneStore.getState().inputLocked || groundDescent) return; if (nearby === "orb") openOrb(); if (nearby === "ground") startGroundDescent(); if (nearby === "life-map") startLifeMapAscent(); }, [groundDescent, nearby, openOrb, startGroundDescent, startLifeMapAscent]);
  const reset = useCallback(() => { if (groundDescent) return; yaw.current = 0; pitch.current = -0.045; target.current = SPAWN.clone(); setTransitionSequence("idle"); }, [groundDescent]);
  const input = useMovementInput({ enabled: !groundDescent, onInteract: interaction, onReset: reset });
  const look = useDragLook({ yaw, pitch, enabled: !groundDescent && phase !== "ASCENT", sensitivity: 0.0031, minPitch: -0.55, maxPitch: 0.68, onDragState: setDragging });

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    setReviewFixture(query.get("homePrivateFixture") === "1" ? "safe-private" : "none");
    const requestedState = query.get("homeOrbState");
    if (requestedState && requestedState in ORB_CLIPS) setOrbState(requestedState as OrbState);
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
    const cancel = (event: KeyboardEvent) => {
      const store = useSceneStore.getState();
      if (event.key !== "Escape") return;
      if (store.phase === "ASCENT") { event.preventDefault(); store.setPhase("HOME"); store.unlock(); setTransitionSequence("idle"); setOrbState("idle"); return; }
      if (groundDescent) { event.preventDefault(); setGroundDescent(false); setTransitionSequence("idle"); setOrbState("idle"); }
    };
    window.addEventListener("keydown", cancel, true);
    return () => window.removeEventListener("keydown", cancel, true);
  }, [groundDescent]);

  if (!webglAvailable) return null;
  const ready = canvasReady && sceneReady;
  const transitioning = phase === "ASCENT" || groundDescent;
  const context = phase === "ASCENT" ? "Ascending through the sky" : groundDescent ? "Descending into Ground" : nearby === "orb" ? "The Orb is here" : nearby === "ground" ? "The path descends" : nearby === "life-map" ? "Look to the sky" : null;

  return (
    <main className={`${styles.world} urai-asset-home-world`} data-urai-home-production data-urai-true-3d="true" data-home-primary-owner="asset-driven" data-home-real-world-first="true" data-home-visible-world="authored-coherent-three-dimensional-sanctuary" data-home-world-character="believable-natural-inhabitable-environment" data-home-visible-portals="false" data-home-transition-affordances="ground-environmental-descent life-map-sky-lookout" data-home-provider-environment={HOME_PROVIDER_ENVIRONMENT} data-home-provider-role="atmospheric-support-only" data-home-provider-regions="home-atmospheric-horizon" data-home-generated-scenery="suppressed" data-home-physical-base="authored-coherent-world" data-home-visual-ownership="three-dimensional-geometry" data-home-desktop-mobile-world="same-scene" data-home-embodied-self="privacy-preserving-shadow" data-home-movement="walk-keyboard-click-touch" data-home-pointer-lock="false" data-home-audio="production-opus-consent-controlled" data-home-assets-ready={ready ? "true" : "false"} data-home-runtime-assets="home-entry-chamber-v1.glb polyhaven-fern-02-geometry-v1.glb local-three-dimensional-terrain living-orb reflecting-water" data-home-authored-regions="home-sanctuary-geometry home-mountain-horizon home-living-vegetation home-reflecting-water" data-home-nearby={nearby ?? "none"} data-home-camera-mode={groundDescent ? "descent" : phase === "ASCENT" ? "ascent" : dragging ? "look" : "embodied-first-person"} data-home-scene-phase={groundDescent ? "GROUND_DESCENT" : phase} data-home-ascent-progress={phase === "ASCENT" ? progress.toFixed(3) : "0.000"} data-home-input-locked={transitioning || inputLocked ? "true" : "false"} data-home-portal-sequence={transitionSequence} data-home-portal-lifecycle="environmental-approach-traversal-arrival" data-home-review-fixture={reviewFixture} data-home-orb-state={orbState} data-home-orb-clip={ORB_CLIPS[orbState]} data-home-animation-owner={HOME_SCANNED_COMPOSITION_V1} data-testid="home-visible-navigable-sanctuary-world" style={{ position: "relative", overflow: "hidden", background: "#061015" }} {...look}>
      <CinematicBackdrop />
      <div style={{ position: "absolute", inset: 0, zIndex: 1 }}>
        <Canvas className={styles.canvas} dpr={[1, 1.3]} shadows camera={{ position: [0, 1.7, 8], fov: 50, near: 0.05, far: 300 }} gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }} onCreated={({ gl }) => { gl.outputColorSpace = THREE.SRGBColorSpace; gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.06; gl.shadowMap.type = THREE.PCFSoftShadowMap; gl.setClearColor(0x000000, 0); setCanvasReady(true); }}>
          <HomeScene input={input} yaw={yaw} pitch={pitch} target={target} avatar={avatar} onNearby={setNearby} onOrbOpen={openOrb} onGround={startGroundDescent} onGroundComplete={finishGroundDescent} onLifeMap={startLifeMapAscent} onSceneReady={() => setSceneReady(true)} groundDescent={groundDescent} reducedMotion={reducedMotion} />
        </Canvas>
      </div>
      <header className={styles.brand} aria-label="URAI" style={{ zIndex: 3 }}><strong>URAI</strong></header>
      {context ? <div className={`${styles.worldHint} home-world-context`} data-home-world-context data-home-world-context-for={nearby ?? phase} role="status" aria-live="polite" style={{ zIndex: 3 }}>{context}</div> : null}
      {!transitioning && mobileControls ? <MobileMovementPad input={input} label="Home movement controls" /> : null}
      <span className="sr-only" data-testid="urai-home-webgl-orb">The authored Orb companion is physically present in the Home environment.</span>
      <span className="sr-only" data-testid="urai-home-embodied-avatar">Your privacy-preserving embodied presence is represented without fabricating personal identity.</span>
      <span className="sr-only">Ground is reached by the descending natural path. Life Map is reached through the sky ascent. The Orb remains directly accessible.</span>
    </main>
  );
}