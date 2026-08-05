"use client";

import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Float, Sparkles, Stars } from "@react-three/drei";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { useCallback, useMemo, useRef, useState, type MutableRefObject } from "react";
import * as THREE from "three";
import { MobileMovementPad, stepEmbodiedMotion, useDragLook, useMovementInput, type MovementInput } from "@/spatial/navigation/EmbodiedNavigation";
import { requestUraiWorldOrbOpen, requestUraiWorldTravel } from "@/spatial/world/worldEvents";
import styles from "./HomeWorldProduction.module.css";

const HOME_BOUNDS = { minX: -12, maxX: 12, minZ: -18, maxZ: 11 };
const SPAWN = new THREE.Vector3(0, 0, 8.5);
const ORB = new THREE.Vector3(0, 1.52, -4.2);
const GROUND_PORTAL = new THREE.Vector3(-6.1, 1.5, -10.5);
const LIFE_MAP_PORTAL = new THREE.Vector3(6.2, 4.6, -12.8);
type Nearby = "orb" | "ground" | "life-map" | "self" | null;

type HomeWorldProductionProps = {
  onOrbOpen?: () => void;
  webglAvailable?: boolean;
};

function makeTerrain() {
  const geometry = new THREE.PlaneGeometry(56, 76, 150, 190);
  geometry.rotateX(-Math.PI / 2);
  const position = geometry.attributes.position as THREE.BufferAttribute;
  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index);
    const z = position.getZ(index);
    const distance = Math.hypot(x * 0.78, z + 4);
    const valley = Math.exp(-Math.pow(x / 6.6, 2)) * 1.25;
    const broad = Math.sin(x * 0.22) * 0.55 + Math.cos(z * 0.17) * 0.62;
    const detail = Math.sin((x + z) * 0.64) * 0.16 + Math.cos((x - z) * 0.42) * 0.13;
    const rim = Math.max(0, distance - 8) * 0.14;
    position.setY(index, broad + detail + rim - valley - 1.15);
  }
  geometry.computeVertexNormals();
  return geometry;
}

function makeRiver() {
  return new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.2, -0.68, 10),
    new THREE.Vector3(-1.1, -0.72, 5.6),
    new THREE.Vector3(0.6, -0.82, 1.4),
    new THREE.Vector3(-0.4, -0.7, -3.6),
    new THREE.Vector3(1.25, -0.45, -9),
    new THREE.Vector3(0.2, -0.1, -18),
  ]);
}

function Terrain({ walkTarget }: { walkTarget: MutableRefObject<THREE.Vector3 | null> }) {
  const geometry = useMemo(makeTerrain, []);
  const river = useMemo(makeRiver, []);
  const onWalk = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    walkTarget.current = new THREE.Vector3(
      THREE.MathUtils.clamp(event.point.x, HOME_BOUNDS.minX, HOME_BOUNDS.maxX),
      0,
      THREE.MathUtils.clamp(event.point.z, HOME_BOUNDS.minZ, HOME_BOUNDS.maxZ),
    );
  };

  return (
    <group name="home-authored-terrain">
      <mesh geometry={geometry} receiveShadow onClick={onWalk}>
        <meshPhysicalMaterial color="#6c684c" roughness={0.93} metalness={0.02} clearcoat={0.08} />
      </mesh>
      <mesh position={[0, 0.03, 0]}>
        <tubeGeometry args={[river, 180, 0.29, 16, false]} />
        <meshPhysicalMaterial color="#7fd9ff" emissive="#6d8dff" emissiveIntensity={1.3} roughness={0.16} metalness={0.18} transparent opacity={0.86} />
      </mesh>
      <mesh position={[0, 0.08, 0]}>
        <tubeGeometry args={[river, 180, 0.055, 10, false]} />
        <meshBasicMaterial color="#fff0b2" transparent opacity={0.84} toneMapped={false} />
      </mesh>
    </group>
  );
}

