"use client";

import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import * as THREE from "three";
import { MobileMovementPad, stepEmbodiedMotion, useDragLook, useMovementInput, type MovementInput } from "@/spatial/navigation/EmbodiedNavigation";
import { useSceneStore } from "@/spatial/store/useSceneStore";
import { requestUraiWorldOrbOpen, requestUraiWorldTravel } from "@/spatial/world/worldEvents";
import styles from "./HomeWorldProduction.module.css";

const HOME_BOUNDS = { minX: -12.5, maxX: 12.5, minZ: -15.5, maxZ: 10.5 };
const SPAWN = new THREE.Vector3(0, 0, 7.8);
const ORB = new THREE.Vector3(0, 1.52, -2.9);
const GROUND_THRESHOLD = new THREE.Vector3(-4.9, 0, -7.2);
const LIFE_MAP_LOOKOUT = new THREE.Vector3(4.9, 0, -7.2);
const ASCENT_DURATION_SECONDS = 3.6;
const GROUND_DESCENT_DURATION_SECONDS = 2.8;

type Nearby = "orb" | "ground" | "life-map" | null;
type TransitionSequence = "idle" | "ground:opening" | "ground:traversal" | "ground:closing" | "life-map:opening" | "life-map:traversal" | "life-map:closing";
type Props = { onOrbOpen?: () => void; webglAvailable?: boolean };
type Vec3 = readonly [number, number, number];

function seeded(index: number, salt = 0) {
  const value = Math.sin(index * 91.73 + salt * 37.17) * 43758.5453;
  return value - Math.floor(value);
}

function terrainHeight(x: number, z: number) {
  const broad = Math.sin(x * 0.09) * 0.23 + Math.cos(z * 0.075) * 0.16 + Math.sin((x + z) * 0.045) * 0.11;
  const detail = Math.sin(x * 0.42 + z * 0.18) * 0.035 + Math.cos(z * 0.33 - x * 0.16) * 0.03;
  const clearing = -Math.exp(-((x / 8.6) ** 2 + ((z + 2.0) / 10.5) ** 2)) * 0.3;
  const pond = -Math.exp(-(((x - 5.0) / 3.3) ** 2 + ((z + 7.0) / 4.5) ** 2)) * 0.34;
  return broad + detail + clearing + pond - 0.12;
}

function makeTerrainGeometry() {
  const geometry = new THREE.PlaneGeometry(82, 82, 220, 220);
  geometry.rotateX(-Math.PI / 2);
  const position = geometry.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(position.count * 3);
  const color = new THREE.Color();
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i);
    const z = position.getZ(i);
    const y = terrainHeight(x, z);
    position.setY(i, y);
    const grain = seeded(i, 3) * 0.08;
    const slope = THREE.MathUtils.clamp((y + 0.6) * 0.36, 0, 0.22);
    color.setRGB(0.075 + grain + slope * 0.15, 0.19 + grain + slope, 0.145 + grain + slope * 0.52);
    color.toArray(colors, i * 3);
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function makeGroundTexture() {
  const size = 512;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const i = (y * size + x) * 4;
      const n1 = Math.sin(x * 0.047) * 0.5 + Math.cos(y * 0.051) * 0.5;
      const n2 = Math.sin((x + y) * 0.17) * 0.35 + Math.cos((x - y) * 0.09) * 0.3;
      const n = THREE.MathUtils.clamp(n1 * 0.56 + n2 * 0.44, -1, 1);
      data[i] = Math.round(24 + n * 8);
      data[i + 1] = Math.round(58 + n * 14);
      data[i + 2] = Math.round(44 + n * 10);
      data[i + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(13, 13);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

const TERRAIN_GEOMETRY = makeTerrainGeometry();
const GROUND_TEXTURE = makeGroundTexture();

function CinematicBackdrop() {
  return (
    <div aria-hidden="true" style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: 0, background: "#071217" }}>
      <picture>
        <source media="(max-width: 700px)" srcSet="/assets/urai/v5/life-layer-mobile.webp" />
        <img
          src="/assets/urai/v5/life-layer-main.webp"
          alt=""
          draggable={false}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 52%", filter: "saturate(.72) brightness(.58) contrast(1.08)", transform: "scale(1.035)" }}
        />
      </picture>
      <img
        src="/assets/urai/v5/global-emotional-weather.webp"
        alt=""
        draggable={false}
        style={{ position: "absolute", inset: "-8%", width: "116%", height: "116%", objectFit: "cover", opacity: 0.18, mixBlendMode: "screen", filter: "saturate(.55) hue-rotate(8deg)" }}
      />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 42%, rgba(126,207,188,.10), transparent 25%), linear-gradient(to bottom, rgba(3,9,15,.18) 0%, rgba(3,10,13,.10) 34%, rgba(2,8,9,.66) 100%)" }} />
    </div>
  );
}

