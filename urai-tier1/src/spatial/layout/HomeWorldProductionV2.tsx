"use client";

import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { ContactShadows, Stars, useGLTF } from "@react-three/drei";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import * as THREE from "three";
import { MobileMovementPad, stepEmbodiedMotion, useDragLook, useMovementInput, type MovementInput } from "@/spatial/navigation/EmbodiedNavigation";
import { useSceneStore } from "@/spatial/store/useSceneStore";
import { requestUraiWorldOrbOpen, requestUraiWorldTravel } from "@/spatial/world/worldEvents";
import styles from "./HomeWorldProduction.module.css";

const HOME_PROVIDER_ENVIRONMENT = "/assets/urai/replay/replay-memory-film-main.webp";
const HOME_SANCTUARY_MODEL = "/assets/urai/generated/models/home-entry-chamber-v1.glb";
const HOME_ORB_MODEL = "/assets/urai/generated/models/urai-orb-avatar-v1.glb";
const HOME_FERN_MODEL = "/assets/urai/home-production/cc0/polyhaven-fern-02-geometry-v1.glb";
const HOME_BOUNDS = { minX: -12.5, maxX: 12.5, minZ: -15.5, maxZ: 10.5 };
const SPAWN = new THREE.Vector3(0, 0, 7.8);
const ORB = new THREE.Vector3(0, 1.35, -2.85);
const GROUND_THRESHOLD = new THREE.Vector3(-4.9, 0, -7.2);
const LIFE_MAP_LOOKOUT = new THREE.Vector3(4.9, 0, -7.2);
const ORB_CLIPS = { dormant: "Orb_Resting", idle: "Orb_Idle", attention: "Orb_Attention", listening: "Orb_Listening", thinking: "Orb_Thinking", speaking: "Orb_Speaking", guiding: "Orb_Guiding", reflecting: "Orb_Reflecting", calming: "Orb_Calming", privacy: "Orb_Privacy", warning: "Orb_Degraded", transition: "Orb_Transition" } as const;

type OrbState = keyof typeof ORB_CLIPS;
type Nearby = "orb" | "ground" | "life-map" | null;
type Props = { onOrbOpen?: () => void; webglAvailable?: boolean };

function terrainHeight(x: number, z: number) {
  const broad = Math.sin(x * .09) * .18 + Math.cos(z * .075) * .14 + Math.sin((x + z) * .045) * .09;
  const detail = Math.sin(x * .4 + z * .18) * .025 + Math.cos(z * .31 - x * .16) * .022;
  const clearing = -Math.exp(-((x / 8.7) ** 2 + ((z + 1.8) / 10.4) ** 2)) * .24;
  return broad + detail + clearing - .13;
}

function makeTerrain() {
  const geometry = new THREE.PlaneGeometry(82, 82, 220, 220);
  geometry.rotateX(-Math.PI / 2);
  const position = geometry.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(position.count * 3);
  const low = new THREE.Color("#263f32");
  const high = new THREE.Color("#52705a");
  const color = new THREE.Color();
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i), z = position.getZ(i), y = terrainHeight(x, z);
    position.setY(i, y);
    const variation = THREE.MathUtils.clamp(.46 + Math.sin(x * .17) * .08 + Math.cos(z * .14) * .08 + y * .08, 0, 1);
    color.copy(low).lerp(high, variation);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}

const TERRAIN = makeTerrain();

function prepareAuthoredSanctuary(source: THREE.Object3D) {
  const world = source.clone(true);
  const rejected = /portal|ring|threshold|village|mannequin|avatar|debug|marker|label|embodied|presence|memory-place-anchor|living-growth/i;
  const rejectedForgeForms = /vault|monolith|bridge|grove|firefly|alcove|veil|waterfall|mountain|vegetation|tree|sculpture/i;
  world.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.visible = !rejected.test(object.name) && !rejectedForgeForms.test(object.name);
    if (!object.visible) return;
    const name = object.name.toLowerCase();
    const stone = /basin|pedestal|path|ground|terrain|stone/.test(name);
    object.material = new THREE.MeshStandardMaterial({
      color: stone ? "#64736a" : "#455b50",
      roughness: stone ? .9 : .96,
      metalness: 0,
    });
    object.castShadow = true;
    object.receiveShadow = true;
  });
  world.name = "home-retained-authored-sanctuary";
  world.userData.geometryOwner = "home-entry-chamber-v1.glb";
  world.userData.suppressedForgeScenery = true;
  world.userData.suppressedPortalProps = true;
  return world;
}