function MountainRange() {
  const mountains = useMemo(() => Array.from({ length: 32 }, (_, index) => {
    const side = index % 2 === 0 ? -1 : 1;
    const row = Math.floor(index / 2);
    const x = side * (10.5 + (row % 5) * 2.5);
    const z = -8 - row * 2.1;
    const height = 4.8 + (index % 7) * 0.8;
    return { x, z, height, width: 3.6 + (index % 4) * 0.7 };
  }), []);
  return (
    <group name="home-mountain-horizon">
      {mountains.map((mountain, index) => (
        <mesh key={index} position={[mountain.x, mountain.height * 0.42 - 1.2, mountain.z]} scale={[mountain.width, mountain.height, mountain.width]} castShadow receiveShadow>
          <coneGeometry args={[1, 1, 32, 5]} />
          <meshStandardMaterial color={index % 3 === 0 ? "#44534d" : "#354842"} roughness={0.96} />
        </mesh>
      ))}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 12.4, 3.2, -12]}>
          <mesh rotation={[0, side * 0.05, 0]}>
            <planeGeometry args={[2.2, 7.8, 1, 1]} />
            <meshBasicMaterial color="#a8eaff" transparent opacity={0.52} depthWrite={false} />
          </mesh>
          <pointLight color="#83dfff" intensity={4.2} distance={13} decay={2} />
        </group>
      ))}
    </group>
  );
}

function Village() {
  const homes = useMemo(() => Array.from({ length: 22 }, (_, index) => {
    const side = index % 2 === 0 ? -1 : 1;
    const row = Math.floor(index / 2);
    return {
      x: side * (4.5 + (row % 4) * 1.55),
      z: 3.5 - row * 1.75,
      scale: 0.72 + (index % 3) * 0.13,
    };
  }), []);
  return (
    <group name="home-lantern-village">
      {homes.map((home, index) => (
        <group key={index} position={[home.x, -0.42, home.z]} scale={home.scale}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[1.25, 0.82, 1]} />
            <meshStandardMaterial color="#564936" roughness={0.88} />
          </mesh>
          <mesh position={[0, 0.72, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
            <coneGeometry args={[0.98, 0.78, 4]} />
            <meshStandardMaterial color="#2d312e" roughness={0.94} />
          </mesh>
          <mesh position={[0, 0.05, 0.51]}>
            <planeGeometry args={[0.3, 0.28]} />
            <meshBasicMaterial color="#ffd789" toneMapped={false} />
          </mesh>
          <pointLight position={[0, 0.08, 0.7]} color="#ffc56f" intensity={1.5} distance={3.8} decay={2} />
        </group>
      ))}
    </group>
  );
}

function EmbodiedSelf({ root }: { root: MutableRefObject<THREE.Group | null> }) {
  return (
    <group ref={root} name="home-authored-embodied-self" data-testid="urai-home-embodied-avatar">
      <mesh position={[0, 1.55, 0]} castShadow>
        <sphereGeometry args={[0.27, 40, 28]} />
        <meshStandardMaterial color="#2b241f" roughness={0.92} />
      </mesh>
      <mesh position={[0, 0.72, 0]} castShadow>
        <coneGeometry args={[0.72, 1.85, 48, 5, true]} />
        <meshPhysicalMaterial color="#172229" roughness={0.8} clearcoat={0.12} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.92, -0.03]} scale={[0.52, 0.9, 0.34]} castShadow>
        <capsuleGeometry args={[0.38, 0.82, 12, 28]} />
        <meshStandardMaterial color="#26363b" roughness={0.86} />
      </mesh>
    </group>
  );
}

function OrbSanctuary({ onOpen }: { onOpen: () => void }) {
  const root = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!root.current) return;
    root.current.rotation.y = clock.elapsedTime * 0.14;
    root.current.position.y = ORB.y + Math.sin(clock.elapsedTime * 0.72) * 0.11;
  });
  return (
    <group ref={root} name="home-orb-sanctuary" position={ORB} onClick={(event) => { event.stopPropagation(); onOpen(); }}>
      <Float speed={0.6} rotationIntensity={0.05} floatIntensity={0.15}>
        <mesh data-testid="urai-home-webgl-orb" castShadow>
          <sphereGeometry args={[0.76, 96, 72]} />
          <meshPhysicalMaterial color="#e7fbff" emissive="#8cb8ff" emissiveIntensity={1.8} transmission={0.46} thickness={1.4} roughness={0.04} clearcoat={1} iridescence={0.55} iridescenceIOR={1.25} />
        </mesh>
        {[1.04, 1.34, 1.68].map((scale, index) => (
          <mesh key={scale} scale={scale} rotation={[Math.PI / 2 + index * 0.34, index * 0.62, 0]}>
            <torusGeometry args={[0.76, 0.015 + index * 0.006, 12, 180]} />
            <meshBasicMaterial color={index === 1 ? "#f6d49f" : "#b9d5ff"} transparent opacity={0.48 - index * 0.08} toneMapped={false} />
          </mesh>
        ))}
        <pointLight color="#b8d8ff" intensity={10} distance={19} decay={2} />
      </Float>
      <mesh position={[0, -1.25, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.2, 3.2, 180]} />
        <meshBasicMaterial color="#f6cf8c" transparent opacity={0.3} toneMapped={false} />
      </mesh>
    </group>
  );
}