function Terrain({ walkTarget }: { walkTarget: MutableRefObject<THREE.Vector3 | null> }) {
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
    <group name="home-authored-terrain" userData={{ centeredForHomeCamera: true, role: "continuous-cinematic-three-dimensional-ground" }}>
      <mesh name="home-natural-terrain" geometry={TERRAIN_GEOMETRY} receiveShadow onClick={onWalk}>
        <meshStandardMaterial map={GROUND_TEXTURE} vertexColors color="#4d6f5d" roughness={0.94} metalness={0} />
      </mesh>
      <mesh name="home-walkable-navigation-surface" rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.58, -1.8]} onClick={onWalk}>
        <planeGeometry args={[25, 28]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
    </group>
  );
}

function Ridge({ z, width, height, y, opacity }: { z: number; width: number; height: number; y: number; opacity: number }) {
  const geometry = useMemo(() => {
    const segments = 180;
    const vertices: number[] = [];
    const indices: number[] = [];
    for (let i = 0; i <= segments; i += 1) {
      const t = i / segments;
      const x = (t - 0.5) * width;
      const envelope = Math.pow(Math.max(0, Math.sin(t * Math.PI)), 0.74);
      const wave = 0.34 + Math.sin(t * Math.PI * 2.4) * 0.16 + Math.sin(t * Math.PI * 5.1 + 0.8) * 0.055;
      const top = y + wave * height * envelope;
      vertices.push(x, -7, 0, x, top, 0);
      if (i < segments) {
        const a = i * 2;
        indices.push(a, a + 1, a + 3, a, a + 3, a + 2);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    g.setIndex(indices);
    g.computeVertexNormals();
    return g;
  }, [height, width, y]);
  return (
    <mesh geometry={geometry} position={[0, 0, z]}>
      <meshStandardMaterial color="#0b2023" transparent opacity={opacity} roughness={1} side={THREE.DoubleSide} />
    </mesh>
  );
}

function DistantHorizon() {
  return (
    <group name="home-mountain-horizon" userData={{ role: "layered-atmospheric-depth" }}>
      <Ridge z={-34} width={88} height={11} y={-0.8} opacity={0.68} />
      <Ridge z={-52} width={126} height={17} y={0.2} opacity={0.52} />
    </group>
  );
}

function Fireflies({ reducedMotion }: { reducedMotion: boolean }) {
  const ref = useRef<THREE.Points>(null);
  const geometry = useMemo(() => {
    const positions = new Float32Array(240 * 3);
    for (let i = 0; i < 240; i += 1) {
      const x = (seeded(i, 18) - 0.5) * 28;
      const z = (seeded(i, 19) - 0.5) * 26 - 2;
      positions[i * 3] = x;
      positions[i * 3 + 1] = terrainHeight(x, z) + 0.24 + seeded(i, 20) * 2.2;
      positions[i * 3 + 2] = z;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, []);
  useFrame(({ clock }) => {
    if (reducedMotion || !ref.current) return;
    ref.current.position.y = Math.sin(clock.elapsedTime * 0.27) * 0.04;
    ref.current.rotation.y = Math.sin(clock.elapsedTime * 0.03) * 0.008;
  });
  return (
    <group name="home-living-vegetation" userData={{ role: "subtle-living-ground-cover-and-fireflies" }}>
      <points ref={ref} geometry={geometry}>
        <pointsMaterial color="#d6f3c6" size={0.048} transparent opacity={0.55} depthWrite={false} sizeAttenuation toneMapped={false} />
      </points>
    </group>
  );
}

function ReflectingWater() {
  const y = terrainHeight(5.0, -7.0) + 0.04;
  return (
    <group name="home-reflecting-water" position={[5.0, y, -7.0]} userData={{ role: "moonlit-reflecting-water" }}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[1.55, 1, 1]}>
        <circleGeometry args={[2.65, 128]} />
        <meshPhysicalMaterial color="#123c49" emissive="#061b22" emissiveIntensity={0.18} roughness={0.06} metalness={0.02} clearcoat={1} clearcoatRoughness={0.07} transparent opacity={0.78} />
      </mesh>
      <pointLight position={[-1.3, 0.8, 0.8]} color="#7bc6ba" intensity={0.28} distance={5.5} decay={2} />
    </group>
  );
}

function orbitGeometry(rx: number, ry: number) {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i < 128; i += 1) {
    const t = (i / 128) * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(t) * rx, Math.sin(t) * ry, 0));
  }
  return new THREE.BufferGeometry().setFromPoints(points);
}