function WorldGeometry({ target }: { target: MutableRefObject<THREE.Vector3 | null> }) {
  const sanctuary = useGLTF(HOME_SANCTUARY_MODEL);
  const authored = useMemo(() => prepareAuthoredSanctuary(sanctuary.scene), [sanctuary.scene]);
  const walk = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    if (useSceneStore.getState().inputLocked) return;
    target.current = new THREE.Vector3(
      THREE.MathUtils.clamp(event.point.x, HOME_BOUNDS.minX, HOME_BOUNDS.maxX),
      0,
      THREE.MathUtils.clamp(event.point.z, HOME_BOUNDS.minZ, HOME_BOUNDS.maxZ),
    );
  };
  return (
    <group name="home-authored-terrain" userData={{ geometryOwner: "retained-sanctuary-plus-continuous-natural-terrain", primitiveScenery: false }}>
      <primitive object={authored} />
      <mesh name="home-natural-terrain" geometry={TERRAIN} receiveShadow onClick={walk}>
        <meshStandardMaterial vertexColors roughness={.98} metalness={0} />
      </mesh>
      <mesh name="home-walkable-navigation-surface" rotation={[-Math.PI / 2, 0, 0]} position={[0, .55, -2]} onClick={walk}>
        <planeGeometry args={[25, 28]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
    </group>
  );
}

const FERN_PATCHES = [
  [-7.4,-4.9,.82,-.3],[-6.3,-7.4,1.08,.7],[-5.1,-10.2,.9,1.8],[-3.8,-3.7,.72,-1.4],[-3.1,-8.8,1.16,2.3],[-2.2,-11.6,.86,.2],
  [2.3,-4.1,.8,.9],[3.2,-9.4,1.12,-.6],[4.1,-11.1,.88,1.4],[5.6,-4.8,.76,2.6],[6.5,-8.2,1.04,-1.8],[7.2,-10.7,.9,.4],
  [-8,.8,.8,1.1],[-5.8,2.6,.72,-2.2],[5.9,2.1,.78,2],[7.8,.2,.86,-.8],
] as const;

function Nature() {
  const source = useGLTF(HOME_FERN_MODEL);
  const materials = useMemo(() => ["#648965", "#739a72", "#55795b"].map((color) => new THREE.MeshStandardMaterial({ color, roughness: .94, side: THREE.DoubleSide })), []);
  useEffect(() => () => materials.forEach((material) => material.dispose()), [materials]);
  const objects = useMemo(() => FERN_PATCHES.map(([x, z, scale, rotation], index) => {
    const object = source.scene.clone(true);
    object.name = `home-scanned-fern-${index + 1}`;
    object.position.set(x, terrainHeight(x, z) + .02, z);
    object.rotation.y = rotation;
    object.scale.setScalar(scale);
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = materials[index % materials.length];
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return object;
  }), [source.scene, materials]);
  return <group name="home-living-vegetation" userData={{ geometryOwner: "polyhaven-fern-02-geometry-v1.glb" }}>{objects.map((object) => <primitive key={object.name} object={object} />)}</group>;
}

function ReflectingWater() {
  return <group name="home-reflecting-water" position={[4.9, terrainHeight(4.9, -7.2) + .018, -7.2]}><mesh rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[2.35, 64]} /><meshPhysicalMaterial color="#173f42" roughness={.1} metalness={0} clearcoat={1} clearcoatRoughness={.12} transparent opacity={.72} /></mesh></group>;
}