function WorldPortal({ type, position, onEnter }: { type: "ground" | "life-map"; position: THREE.Vector3; onEnter: () => void }) {
  const root = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!root.current) return;
    root.current.rotation.z = (type === "ground" ? 1 : -1) * clock.elapsedTime * 0.07;
  });
  const color = type === "ground" ? "#a578ff" : "#ffd894";
  return (
    <group ref={root} name={`home-${type}-portal-world-owned`} position={position} onClick={(event) => { event.stopPropagation(); onEnter(); }}>
      <mesh>
        <torusGeometry args={[1.45, 0.065, 24, 220]} />
        <meshBasicMaterial color={color} transparent opacity={0.78} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, -0.05]}>
        <circleGeometry args={[1.37, 128]} />
        <meshBasicMaterial color={color} transparent opacity={type === "ground" ? 0.15 : 0.1} toneMapped={false} />
      </mesh>
      {Array.from({ length: 18 }, (_, index) => {
        const angle = index / 18 * Math.PI * 2;
        return <mesh key={index} position={[Math.cos(angle) * 1.62, Math.sin(angle) * 1.62, 0]} scale={0.08 + index % 3 * 0.02}>
          <dodecahedronGeometry args={[1, 0]} />
          <meshBasicMaterial color={color} toneMapped={false} />
        </mesh>;
      })}
      <pointLight color={color} intensity={7} distance={15} decay={2} />
    </group>
  );
}