function OrbRing({ rx, ry, rotation, color, opacity }: { rx: number; ry: number; rotation: Vec3; color: string; opacity: number }) {
  const geometry = useMemo(() => orbitGeometry(rx, ry), [rx, ry]);
  return (
    <lineLoop geometry={geometry} rotation={rotation as [number, number, number]}>
      <lineBasicMaterial color={color} transparent opacity={opacity} toneMapped={false} />
    </lineLoop>
  );
}

function OrbDust({ reducedMotion }: { reducedMotion: boolean }) {
  const ref = useRef<THREE.Points>(null);
  const geometry = useMemo(() => {
    const positions = new Float32Array(110 * 3);
    for (let i = 0; i < 110; i += 1) {
      const radius = 0.78 + seeded(i, 44) * 0.68;
      const angle = seeded(i, 45) * Math.PI * 2;
      const lift = (seeded(i, 46) - 0.5) * 1.35;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = lift;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, []);
  useFrame((_, delta) => {
    if (reducedMotion || !ref.current) return;
    ref.current.rotation.y += delta * 0.08;
  });
  return (
    <points ref={ref} geometry={geometry}>
      <pointsMaterial color="#c8fff2" size={0.035} transparent opacity={0.62} depthWrite={false} toneMapped={false} />
    </points>
  );
}

function LivingOrb({ onOpen, reducedMotion }: { onOpen: () => void; reducedMotion: boolean }) {
  const root = useRef<THREE.Group>(null);
  const core = useRef<THREE.Mesh>(null);
  const halo = useRef<THREE.Mesh>(null);
  const light = useRef<THREE.PointLight>(null);
  useFrame(({ clock }, delta) => {
    if (reducedMotion) return;
    const breath = 1 + Math.sin(clock.elapsedTime * 1.05) * 0.035;
    core.current?.scale.setScalar(breath);
    halo.current?.scale.setScalar(1 + Math.sin(clock.elapsedTime * 0.67 + 0.9) * 0.026);
    if (root.current) root.current.rotation.y += delta * 0.035;
    if (light.current) light.current.intensity = 4.2 + Math.sin(clock.elapsedTime * 1.05) * 0.45;
  });
  return (
    <group
      ref={root}
      name="home-orb-sanctuary"
      position={ORB}
      userData={{ semanticOwner: "urai-home-webgl-orb", form: "living-emissive-spatial-companion" }}
      onClick={(event) => { event.stopPropagation(); if (!useSceneStore.getState().inputLocked) onOpen(); }}
    >
      <mesh ref={halo} scale={1.14}>
        <sphereGeometry args={[1, 72, 72]} />
        <meshPhysicalMaterial color="#b9fff0" emissive="#3d947f" emissiveIntensity={0.28} roughness={0.035} transmission={0.64} thickness={0.24} transparent opacity={0.16} depthWrite={false} />
      </mesh>
      <mesh scale={0.82}>
        <sphereGeometry args={[1, 72, 72]} />
        <meshPhysicalMaterial color="#d8fff5" emissive="#79d8c2" emissiveIntensity={0.62} roughness={0.055} transmission={0.34} clearcoat={1} clearcoatRoughness={0.04} transparent opacity={0.46} />
      </mesh>
      <mesh ref={core} scale={0.43}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshStandardMaterial color="#ffe5ae" emissive="#f3ad52" emissiveIntensity={4.2} roughness={0.12} toneMapped={false} />
      </mesh>
      <OrbRing rx={1.34} ry={0.58} rotation={[0.5, 0.1, 0.22]} color="#c5fff0" opacity={0.38} />
      <OrbRing rx={1.25} ry={0.66} rotation={[-0.38, 0.72, -0.25]} color="#ffe2aa" opacity={0.27} />
      <OrbRing rx={1.1} ry={0.76} rotation={[0.14, -0.5, 0.72]} color="#9dded0" opacity={0.2} />
      <OrbDust reducedMotion={reducedMotion} />
      <pointLight ref={light} color="#8ce8d2" intensity={4.2} distance={12} decay={2} />
      <pointLight color="#f4c47d" intensity={1.4} distance={7} decay={2} position={[0, -0.1, 0.6]} />
    </group>
  );
}

function OrbLightPool() {
  const y = terrainHeight(0, -2.9) + 0.025;
  return (
    <group name="home-sanctuary-geometry" position={[0, y, -2.9]} userData={{ role: "non-platform-orb-light-pool" }}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.35, 1.41, 128]} />
        <meshBasicMaterial color="#d2c58f" transparent opacity={0.28} toneMapped={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.003, 0]}>
        <circleGeometry args={[1.35, 128]} />
        <meshBasicMaterial color="#77b9a8" transparent opacity={0.055} depthWrite={false} />
      </mesh>
    </group>
  );
}