function AuthoredOrb({ onOpen, reducedMotion, state }: { onOpen: () => void; reducedMotion: boolean; state: OrbState }) {
  const source = useGLTF(HOME_ORB_MODEL);
  const object = useMemo(() => {
    const clone = source.scene.clone(true);
    clone.scale.setScalar(.115);
    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return clone;
  }, [source.scene]);
  const root = useRef<THREE.Group>(null);
  const light = useRef<THREE.PointLight>(null);
  const mixer = useRef<THREE.AnimationMixer | null>(null);
  useEffect(() => {
    const nextMixer = new THREE.AnimationMixer(object);
    mixer.current = nextMixer;
    const clip = THREE.AnimationClip.findByName(source.animations, ORB_CLIPS[state]);
    const action = clip ? nextMixer.clipAction(clip) : null;
    if (action) {
      action.reset();
      action.enabled = true;
      action.setEffectiveWeight(1);
      action.setEffectiveTimeScale(reducedMotion ? .2 : 1);
      action.play();
    }
    return () => {
      action?.stop();
      nextMixer.stopAllAction();
      nextMixer.uncacheRoot(object);
      if (mixer.current === nextMixer) mixer.current = null;
    };
  }, [object, reducedMotion, source.animations, state]);
  useFrame(({ clock }, delta) => {
    mixer.current?.update(delta);
    if (reducedMotion) return;
    const breathe = 1 + Math.sin(clock.elapsedTime * .82) * .012;
    root.current?.scale.setScalar(breathe);
    if (light.current) light.current.intensity = .72 + Math.sin(clock.elapsedTime * .82) * .07;
  });
  return <group ref={root} name="home-orb-sanctuary" position={ORB} onClick={(event) => { event.stopPropagation(); onOpen(); }} userData={{ geometryOwner: "urai-orb-avatar-v1.glb", primitiveSphere: false }}><primitive object={object} /><pointLight ref={light} color="#9ad1cb" intensity={.72} distance={4.6} decay={2} /></group>;
}

function Presence({ root }: { root: MutableRefObject<THREE.Group | null> }) {
  return <group ref={root} name="home-authored-embodied-self" position={SPAWN}><mesh position={[0, .01, .25]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[.32, 32]} /><meshBasicMaterial color="#07100c" transparent opacity={.045} depthWrite={false} /></mesh></group>;
}

function Landmarks({ onGround, onLifeMap }: { onGround: () => void; onLifeMap: () => void }) {
  return <><group name="home-ground-environmental-threshold" position={GROUND_THRESHOLD}><mesh position={[0, .7, 0]} onClick={(event) => { event.stopPropagation(); onGround(); }}><boxGeometry args={[3.8, 2.4, 3.8]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} /></mesh></group><group name="home-life-map-sky-lookout" position={LIFE_MAP_LOOKOUT}><mesh position={[0, .7, 0]} onClick={(event) => { event.stopPropagation(); onLifeMap(); }}><boxGeometry args={[3.8, 2.4, 3.8]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} /></mesh></group><group name="home-mountain-horizon" /><group name="home-sanctuary-pavilion" /><group name="home-sanctuary-path" /></>;
}