function PlayerRig({ input, yaw, pitch, target, avatar, onNearby }: {
  input: MovementInput;
  yaw: MutableRefObject<number>;
  pitch: MutableRefObject<number>;
  target: MutableRefObject<THREE.Vector3 | null>;
  avatar: MutableRefObject<THREE.Group | null>;
  onNearby: (value: Nearby) => void;
}) {
  const { camera } = useThree();
  const position = useRef(SPAWN.clone());
  const velocity = useRef(new THREE.Vector3());
  const cameraGoal = useRef(new THREE.Vector3());
  const lookGoal = useRef(new THREE.Vector3());
  const lastNearby = useRef<Nearby>(null);

  useFrame((_, delta) => {
    stepEmbodiedMotion({ position: position.current, velocity: velocity.current, input, target, yaw: yaw.current, delta, speed: 3.4, acceleration: 10, deceleration: 13, bounds: HOME_BOUNDS, obstacles: [{ x: ORB.x, z: ORB.z, radius: 1.35 }] });
    if (avatar.current) {
      avatar.current.position.copy(position.current);
      avatar.current.rotation.y = yaw.current;
    }
    const behind = cameraGoal.current.set(Math.sin(yaw.current) * 5.6, 3.35, Math.cos(yaw.current) * 5.6).add(position.current);
    camera.position.x = THREE.MathUtils.damp(camera.position.x, behind.x, 5.2, delta);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, behind.y, 5.2, delta);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, behind.z, 5.2, delta);
    lookGoal.current.set(position.current.x, 1.1 + Math.sin(pitch.current) * 2.2, position.current.z - 1.2);
    camera.lookAt(lookGoal.current);

    const distances: readonly [Nearby, THREE.Vector3, number][] = [
      ["orb", ORB, 2.3],
      ["ground", GROUND_PORTAL, 2.8],
      ["life-map", LIFE_MAP_PORTAL, 3.2],
    ];
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

function HomeScene({ input, yaw, pitch, target, avatar, onNearby, onOrbOpen, onGround, onLifeMap }: {
  input: MovementInput;
  yaw: MutableRefObject<number>;
  pitch: MutableRefObject<number>;
  target: MutableRefObject<THREE.Vector3 | null>;
  avatar: MutableRefObject<THREE.Group | null>;
  onNearby: (value: Nearby) => void;
  onOrbOpen: () => void;
  onGround: () => void;
  onLifeMap: () => void;
}) {
  return (
    <>
      <color attach="background" args={["#151c26"]} />
      <fogExp2 attach="fog" args={["#2d3545", 0.018]} />
      <ambientLight intensity={0.72} color="#c8dcff" />
      <hemisphereLight args={["#d9edff", "#2e2115", 1.45]} />
      <directionalLight position={[-8, 18, 10]} intensity={4.6} color="#ffd5a0" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-far={90} />
      <pointLight position={[0, 10, -14]} color="#ffb56d" intensity={7} distance={46} decay={2} />
      <Stars radius={110} depth={74} count={1800} factor={2.2} saturation={0.18} fade speed={0.06} />
      <Sparkles count={260} scale={[32, 14, 48]} position={[0, 5, -8]} size={1.5} speed={0.14} opacity={0.32} color="#ffe7b6" />
      <PlayerRig input={input} yaw={yaw} pitch={pitch} target={target} avatar={avatar} onNearby={onNearby} />
      <Terrain walkTarget={target} />
      <MountainRange />
      <Village />
      <EmbodiedSelf root={avatar} />
      <OrbSanctuary onOpen={onOrbOpen} />
      <WorldPortal type="ground" position={GROUND_PORTAL} onEnter={onGround} />
      <WorldPortal type="life-map" position={LIFE_MAP_PORTAL} onEnter={onLifeMap} />
      <EffectComposer multisampling={0}>
        <Bloom intensity={1.18} luminanceThreshold={0.66} luminanceSmoothing={0.26} mipmapBlur />
        <Vignette eskil={false} offset={0.17} darkness={0.52} />
      </EffectComposer>
    </>
  );
}

export function HomeWorldProduction({ onOrbOpen = requestUraiWorldOrbOpen, webglAvailable = true }: HomeWorldProductionProps) {
  const [ready, setReady] = useState(false);
  const [nearby, setNearby] = useState<Nearby>(null);
  const [dragging, setDragging] = useState(false);
  const yaw = useRef(0);
  const pitch = useRef(-0.08);
  const target = useRef<THREE.Vector3 | null>(null);
  const avatar = useRef<THREE.Group | null>(null);
  const onGround = useCallback(() => requestUraiWorldTravel({ destination: "infrastructure-hub", href: "/ground/", entryPortal: "home-ground", cameraCheckpoint: "home-ground-descent" }), []);
  const onLifeMap = useCallback(() => requestUraiWorldTravel({ destination: "life-map", href: "/life-map/?from=home-sky", entryPortal: "home-sky", cameraCheckpoint: "home-sky-ascent" }), []);
  const interaction = useCallback(() => {
    if (nearby === "orb") onOrbOpen();
    if (nearby === "ground") onGround();
    if (nearby === "life-map") onLifeMap();
  }, [nearby, onGround, onLifeMap, onOrbOpen]);
  const reset = useCallback(() => {
    yaw.current = 0;
    pitch.current = -0.08;
    target.current = SPAWN.clone();
  }, []);
  const input = useMovementInput({ onInteract: interaction, onReset: reset });
  const look = useDragLook({ yaw, pitch, sensitivity: 0.0034, onDragState: setDragging });

  if (!webglAvailable) return null;

  return (
    <main
      className={`${styles.world} urai-asset-home-world`}
      data-urai-home-production
      data-urai-true-3d="true"
      data-home-primary-owner="asset-driven"
      data-home-visible-world="final-physical-sanctuary-memory-rooms"
      data-home-movement="walk-keyboard-click-touch"
      data-home-pointer-lock="false"
      data-home-assets-ready={ready ? "true" : "false"}
      data-home-nearby={nearby ?? "none"}
      data-home-camera-mode={dragging ? "look" : "embodied"}
      data-testid="home-visible-navigable-sanctuary-world"
      {...look}
    >
      <Canvas className={styles.canvas} shadows dpr={[1, 1.75]} camera={{ position: [0, 3.35, 14], fov: 48, near: 0.08, far: 180 }} gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }} onCreated={() => setReady(true)}>
        <HomeScene input={input} yaw={yaw} pitch={pitch} target={target} avatar={avatar} onNearby={setNearby} onOrbOpen={onOrbOpen} onGround={onGround} onLifeMap={onLifeMap} />
      </Canvas>
      <header className={styles.brand} aria-label="URAI"><strong>URAI</strong><span>Always connected</span></header>
      <div className={styles.worldHint} role="status" aria-live="polite">
        {nearby === "orb" ? "The Orb is ready" : nearby === "ground" ? "Enter Ground" : nearby === "life-map" ? "Ascend to Life Map" : "Walk the living world"}
      </div>
      <div className={styles.destinationNames} aria-hidden="true"><span>GROUND</span><span>LIFE MAP</span></div>
      <MobileMovementPad input={input} label="Home movement controls" />
      <span className="sr-only">Open Ground directly. Open Life Map directly. Open URAI Orb companion.</span>
    </main>
  );
}
