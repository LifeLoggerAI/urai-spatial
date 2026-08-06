"use client";

import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Float, Sparkles, Stars, useAnimations, useGLTF } from "@react-three/drei";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
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
const ORB = new THREE.Vector3(0, 1.35, -0.65);
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
type PortalSequence = "idle" | "traversal";

const HomeOrbStateContext = createContext<OrbState>("idle");

type HomeWorldProductionProps = {
  onOrbOpen?: () => void;
  webglAvailable?: boolean;
};

function prepareModel(source: THREE.Object3D) {
  source.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.castShadow = true;
    object.receiveShadow = true;
    object.frustumCulled = true;
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

function HomeEnvironment({ walkTarget }: { walkTarget: MutableRefObject<THREE.Vector3 | null> }) {
  const { scene, animations } = useGLTF(HOME_MODEL);
  const root = useRef<THREE.Group>(null);
  const world = useMemo(() => {
    const clone = bindHomeAuthoredRegions(prepareModel(scene.clone(true)));
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
    <group
      ref={root}
      name="home-authored-terrain"
      userData={{ runtimeAsset: HOME_MODEL, authoredRegions: ["home-mountain-horizon", "home-lantern-village"] }}
    >
      <primitive object={world} />
      <mesh
        name="home-walkable-navigation-surface"
        userData={{ interactionRole: "walkable-surface" }}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.08, 0]}
        onClick={onWalk}
      >
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
  const orb = useMemo(() => prepareModel(scene.clone(true)), [scene]);
  const { actions } = useAnimations(animations, root);
  const clip = ORB_CLIPS[state];
  useEffect(() => {
    const action = actions[clip] || actions.Orb_Idle || actions.Orb_Resting;
    action?.reset().fadeIn(0.35).play();
    return () => { action?.fadeOut(0.2); };
  }, [actions, clip]);
  return (
    <group
      ref={root}
      name="home-orb-sanctuary"
      userData={{ runtimeAsset: ORB_MODEL, semanticOwner: "urai-home-webgl-orb", clip }}
      position={ORB}
      raycast={interactive ? undefined : DISABLED_RAYCAST}
      onClick={(event) => { event.stopPropagation(); onOpen(); }}
    >
      <Float speed={1.05} rotationIntensity={0.12} floatIntensity={0.24}>
        <primitive object={orb} />
      </Float>
      <pointLight color="#8fe8ff" intensity={12} distance={15} decay={2} />
    </group>
  );
}

function EmbodiedSelf({ root: outerRoot }: { root: MutableRefObject<THREE.Group | null> }) {
  const { scene, animations } = useGLTF(HOME_MODEL);
  const animationRoot = useRef<THREE.Group>(null);
  const avatar = useMemo(() => {
    const source = scene.getObjectByName("embodied-presence-root");
    if (!source) throw new Error("Authored Home is missing embodied-presence-root.");
    const clone = prepareModel(source.clone(true));
    clone.position.set(0, 0, 0);
    clone.rotation.set(0, 0, 0);
    clone.scale.setScalar(0.92);
    clone.userData.semanticOwner = "urai-home-embodied-avatar";
    return clone;
  }, [scene]);
  const { actions } = useAnimations(animations, animationRoot);
  useEffect(() => {
    const action = actions.Presence_Idle;
    action?.reset().fadeIn(0.35).play();
    return () => { action?.fadeOut(0.2); };
  }, [actions]);
  return (
    <group ref={outerRoot} name="home-authored-embodied-self" userData={{ semanticOwner: "urai-home-embodied-avatar" }} position={SPAWN}>
      <group ref={animationRoot}>
        <primitive object={avatar} />
      </group>
    </group>
  );
}

function WorldPortal({ type, position, onEnter }: { type: "ground" | "life-map"; position: THREE.Vector3; onEnter: () => void }) {
  const interactive = !useSceneStore((store) => store.inputLocked);
  const { scene, animations } = useGLTF(PORTAL_MODEL);
  const root = useRef<THREE.Group>(null);
  const portal = useMemo(() => prepareModel(scene.clone(true)), [scene]);
  const { actions } = useAnimations(animations, root);
  useEffect(() => {
    const action = actions.Portal_Available || actions.Portal_Closed;
    action?.reset().fadeIn(0.3).play();
    return () => { action?.fadeOut(0.2); };
  }, [actions]);
  return (
    <group
      ref={root}
      name={`home-${type}-portal-world-owned`}
      userData={{ runtimeAsset: PORTAL_MODEL, destination: type }}
      position={position}
      scale={type === "life-map" ? 0.84 : 0.78}
      raycast={interactive ? undefined : DISABLED_RAYCAST}
      onClick={(event) => {
        event.stopPropagation();
        onEnter();
      }}
    >
      <primitive object={portal} />
      <pointLight color={type === "ground" ? "#b18cff" : "#f5cf78"} intensity={8} distance={12} decay={2} />
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

function PlayerRig({ input, yaw, pitch, target, avatar, onNearby }: { input: MovementInput; yaw: MutableRefObject<number>; pitch: MutableRefObject<number>; target: MutableRefObject<THREE.Vector3 | null>; avatar: MutableRefObject<THREE.Group | null>; onNearby: (value: Nearby) => void }) {
  const { camera } = useThree();
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

  useFrame(({ clock }, delta) => {
    const scene = useSceneStore.getState();
    if (scene.phase === "ASCENT") {
      if (ascentStartedAt.current === null) {
        ascentStartedAt.current = clock.elapsedTime;
        ascentCameraStart.current.copy(camera.position);
        ascentLookStart.current.set(position.current.x, 1.25 + pitch.current, position.current.z - 1.7);
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
    if (avatar.current) {
      avatar.current.position.copy(position.current);
      avatar.current.rotation.y = yaw.current;
    }
    cameraOffset.current.set(0, 3.15 + pitch.current * 1.35, 7.2).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw.current);
    cameraDesired.current.copy(position.current).add(cameraOffset.current);
    camera.position.lerp(cameraDesired.current, 1 - Math.pow(0.0009, delta));
    camera.lookAt(position.current.x, 1.25 + pitch.current, position.current.z - 1.7);
    const distances: readonly [Nearby, THREE.Vector3, number][] = [["orb", ORB, 1.8], ["ground", GROUND_PORTAL, 2.2], ["life-map", LIFE_MAP_PORTAL, 2.2]];
    let next: Nearby = null;
    let best = Infinity;
    for (const [name, point, radius] of distances) {
      const distance = Math.hypot(position.current.x - point.x, position.current.z - point.z);
      if (distance < radius && distance < best) { next = name; best = distance; }
    }
    if (next !== lastNearby.current) {
      lastNearby.current = next;
      onNearby(next);
    }
  });
  return null;
}

function SceneReadiness({ onReady }: { onReady: () => void }) {
  const frames = useRef(0);
  const reported = useRef(false);
  useFrame(() => {
    frames.current += 1;
    if (reported.current || frames.current < 3) return;
    reported.current = true;
    onReady();
  });
  return null;
}

function HomeScene({ input, yaw, pitch, target, avatar, onNearby, onOrbOpen, onGround, onLifeMap, orbState, onSceneReady }: { input: MovementInput; yaw: MutableRefObject<number>; pitch: MutableRefObject<number>; target: MutableRefObject<THREE.Vector3 | null>; avatar: MutableRefObject<THREE.Group | null>; onNearby: (value: Nearby) => void; onOrbOpen: () => void; onGround: () => void; onLifeMap: () => void; orbState: OrbState; onSceneReady: () => void; }) {
  return (
    <>
      <color attach="background" args={["#05080f"]} />
      <fogExp2 attach="fog" args={["#121827", 0.022]} />
      <ambientLight intensity={0.42} color="#c8dcff" />
      <hemisphereLight args={["#d9edff", "#080608", 1.25]} />
      <directionalLight position={[-8, 18, 10]} intensity={4.8} color="#ffd5a0" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-far={90} />
      <pointLight position={[0, 9, -10]} color="#ffb56d" intensity={7} distance={42} decay={2} />
      <Stars radius={110} depth={74} count={1700} factor={2.1} saturation={0.16} fade speed={0.045} />
      <Sparkles count={180} scale={[25, 12, 30]} position={[0, 4, -5]} size={1.25} speed={0.1} opacity={0.24} color="#ffe7b6" />
      <SceneReadiness onReady={onSceneReady} />
      <PlayerRig input={input} yaw={yaw} pitch={pitch} target={target} avatar={avatar} onNearby={onNearby} />
      <HomeEnvironment walkTarget={target} />
      <EmbodiedSelf root={avatar} />
      <HomeOrbStateContext.Provider value={orbState}>
        <OrbSanctuary onOpen={onOrbOpen} />
      </HomeOrbStateContext.Provider>
      <WorldPortal type="ground" position={GROUND_PORTAL} onEnter={onGround} />
      <WorldPortal type="life-map" position={LIFE_MAP_PORTAL} onEnter={onLifeMap} />
      <EffectComposer multisampling={0}>
        <Bloom intensity={1.28} luminanceThreshold={0.58} luminanceSmoothing={0.28} mipmapBlur />
        <Vignette eskil={false} offset={0.15} darkness={0.48} />
      </EffectComposer>
    </>
  );
}

export function HomeWorldProduction({ onOrbOpen = requestUraiWorldOrbOpen, webglAvailable = true }: HomeWorldProductionProps) {
  const [canvasReady, setCanvasReady] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const [nearby, setNearby] = useState<Nearby>(null);
  const [dragging, setDragging] = useState(false);
  const [assetMode, setAssetMode] = useState("ready");
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

  const beginPortalTravel = useCallback((travel: () => void) => {
    if (useSceneStore.getState().inputLocked) return;
    setPortalSequence("traversal");
    travel();
  }, []);
  const onGround = useCallback(() => beginPortalTravel(() => requestUraiWorldTravel({ destination: "infrastructure-hub", href: "/ground/", entryPortal: "home-ground", cameraCheckpoint: "home-ground-descent" })), [beginPortalTravel]);
  const onLifeMap = useCallback(() => beginPortalTravel(() => requestUraiWorldTravel({ destination: "life-map", href: "/life-map/?from=home-sky", entryPortal: "home-sky", cameraCheckpoint: "home-sky-ascent" })), [beginPortalTravel]);
  const openOrb = useCallback(() => {
    if (!useSceneStore.getState().inputLocked) onOrbOpen();
  }, [onOrbOpen]);
  const interaction = useCallback(() => {
    if (useSceneStore.getState().inputLocked) return;
    if (nearby === "orb") openOrb();
    if (nearby === "ground") onGround();
    if (nearby === "life-map") onLifeMap();
  }, [nearby, onGround, onLifeMap, openOrb]);
  const reset = useCallback(() => {
    yaw.current = 0;
    pitch.current = -0.08;
    target.current = SPAWN.clone();
    setPortalSequence("idle");
  }, []);
  const input = useMovementInput({ onInteract: interaction, onReset: reset });
  const look = useDragLook({ yaw, pitch, sensitivity: 0.0034, onDragState: setDragging });

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    setAssetMode(query.get("homeAssetReview") === "1" ? "disclosed-review-candidate" : "ready");
    setReviewFixture(query.get("homePrivateFixture") === "1" ? "safe-private" : "none");
    const requestedState = query.get("homeOrbState");
    if (requestedState && requestedState in ORB_CLIPS) setOrbState(requestedState as OrbState);
  }, []);

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
      data-home-asset-mode={assetMode}
      data-home-personalization-mode="private-personalized"
      data-home-review-fixture={reviewFixture}
      data-home-orb-state={orbState}
      data-home-orb-clip={orbClip}
      data-home-animation-owner="authored-sanctuary-plus-gltf-interactions"
      data-testid="home-visible-navigable-sanctuary-world"
      {...look}
    >
      <Canvas
        className={styles.canvas}
        shadows
        dpr={[1, 1.75]}
        camera={{ position: [0, 3.35, 14], fov: 48, near: 0.08, far: 180 }}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.08;
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