function Rig({ input, yaw, pitch, target, avatar, onNearby, groundDescent, onGroundComplete, reducedMotion }: { input: MovementInput; yaw: MutableRefObject<number>; pitch: MutableRefObject<number>; target: MutableRefObject<THREE.Vector3 | null>; avatar: MutableRefObject<THREE.Group | null>; onNearby: (nearby: Nearby) => void; groundDescent: boolean; onGroundComplete: () => void; reducedMotion: boolean }) {
  const { camera, size } = useThree();
  const pos = useRef(SPAWN.clone()), vel = useRef(new THREE.Vector3()), last = useRef<Nearby>(null), groundStart = useRef<number | null>(null), groundCameraStart = useRef<THREE.Vector3 | null>(null), groundDone = useRef(false), ascentStart = useRef<number | null>(null), ascentCameraStart = useRef<THREE.Vector3 | null>(null), ascentDone = useRef(false);
  const place = useCallback(() => {
    const portrait = size.height > size.width;
    camera.position.copy(pos.current).add(new THREE.Vector3(0, portrait ? 1.62 : 1.7, .12));
    const forward = new THREE.Vector3(Math.sin(yaw.current), 0, -Math.cos(yaw.current));
    const look = pos.current.clone().addScaledVector(forward, portrait ? 6.5 : 8.8);
    camera.lookAt(look.x, .68 + pitch.current, look.z);
  }, [camera, pitch, size.height, size.width, yaw]);
  useLayoutEffect(() => place(), [place]);
  useFrame(({ clock }, delta) => {
    const store = useSceneStore.getState();
    if (groundDescent) {
      if (groundStart.current === null) {
        groundStart.current = clock.elapsedTime;
        groundCameraStart.current = camera.position.clone();
      }
      const t = THREE.MathUtils.clamp((clock.elapsedTime - groundStart.current) / (reducedMotion ? .45 : 2.8), 0, 1);
      camera.position.lerpVectors(groundCameraStart.current ?? camera.position, new THREE.Vector3(-3.8, -3.2, -13.7), t);
      camera.lookAt(-4.8, -1, -13.2);
      store.setProgress(t);
      if (t >= 1 && !groundDone.current) { groundDone.current = true; onGroundComplete(); }
      return;
    }
    groundStart.current = null;
    groundCameraStart.current = null;
    groundDone.current = false;
    if (store.phase === "ASCENT") {
      if (ascentStart.current === null) {
        ascentStart.current = clock.elapsedTime;
        ascentCameraStart.current = camera.position.clone();
      }
      const t = THREE.MathUtils.clamp((clock.elapsedTime - ascentStart.current) / (reducedMotion ? .45 : 3.6), 0, 1);
      camera.position.lerpVectors(ascentCameraStart.current ?? camera.position, new THREE.Vector3(0, 48, -57), t);
      camera.lookAt(0, 46, -76);
      store.setProgress(t);
      if (t >= 1 && !ascentDone.current) {
        ascentDone.current = true;
        requestUraiWorldTravel({ destination: "life-map", href: "/life-map/?from=home-sky", entryPortal: "home-sky", cameraCheckpoint: "home-sky-ascent-complete" });
      }
      return;
    }
    ascentStart.current = null;
    ascentCameraStart.current = null;
    ascentDone.current = false;
    stepEmbodiedMotion({ delta, input, yaw: yaw.current, position: pos.current, velocity: vel.current, target, bounds: HOME_BOUNDS, speed: 3.1, acceleration: 9, deceleration: 12 });
    if (avatar.current) { avatar.current.position.copy(pos.current); avatar.current.rotation.y = yaw.current; }
    place();
    const choices: readonly [Nearby, THREE.Vector3, number][] = [["orb", ORB, 3.15], ["ground", GROUND_THRESHOLD, 2.55], ["life-map", LIFE_MAP_LOOKOUT, 2.55]];
    let next: Nearby = null, best = Infinity;
    for (const [name, point, radius] of choices) {
      const distance = Math.hypot(pos.current.x - point.x, pos.current.z - point.z);
      if (distance < radius && distance < best) { next = name; best = distance; }
    }
    if (next !== last.current) { last.current = next; onNearby(next); }
  });
  return null;
}

function Scene({ input, yaw, pitch, target, avatar, onNearby, onOrb, onGround, onGroundComplete, onLifeMap, onReady, groundDescent, reducedMotion, orbState }: any) {
  const phase = useSceneStore((state) => state.phase);
  const cosmic = phase === "ASCENT";
  const frames = useRef(0);
  useFrame(() => { frames.current += 1; if (frames.current === 5) onReady(); });
  return <><color attach="background" args={[cosmic ? "#01050b" : "#243c3a"]} />{cosmic ? <Stars radius={190} depth={90} count={2500} factor={2.8} saturation={.12} fade speed={reducedMotion ? 0 : .018} /> : null}<fogExp2 attach="fog" args={[cosmic ? "#050b14" : "#243c3a", cosmic ? .0017 : .022]} /><ambientLight intensity={cosmic ? .12 : .68} color="#dce7dd" /><hemisphereLight args={["#dce7df", "#1e2d21", cosmic ? .2 : 1.12]} /><directionalLight position={[8, 16, 7]} intensity={cosmic ? .32 : 2.55} color="#f5f2df" castShadow /><WorldGeometry target={target} /><Nature /><ReflectingWater /><AuthoredOrb onOpen={onOrb} reducedMotion={reducedMotion} state={orbState} /><Presence root={avatar} /><Landmarks onGround={onGround} onLifeMap={onLifeMap} /><Rig input={input} yaw={yaw} pitch={pitch} target={target} avatar={avatar} onNearby={onNearby} groundDescent={groundDescent} onGroundComplete={onGroundComplete} reducedMotion={reducedMotion} />{!cosmic ? <ContactShadows position={[0, -.08, -2.5]} opacity={.14} scale={30} blur={6} far={16} resolution={512} frames={1} /> : null}</>;
}