function EmbodiedPresence({ root }: { root: MutableRefObject<THREE.Group | null> }) {
  return (
    <group ref={root} name="home-authored-embodied-self" position={SPAWN} userData={{ semanticOwner: "urai-home-embodied-avatar", representation: "privacy-preserving-first-person-presence" }}>
      <mesh position={[0, 0.012, 0.25]} rotation={[-Math.PI / 2, 0, 0]} scale={[0.42, 1.0, 1]}>
        <circleGeometry args={[0.38, 40]} />
        <meshBasicMaterial color="#000806" transparent opacity={0.09} depthWrite={false} />
      </mesh>
    </group>
  );
}

function InvisibleThreshold({ name, position, destination, onEnter }: { name: string; position: THREE.Vector3; destination: string; onEnter: () => void }) {
  return (
    <group name={name} position={position} userData={{ destination, visiblePortal: false }}>
      <mesh position={[0, 0.75, 0]} onClick={(event) => { event.stopPropagation(); onEnter(); }}>
        <boxGeometry args={[3.8, 2.5, 3.8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
    </group>
  );
}

function cubicPoint(target: THREE.Vector3, p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3, t: number) {
  const i = 1 - t;
  target.set(0, 0, 0).addScaledVector(p0, i * i * i).addScaledVector(p1, 3 * i * i * t).addScaledVector(p2, 3 * i * t * t).addScaledVector(p3, t * t * t);
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
      if (groundStarted.current === null) {
        groundStarted.current = clock.elapsedTime;
        cameraStart.current.copy(camera.position);
        velocity.current.set(0, 0, 0);
        target.current = null;
        onNearby(null);
      }
      const duration = reducedMotion ? 0.45 : GROUND_DESCENT_DURATION_SECONDS;
      const linear = THREE.MathUtils.clamp((clock.elapsedTime - groundStarted.current) / duration, 0, 1);
      const eased = THREE.MathUtils.smootherstep(linear, 0, 1);
      cubicPoint(point.current, cameraStart.current, new THREE.Vector3(-3.5, 1.2, -5.4), new THREE.Vector3(-5.2, 0.1, -8.8), new THREE.Vector3(-3.8, -3.2, -13.7), eased);
      camera.position.copy(point.current);
      camera.lookAt(-4.8, -0.7 - eased, -13.2);
      store.setProgress(linear);
      if (linear >= 1 && !groundIssued.current) {
        groundIssued.current = true;
        onGroundComplete();
      }
      return;
    }
    if (groundStarted.current !== null) {
      groundStarted.current = null;
      groundIssued.current = false;
    }

    if (store.phase === "ASCENT") {
      if (ascentStarted.current === null) {
        ascentStarted.current = clock.elapsedTime;
        cameraStart.current.copy(camera.position);
        velocity.current.set(0, 0, 0);
        target.current = null;
        onNearby(null);
      }
      const duration = reducedMotion ? 0.45 : ASCENT_DURATION_SECONDS;
      const linear = THREE.MathUtils.clamp((clock.elapsedTime - ascentStarted.current) / duration, 0, 1);
      const eased = THREE.MathUtils.smootherstep(linear, 0, 1);
      cubicPoint(point.current, cameraStart.current, new THREE.Vector3(3.8, 9.0, -8.5), new THREE.Vector3(1.4, 24, -22), new THREE.Vector3(0, 48, -57), eased);
      camera.position.copy(point.current);
      camera.lookAt(0, 10 + eased * 36, -30 - eased * 46);
      store.setProgress(linear);
      if (linear >= 1 && !ascentIssued.current) {
        ascentIssued.current = true;
        requestUraiWorldTravel({ destination: "life-map", href: "/life-map/?from=home-sky", entryPortal: "home-sky", cameraCheckpoint: "home-sky-ascent-complete" });
      }
      return;
    }
    if (ascentStarted.current !== null) {
      ascentStarted.current = null;
      ascentIssued.current = false;
    }

    stepEmbodiedMotion({ delta, input, yaw: yaw.current, position: position.current, velocity: velocity.current, target, bounds: HOME_BOUNDS, speed: 3.1, acceleration: 9, deceleration: 12 });
    if (target.current && position.current.distanceTo(target.current) < 0.2) target.current = null;
    if (avatar.current) {
      avatar.current.position.copy(position.current);
      avatar.current.rotation.y = yaw.current;
    }
    const portrait = size.height > size.width;
    forward.current.set(Math.sin(yaw.current), 0, -Math.cos(yaw.current));
    desired.current.copy(position.current).add(new THREE.Vector3(0, portrait ? 1.62 : 1.7, portrait ? 0.18 : 0.12).applyAxisAngle(up.current, yaw.current));
    camera.position.lerp(desired.current, 1 - Math.pow(0.0008, delta));
    look.current.copy(position.current).addScaledVector(forward.current, portrait ? 6.6 : 8.6);
    camera.lookAt(look.current.x, 1.28 + pitch.current, look.current.z);

    const distances: readonly [Nearby, THREE.Vector3, number][] = [
      ["orb", ORB, 2.2],
      ["ground", GROUND_THRESHOLD, 2.55],
      ["life-map", LIFE_MAP_LOOKOUT, 2.55],
    ];
    let next: Nearby = null;
    let best = Infinity;
    for (const [name, poi, radius] of distances) {
      const distance = Math.hypot(position.current.x - poi.x, position.current.z - poi.z);
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

function HomeScene({ input, yaw, pitch, target, avatar, onNearby, onOrbOpen, onGround, onGroundComplete, onLifeMap, onSceneReady, groundDescent, reducedMotion }: {
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
  onSceneReady: () => void;
  groundDescent: boolean;
  reducedMotion: boolean;
}) {
  const phase = useSceneStore((state) => state.phase);
  const cosmic = phase === "ASCENT";
  return (
    <>
      {cosmic ? <color attach="background" args={["#01050b"]} /> : null}
      <Stars radius={190} depth={90} count={cosmic ? 2500 : 1300} factor={cosmic ? 2.8 : 1.35} saturation={0.18} fade speed={reducedMotion ? 0 : 0.035} />
      <fogExp2 attach="fog" args={[cosmic ? "#050b14" : "#0b1a1b", cosmic ? 0.0017 : 0.0125]} />
      <ambientLight intensity={cosmic ? 0.12 : 0.38} color="#b7d4cd" />
      <hemisphereLight args={["#9ec5c8", "#06110d", cosmic ? 0.2 : 0.66]} />
      <directionalLight position={[11, 18, -14]} intensity={cosmic ? 0.32 : 1.7} color="#d5e8e4" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-near={0.5} shadow-camera-far={72} shadow-camera-left={-24} shadow-camera-right={24} shadow-camera-top={24} shadow-camera-bottom={-24} />
      <directionalLight position={[-8, 8, 6]} intensity={cosmic ? 0.1 : 0.35} color="#e2b878" />
      <Terrain walkTarget={target} />
      <DistantHorizon />
      <Fireflies reducedMotion={reducedMotion} />
      <ReflectingWater />
      <OrbLightPool />
      <LivingOrb onOpen={onOrbOpen} reducedMotion={reducedMotion} />
      <EmbodiedPresence root={avatar} />
      <InvisibleThreshold name="home-ground-environmental-threshold" position={GROUND_THRESHOLD} destination="ground" onEnter={onGround} />
      <InvisibleThreshold name="home-life-map-sky-lookout" position={LIFE_MAP_LOOKOUT} destination="life-map" onEnter={onLifeMap} />
      <PlayerRig input={input} yaw={yaw} pitch={pitch} target={target} avatar={avatar} onNearby={onNearby} groundDescent={groundDescent} onGroundComplete={onGroundComplete} reducedMotion={reducedMotion} />
      <SceneReadiness onReady={onSceneReady} />
    </>
  );
}

export function HomeWorldProductionCinematic({ onOrbOpen = requestUraiWorldOrbOpen, webglAvailable = true }: Props) {
  const [canvasReady, setCanvasReady] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const [nearby, setNearby] = useState<Nearby>(null);
  const [dragging, setDragging] = useState(false);
  const [reviewFixture, setReviewFixture] = useState("none");
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

  const openOrb = useCallback(() => {
    if (!useSceneStore.getState().inputLocked && !groundDescent) onOrbOpen();
  }, [groundDescent, onOrbOpen]);
  const startGroundDescent = useCallback(() => {
    if (useSceneStore.getState().inputLocked || groundDescent) return;
    target.current = null;
    setTransitionSequence("ground:opening");
    setGroundDescent(true);
  }, [groundDescent]);
  const finishGroundDescent = useCallback(() => {
    setTransitionSequence("ground:closing");
    requestUraiWorldTravel({ destination: "infrastructure-hub", href: "/ground/", entryPortal: "home-ground", cameraCheckpoint: "home-ground-descent" });
  }, []);
  const startLifeMapAscent = useCallback(() => {
    const store = useSceneStore.getState();
    if (store.inputLocked || groundDescent || store.phase === "ASCENT") return;
    target.current = null;
    setTransitionSequence("life-map:opening");
    store.enterLifeMap();
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
    pitch.current = -0.045;
    target.current = SPAWN.clone();
    setTransitionSequence("idle");
  }, [groundDescent]);
  const input = useMovementInput({ enabled: !groundDescent, onInteract: interaction, onReset: reset });
  const look = useDragLook({ yaw, pitch, enabled: !groundDescent && phase !== "ASCENT", sensitivity: 0.0031, minPitch: -0.55, maxPitch: 0.68, onDragState: setDragging });

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    setReviewFixture(query.get("homePrivateFixture") === "1" ? "safe-private" : "none");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mobile = window.matchMedia("(pointer: coarse), (max-width: 700px)");
    const apply = () => {
      setReducedMotion(reduced.matches);
      setMobileControls(mobile.matches);
    };
    apply();
    reduced.addEventListener?.("change", apply);
    mobile.addEventListener?.("change", apply);
    return () => {
      reduced.removeEventListener?.("change", apply);
      mobile.removeEventListener?.("change", apply);
    };
  }, []);
  useEffect(() => { if (phase === "ASCENT") setTransitionSequence("life-map:traversal"); }, [phase]);
  useEffect(() => { if (groundDescent) setTransitionSequence("ground:traversal"); }, [groundDescent]);
  useEffect(() => {
    const cancel = (event: KeyboardEvent) => {
      const store = useSceneStore.getState();
      if (event.key !== "Escape") return;
      if (store.phase === "ASCENT") {
        event.preventDefault();
        store.setPhase("HOME");
        store.unlock();
        setTransitionSequence("idle");
        return;
      }
      if (groundDescent) {
        event.preventDefault();
        setGroundDescent(false);
        setTransitionSequence("idle");
      }
    };
    window.addEventListener("keydown", cancel, true);
    return () => window.removeEventListener("keydown", cancel, true);
  }, [groundDescent]);

  if (!webglAvailable) return null;
  const ready = canvasReady && sceneReady;
  const transitioning = phase === "ASCENT" || groundDescent;
  const context = phase === "ASCENT" ? "Ascending through the sky" : groundDescent ? "Descending into Ground" : nearby === "orb" ? "The Orb is here" : nearby === "ground" ? "The path descends" : nearby === "life-map" ? "Look to the sky" : null;

  return (
    <main
      className={`${styles.world} urai-asset-home-world`}
      data-urai-home-production
      data-urai-true-3d="true"
      data-home-primary-owner="asset-driven"
      data-home-real-world-first="true"
      data-home-visible-world="authored-coherent-three-dimensional-sanctuary"
      data-home-world-character="cinematic-natural-inhabitable-environment"
      data-home-visible-portals="false"
      data-home-transition-affordances="ground-environmental-descent life-map-sky-lookout"
      data-home-provider-environment="/assets/urai/v5/life-layer-main.webp"
      data-home-provider-role="atmospheric-surface-only"
      data-home-provider-regions="home-atmospheric-horizon"
      data-home-generated-scenery="suppressed"
      data-home-physical-base="continuous-three-dimensional-terrain"
      data-home-visual-ownership="three-dimensional-geometry"
      data-home-desktop-mobile-world="same-scene"
      data-home-embodied-self="privacy-preserving-shadow"
      data-home-movement="walk-keyboard-click-touch"
      data-home-pointer-lock="false"
      data-home-audio="production-opus-consent-controlled"
      data-home-assets-ready={ready ? "true" : "false"}
      data-home-runtime-assets="life-layer-main.webp life-layer-mobile.webp global-emotional-weather.webp local-three-dimensional-terrain living-orb"
      data-home-authored-regions="home-sanctuary-geometry home-mountain-horizon home-living-vegetation home-reflecting-water"
      data-home-nearby={nearby ?? "none"}
      data-home-camera-mode={groundDescent ? "descent" : phase === "ASCENT" ? "ascent" : dragging ? "look" : "embodied-first-person"}
      data-home-scene-phase={groundDescent ? "GROUND_DESCENT" : phase}
      data-home-ascent-progress={phase === "ASCENT" ? progress.toFixed(3) : "0.000"}
      data-home-input-locked={transitioning || inputLocked ? "true" : "false"}
      data-home-portal-sequence={transitionSequence}
      data-home-portal-lifecycle="environmental-approach-traversal-arrival"
      data-home-review-fixture={reviewFixture}
      data-home-orb-state={transitioning ? "transition" : "idle"}
      data-home-orb-clip={transitioning ? "Orb_Transition" : "Orb_Idle"}
      data-home-animation-owner="authored-physical-interactions"
      data-home-asset-provenance="repository-local-paid-provider-surfaces-plus-authored-three-dimensional-core"
      data-testid="home-visible-navigable-sanctuary-world"
      style={{ position: "relative", overflow: "hidden", background: "#071217" }}
      {...look}
    >
      <CinematicBackdrop />
      <div style={{ position: "absolute", inset: 0, zIndex: 1 }}>
        <Canvas
          className={styles.canvas}
          dpr={[1, 1.35]}
          shadows
          camera={{ position: [0, 1.7, 8], fov: 52, near: 0.05, far: 300 }}
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
          onCreated={({ gl }) => {
            gl.outputColorSpace = THREE.SRGBColorSpace;
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.08;
            gl.shadowMap.type = THREE.PCFSoftShadowMap;
            gl.setClearColor(0x000000, 0);
            setCanvasReady(true);
          }}
        >
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