export function HomeWorldProductionV2({ onOrbOpen = requestUraiWorldOrbOpen, webglAvailable = true }: Props) {
  const [canvasReady, setCanvasReady] = useState(false), [sceneReady, setSceneReady] = useState(false), [nearby, setNearby] = useState<Nearby>(null), [dragging, setDragging] = useState(false), [reviewFixture, setReviewFixture] = useState("none"), [orbState, setOrbState] = useState<OrbState>("idle"), [groundDescent, setGroundDescent] = useState(false), [reducedMotion, setReducedMotion] = useState(false), [mobileControls, setMobileControls] = useState(false);
  const phase = useSceneStore((state) => state.phase), progress = useSceneStore((state) => state.progress), inputLocked = useSceneStore((state) => state.inputLocked);
  const yaw = useRef(0), pitch = useRef(-.045), target = useRef<THREE.Vector3 | null>(null), avatar = useRef<THREE.Group | null>(null);
  const openOrb = useCallback(() => { if (!useSceneStore.getState().inputLocked && !groundDescent) onOrbOpen(); }, [groundDescent, onOrbOpen]);
  const startGround = useCallback(() => { if (useSceneStore.getState().inputLocked || groundDescent) return; target.current = null; setOrbState("transition"); setGroundDescent(true); }, [groundDescent]);
  const finishGround = useCallback(() => requestUraiWorldTravel({ destination: "infrastructure-hub", href: "/ground/", entryPortal: "home-ground", cameraCheckpoint: "home-ground-descent" }), []);
  const startLife = useCallback(() => { const state = useSceneStore.getState(); if (state.inputLocked || groundDescent || state.phase === "ASCENT") return; target.current = null; setOrbState("transition"); state.enterLifeMap(); }, [groundDescent]);
  const cancelTransition = useCallback(() => {
    const state = useSceneStore.getState();
    if (!groundDescent && state.phase !== "ASCENT") return;
    target.current = null;
    setGroundDescent(false);
    setOrbState("idle");
    state.setPhase("HOME");
    state.setProgress(0);
    state.unlock();
  }, [groundDescent]);
  const interact = useCallback(() => { if (nearby === "orb") openOrb(); else if (nearby === "ground") startGround(); else if (nearby === "life-map") startLife(); }, [nearby, openOrb, startGround, startLife]);
  const input = useMovementInput({ enabled: true, onInteract: interact, onEscape: cancelTransition, onReset: () => { yaw.current = 0; pitch.current = -.045; target.current = SPAWN.clone(); } });
  const look = useDragLook({ yaw, pitch, enabled: !groundDescent && phase !== "ASCENT", sensitivity: .0031, minPitch: -.55, maxPitch: .68, onDragState: setDragging });
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    setReviewFixture(query.get("homePrivateFixture") === "1" ? "safe-private" : "none");
    const state = query.get("homeOrbState");
    if (state && state in ORB_CLIPS) setOrbState(state as OrbState);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)"), mobile = window.matchMedia("(pointer: coarse), (max-width: 700px)");
    const apply = () => { setReducedMotion(reduced.matches); setMobileControls(mobile.matches); };
    apply();
    reduced.addEventListener?.("change", apply);
    mobile.addEventListener?.("change", apply);
    return () => { reduced.removeEventListener?.("change", apply); mobile.removeEventListener?.("change", apply); };
  }, []);
  if (!webglAvailable) return null;
  const ready = canvasReady && sceneReady, transitioning = phase === "ASCENT" || groundDescent;
  const context = phase === "ASCENT" ? "Ascending through the sky" : groundDescent ? "Descending into Ground" : nearby === "orb" ? "The Orb is here" : nearby === "ground" ? "The path descends" : nearby === "life-map" ? "Look to the sky" : null;
  return <main className={`${styles.world} urai-asset-home-world`} data-urai-home-production data-urai-true-3d="true" data-home-primary-owner="asset-driven" data-home-real-world-first="true" data-home-visible-world="authored-coherent-three-dimensional-sanctuary" data-home-world-character="believable-natural-inhabitable-environment" data-home-visible-portals="false" data-home-transition-affordances="ground-environmental-descent life-map-sky-lookout" data-home-provider-environment={HOME_PROVIDER_ENVIRONMENT} data-home-provider-role="atmospheric-support-only" data-home-generated-scenery="suppressed" data-home-physical-base="authored-coherent-world" data-home-visual-ownership="three-dimensional-geometry" data-home-desktop-mobile-world="same-scene" data-home-embodied-self="privacy-preserving-shadow" data-home-movement="walk-keyboard-click-touch" data-home-pointer-lock="false" data-home-audio="production-opus-consent-controlled" data-home-assets-ready={ready ? "true" : "false"} data-home-runtime-assets="home-entry-chamber-v1.glb polyhaven-fern-02-geometry-v1.glb urai-orb-avatar-v1.glb continuous-natural-terrain-field" data-home-authored-regions="home-retained-authored-sanctuary home-natural-terrain home-living-vegetation home-reflecting-water" data-home-nearby={nearby ?? "none"} data-home-camera-mode={groundDescent ? "descent" : phase === "ASCENT" ? "ascent" : dragging ? "look" : "embodied-first-person"} data-home-scene-phase={groundDescent ? "GROUND_DESCENT" : phase} data-home-ascent-progress={phase === "ASCENT" ? progress.toFixed(3) : "0.000"} data-home-input-locked={transitioning || inputLocked ? "true" : "false"} data-home-portal-sequence={groundDescent ? "ground:traversal" : phase === "ASCENT" ? "life-map:traversal" : "idle"} data-home-portal-lifecycle="environmental-approach-traversal-arrival" data-home-review-fixture={reviewFixture} data-home-orb-state={orbState} data-home-orb-clip={ORB_CLIPS[orbState]} data-home-animation-owner="retained-sanctuary-cc0-nature-authored-orb" data-testid="home-visible-navigable-sanctuary-world" style={{ position: "relative", overflow: "hidden", background: "#243c3a" }} {...look}><div style={{ position: "absolute", inset: 0, zIndex: 1 }}><Canvas className={styles.canvas} dpr={[1, 1.3]} shadows camera={{ position: [0, 1.7, 8], fov: 50, near: .05, far: 320 }} gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }} onCreated={({ gl }) => { gl.outputColorSpace = THREE.SRGBColorSpace; gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.12; gl.shadowMap.type = THREE.PCFSoftShadowMap; gl.setClearColor(0x243c3a, 1); setCanvasReady(true); }}><Scene input={input} yaw={yaw} pitch={pitch} target={target} avatar={avatar} onNearby={setNearby} onOrb={openOrb} onGround={startGround} onGroundComplete={finishGround} onLifeMap={startLife} onReady={() => setSceneReady(true)} groundDescent={groundDescent} reducedMotion={reducedMotion} orbState={orbState} /></Canvas></div><header className={styles.brand} aria-label="URAI" style={{ zIndex: 3 }}><strong>URAI</strong></header>{context ? <div className={`${styles.worldHint} home-world-context`} data-home-world-context data-home-world-context-for={nearby ?? phase} role="status" aria-live="polite" style={{ zIndex: 3 }}>{context}</div> : null}{!transitioning && mobileControls ? <MobileMovementPad input={input} label="Home movement controls" /> : null}<span className="sr-only" data-testid="urai-home-webgl-orb">The authored Orb companion is physically present in the Home environment.</span><span className="sr-only" data-testid="urai-home-embodied-avatar">Your privacy-preserving embodied presence is represented without fabricating personal identity.</span></main>;
}
