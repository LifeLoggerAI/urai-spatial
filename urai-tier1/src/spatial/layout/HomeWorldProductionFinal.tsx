"use client";

import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { ContactShadows, Float, Sky, Stars, useAnimations, useGLTF } from "@react-three/drei";
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import * as THREE from "three";
import { MobileMovementPad, stepEmbodiedMotion, useDragLook, useMovementInput, type MovementInput } from "@/spatial/navigation/EmbodiedNavigation";
import { useSceneStore } from "@/spatial/store/useSceneStore";
import { requestUraiWorldOrbOpen, requestUraiWorldTravel } from "@/spatial/world/worldEvents";
import styles from "./HomeWorldProduction.module.css";

const HOME_MODEL = "/assets/urai/generated/models/home-entry-chamber-v1.glb";
const HOME_PROVIDER_ENVIRONMENT = "/assets/urai/replay/replay-memory-film-main.webp";
const ORB_MODEL = "/assets/urai/generated/models/urai-orb-avatar-v1.glb";
const HOME_BOUNDS = { minX: -12.5, maxX: 12.5, minZ: -15.5, maxZ: 10.5 };
const SPAWN = new THREE.Vector3(0, 0, 7.8);
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
type Vec3 = readonly [number, number, number];

const OrbStateContext = createContext<OrbState>("idle");
const ReducedMotionContext = createContext(false);

const BOULDER_SPECS: readonly { position: Vec3; scale: Vec3; rotation: Vec3 }[] = [
  { position: [-8.3, 0.05, 5.1], scale: [1.3, 0.55, 0.9], rotation: [0.08, 0.7, -0.08] },
  { position: [-7.1, 0.01, 0.8], scale: [0.72, 0.38, 0.62], rotation: [-0.04, -0.3, 0.08] },
  { position: [-7.8, 0.02, -4.8], scale: [0.9, 0.46, 0.72], rotation: [0.06, 1.1, 0.02] },
  { position: [8.2, 0.04, 4.8], scale: [1.18, 0.52, 0.82], rotation: [-0.03, 0.35, -0.04] },
  { position: [7.2, 0.0, 0.4], scale: [0.7, 0.36, 0.58], rotation: [0.05, -0.8, 0.06] },
  { position: [7.8, 0.02, -5.1], scale: [0.96, 0.46, 0.74], rotation: [-0.05, 0.95, -0.02] },
  { position: [-3.4, -0.02, -10.6], scale: [0.65, 0.3, 0.52], rotation: [0.03, 0.5, 0.05] },
  { position: [3.2, -0.02, -10.8], scale: [0.68, 0.32, 0.54], rotation: [-0.02, -0.55, 0.04] },
];

function seeded(index: number, salt = 0) {
  const value = Math.sin(index * 91.73 + salt * 37.17) * 43758.5453;
  return value - Math.floor(value);
}

function terrainHeight(x: number, z: number) {
  const broad = Math.sin(x * 0.095) * 0.24 + Math.cos(z * 0.105) * 0.19 + Math.sin((x + z) * 0.052) * 0.13;
  const detail = Math.sin(x * 0.38 + z * 0.21) * 0.035 + Math.cos(z * 0.32 - x * 0.18) * 0.03;
  const meadow = -Math.exp(-((x / 8.4) ** 2 + ((z + 1.0) / 9.8) ** 2)) * 0.3;
  const waterBasin = -Math.exp(-(((x - 0.7) / 3.2) ** 2 + ((z + 10.8) / 5.4) ** 2)) * 0.42;
  return broad + detail + meadow + waterBasin - 0.14;
}

function makeTerrainGeometry() {
  const geometry = new THREE.PlaneGeometry(80, 80, 200, 200);
  geometry.rotateX(-Math.PI / 2);
  const position = geometry.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i);
    const z = position.getZ(i);
    position.setY(i, terrainHeight(x, z));
  }
  geometry.computeVertexNormals();
  return geometry;
}

function makeTerrainTexture() {
  const size = 512;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = (y * size + x) * 4;
      const broad = Math.sin(x * 0.025) * 0.5 + Math.cos(y * 0.031) * 0.5;
      const grain = Math.sin(x * 0.15 + y * 0.08) * 0.42 + Math.cos(y * 0.19 - x * 0.055) * 0.33;
      const n = THREE.MathUtils.clamp(broad * 0.56 + grain * 0.44, -1, 1);
      data[index] = Math.round(28 + n * 6);
      data[index + 1] = Math.round(62 + n * 12);
      data[index + 2] = Math.round(51 + n * 9);
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
  material.metalness = /bronze|rim/.test(id) ? 0.08 : 0;
  material.roughness = /water|pool|stream/.test(id) ? 0.2 : /bronze|rim/.test(id) ? 0.62 : 0.9;
  material.transparent = false;
  material.opacity = 1;
  if (/path|step|terrace/.test(id)) material.color.set("#46524a");
  else if (/basin|pedestal|stone/.test(id)) material.color.set("#53605a");
  else if (/water|pool|stream/.test(id)) material.color.set("#285667");
  else if (/terrain|ground|moss|garden/.test(id)) material.color.set("#315847");
  else if (/wood|beam|timber/.test(id)) material.color.set("#46382d");
  else material.color.set("#40514a");
  material.emissive.set("#020908");
  material.emissiveIntensity = /heart/.test(id) ? 0.08 : 0.002;
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
    object.castShadow = false;
    object.receiveShadow = false;
    object.frustumCulled = false;
  });
  if (visibleMeshCount < 3) throw new Error("Home authored 3D world is missing required physical geometry.");
  world.visible = false;
  world.userData.uraiVisibleWorld = "authored-coherent-three-dimensional-sanctuary";
  world.userData.suppressedPortalProps = true;
  world.userData.suppressedForgeScenery = true;
  world.userData.retainedForGovernedCompatibilityOnly = true;
  world.userData.centeredForHomeCamera = true;
  return world;
}

function prepareOrb(source: THREE.Object3D) {
  const orb = source.clone(true);
  orb.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const inherited = Array.isArray(object.material) ? object.material[0] : object.material;
    const material = inherited instanceof THREE.MeshStandardMaterial ? inherited.clone() : new THREE.MeshStandardMaterial();
    material.transparent = true;
    material.opacity = 0;
    material.depthWrite = false;
    material.colorWrite = false;
    material.needsUpdate = true;
    object.material = material;
    object.castShadow = false;
    object.receiveShadow = false;
    object.frustumCulled = false;
  });
  return orb;
}

function Rock({ position, scale, rotation, tone = 0 }: { position: Vec3; scale: Vec3; rotation: Vec3; tone?: number }) {
  const colors = ["#48544e", "#59655f", "#3e4c47"];
  return (
    <mesh position={position as [number, number, number]} scale={scale as [number, number, number]} rotation={rotation as [number, number, number]} castShadow receiveShadow>
      <icosahedronGeometry args={[1, 3]} />
      <meshStandardMaterial color={colors[tone % colors.length]} roughness={0.98} metalness={0} />
    </mesh>
  );
}

function GrassField() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const color = new THREE.Color();
    for (let i = 0; i < 1800; i += 1) {
      const x = (seeded(i, 1) - 0.5) * 35;
      const z = (seeded(i, 2) - 0.5) * 38 - 2;
      const centerClear = Math.hypot(x * 0.62, z + 0.9) < 1.7;
      if (centerClear) {
        dummy.scale.set(0, 0, 0);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        continue;
      }
      const height = 0.28 + seeded(i, 3) * 0.62;
      dummy.position.set(x, terrainHeight(x, z) + height * 0.48, z);
      dummy.rotation.set(0, seeded(i, 4) * Math.PI, (seeded(i, 5) - 0.5) * 0.12);
      dummy.scale.set(0.018 + seeded(i, 6) * 0.035, height, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      color.set(i % 5 === 0 ? "#4b7663" : i % 5 === 1 ? "#3f6a58" : i % 5 === 2 ? "#315a4b" : "#294f43");
      mesh.setColorAt(i, color);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [dummy]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, 1800]} castShadow={false} receiveShadow={false} frustumCulled={false}>
      <planeGeometry args={[1, 1, 1, 2]} />
      <meshStandardMaterial vertexColors side={THREE.DoubleSide} roughness={1} metalness={0} />
    </instancedMesh>
  );
}

function FireflyField({ reducedMotion }: { reducedMotion: boolean }) {
  const points = useRef<THREE.Points>(null);
  const geometry = useMemo(() => {
    const positions = new Float32Array(260 * 3);
    for (let i = 0; i < 260; i += 1) {
      const x = (seeded(i, 17) - 0.5) * 30;
      const z = (seeded(i, 18) - 0.5) * 26 - 2;
      positions[i * 3] = x;
      positions[i * 3 + 1] = terrainHeight(x, z) + 0.45 + seeded(i, 19) * 2.8;
      positions[i * 3 + 2] = z;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, []);
  useFrame(({ clock }) => {
    if (reducedMotion || !points.current) return;
    points.current.position.y = Math.sin(clock.elapsedTime * 0.28) * 0.04;
    points.current.rotation.y = Math.sin(clock.elapsedTime * 0.035) * 0.015;
  });
  return (
    <points ref={points} geometry={geometry}>
      <pointsMaterial color="#b8f5d7" size={0.055} transparent opacity={0.58} depthWrite={false} sizeAttenuation toneMapped={false} />
    </points>
  );
}

function NaturalVegetation({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <group name="home-living-vegetation" userData={{ role: "authored-runtime-natural-meadow", repeatedForgeVegetation: false }}>
      <GrassField />
      <FireflyField reducedMotion={reducedMotion} />
      {BOULDER_SPECS.map((rock, index) => <Rock key={`boulder-${index}`} {...rock} tone={index} />)}
    </group>
  );
}

function Ridge({ z, y, width, height, color, seed }: { z: number; y: number; width: number; height: number; color: string; seed: number }) {
  const geometry = useMemo(() => {
    const segments = 128;
    const vertices: number[] = [];
    const indices: number[] = [];
    for (let i = 0; i <= segments; i += 1) {
      const t = i / segments;
      const x = (t - 0.5) * width;
      const shoulder = Math.pow(Math.max(0, Math.sin(t * Math.PI)), 0.68);
      const longWave = Math.sin(t * Math.PI * (2.1 + seed * 0.11)) * 0.28;
      const midWave = Math.sin(t * Math.PI * 5.7 + seed) * 0.11;
      const detail = Math.sin(t * Math.PI * 11.3 + seed * 1.7) * 0.035;
      const top = y + (0.42 + longWave + midWave + detail) * height * shoulder;
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
  }, [height, seed, width, y]);
  return (
    <mesh geometry={geometry} position={[0, 0, z]} receiveShadow={false}>
      <meshStandardMaterial color={color} roughness={1} metalness={0} side={THREE.DoubleSide} />
    </mesh>
  );
}

function NaturalHorizon() {
  return (
    <group name="home-mountain-horizon" userData={{ role: "atmospheric-depth-boundary", form: "layered-mountain-horizon" }}>
      <Ridge z={-31} y={-0.8} width={82} height={10.5} color="#244b4a" seed={1} />
      <Ridge z={-44} y={0.2} width={106} height={15} color="#18383d" seed={3} />
      <Ridge z={-60} y={1.2} width={132} height={20} color="#10252e" seed={6} />
    </group>
  );
}

function SanctuaryPavilion() {
  return (
    <group name="home-sanctuary-geometry" userData={{ role: "inhabited-natural-resting-place" }}>
      <Rock position={[-2.25, -0.05, -2.0]} scale={[0.9, 0.3, 0.62]} rotation={[0.04, 0.7, -0.05]} tone={1} />
      <Rock position={[2.45, -0.06, -2.25]} scale={[0.78, 0.28, 0.58]} rotation={[-0.04, -0.45, 0.02]} tone={2} />
      <pointLight color="#dcb780" intensity={0.3} distance={5.5} decay={2} position={[-2.4, 0.35, -2.4]} />
      <pointLight color="#8bd0c1" intensity={0.24} distance={5.5} decay={2} position={[2.4, 0.5, -2.5]} />
    </group>
  );
}

function SanctuaryPath() {
  const stones = useMemo(() => Array.from({ length: 18 }, (_, index) => {
    const t = index / 17;
    const x = Math.sin(t * Math.PI * 2.0) * 0.22;
    const z = 6.5 - t * 8.6;
    return { x, z, scale: 0.16 + seeded(index, 8) * 0.12, yaw: (seeded(index, 9) - 0.5) * 0.8 };
  }), []);
  return (
    <group name="home-natural-path-network" userData={{ role: "walkable-stone-path" }}>
      {stones.map((stone, index) => (
        <mesh key={index} position={[stone.x, terrainHeight(stone.x, stone.z) + 0.005, stone.z]} scale={[1.5, 0.18, 1]} rotation={[0, stone.yaw, 0]} receiveShadow>
          <icosahedronGeometry args={[stone.scale, 2]} />
          <meshStandardMaterial color={index % 2 ? "#53615a" : "#617067"} roughness={1} metalness={0} />
        </mesh>
      ))}
    </group>
  );
}

function AtmosphereParticles({ reducedMotion }: { reducedMotion: boolean }) {
  const points = useRef<THREE.Points>(null);
  const geometry = useMemo(() => {
    const positions = new Float32Array(620 * 3);
    for (let i = 0; i < 620; i += 1) {
      positions[i * 3] = (seeded(i, 12) - 0.5) * 64;
      positions[i * 3 + 1] = 1.0 + seeded(i, 13) * 16;
      positions[i * 3 + 2] = -45 + seeded(i, 14) * 62;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, []);
  useFrame(({ clock }, delta) => {
    if (reducedMotion || !points.current) return;
    points.current.rotation.y += delta * 0.0015;
    points.current.position.y = Math.sin(clock.elapsedTime * 0.11) * 0.05;
  });
  return (
    <points ref={points} geometry={geometry}>
      <pointsMaterial color="#b1dfd3" size={0.032} transparent opacity={0.3} depthWrite={false} sizeAttenuation />
    </points>
  );
}

function Moon() {
  return (
    <group position={[11, 14, -52]} name="home-moon-rim-light">
      <mesh>
        <sphereGeometry args={[2.0, 48, 48]} />
        <meshBasicMaterial color="#dce9e6" toneMapped={false} />
      </mesh>
      <mesh scale={1.22}>
        <sphereGeometry args={[2.0, 40, 40]} />
        <meshBasicMaterial color="#93cfc5" transparent opacity={0.055} depthWrite={false} toneMapped={false} />
      </mesh>
      <pointLight color="#b8d9d4" intensity={1.1} distance={70} decay={2} />
    </group>
  );
}

function SanctuaryWorld({ walkTarget, reducedMotion }: { walkTarget: MutableRefObject<THREE.Vector3 | null>; reducedMotion: boolean }) {
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
      <primitive object={authoredWorld} />
      <mesh name="home-natural-terrain" geometry={TERRAIN_GEOMETRY} receiveShadow onClick={onWalk}>
        <meshStandardMaterial map={TERRAIN_TEXTURE} color="#3d6654" roughness={0.98} metalness={0} />
      </mesh>
      <NaturalHorizon />
      <NaturalVegetation reducedMotion={reducedMotion} />
      <SanctuaryPath />
      <SanctuaryPavilion />
      <mesh name="home-walkable-navigation-surface" rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.55, -1.5]} onClick={onWalk}>
        <planeGeometry args={[25, 27]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
      <mesh name="home-reflecting-water" position={[0.6, -0.46, -11.8]} rotation={[-Math.PI / 2, 0, 0]} scale={[2.0, 1.0, 1.0]} receiveShadow>
        <circleGeometry args={[3.0, 128]} />
        <meshPhysicalMaterial color="#235566" emissive="#09272f" emissiveIntensity={0.2} roughness={0.08} metalness={0.02} clearcoat={1} clearcoatRoughness={0.1} transparent opacity={0.76} />
      </mesh>
    </group>
  );
}

function orbitGeometry(radiusX: number, radiusY: number) {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i < 96; i += 1) {
    const t = (i / 96) * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(t) * radiusX, Math.sin(t) * radiusY, 0));
  }
  return new THREE.BufferGeometry().setFromPoints(points);
}

function OrbOrbit({ rx, ry, rotation, opacity }: { rx: number; ry: number; rotation: Vec3; opacity: number }) {
  const geometry = useMemo(() => orbitGeometry(rx, ry), [rx, ry]);
  return (
    <lineLoop geometry={geometry} rotation={rotation as [number, number, number]}>
      <lineBasicMaterial color="#c6fff0" transparent opacity={opacity} toneMapped={false} />
    </lineLoop>
  );
}

function LivingOrbShell({ reducedMotion }: { reducedMotion: boolean }) {
  const group = useRef<THREE.Group>(null);
  const core = useRef<THREE.Mesh>(null);
  const light = useRef<THREE.PointLight>(null);
  useFrame(({ clock }, delta) => {
    if (reducedMotion) return;
    const breathe = 1 + Math.sin(clock.elapsedTime * 1.1) * 0.028;
    core.current?.scale.setScalar(breathe);
    if (group.current) group.current.rotation.y += delta * 0.09;
    if (light.current) light.current.intensity = 2.6 + Math.sin(clock.elapsedTime * 1.1) * 0.28;
  });
  return (
    <group ref={group}>
      <mesh scale={1.42}>
        <sphereGeometry args={[1, 56, 56]} />
        <meshPhysicalMaterial color="#c6fff0" emissive="#559f8e" emissiveIntensity={0.18} roughness={0.04} metalness={0} transmission={0.54} thickness={0.22} transparent opacity={0.16} depthWrite={false} />
      </mesh>
      <mesh scale={1.02}>
        <sphereGeometry args={[1, 56, 56]} />
        <meshPhysicalMaterial color="#dbfff5" emissive="#7ed2bd" emissiveIntensity={0.36} roughness={0.09} metalness={0} transmission={0.28} clearcoat={1} clearcoatRoughness={0.06} transparent opacity={0.42} />
      </mesh>
      <mesh ref={core} scale={0.56}>
        <sphereGeometry args={[1, 48, 48]} />
        <meshStandardMaterial color="#f6d9a3" emissive="#efb96c" emissiveIntensity={2.2} roughness={0.16} metalness={0} toneMapped={false} />
      </mesh>
      <OrbOrbit rx={1.56} ry={0.68} rotation={[0.45, 0.2, 0.18]} opacity={0.3} />
      <OrbOrbit rx={1.48} ry={0.74} rotation={[-0.32, 0.8, -0.24]} opacity={0.2} />
      <pointLight ref={light} color="#89e4cf" intensity={2.6} distance={8.5} decay={2} />
      <pointLight color="#f0bf7d" intensity={0.9} distance={4.8} decay={2} position={[0, -0.1, 0.5]} />
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
    <group ref={root} name="home-orb-sanctuary" position={ORB} scale={0.18} userData={{ runtimeAsset: ORB_MODEL, semanticOwner: "urai-home-webgl-orb", clip }} raycast={interactive ? undefined : DISABLED_RAYCAST} onClick={(event) => { event.stopPropagation(); onOpen(); }}>
      <Float speed={reducedMotion ? 0 : 0.4} rotationIntensity={reducedMotion ? 0 : 0.025} floatIntensity={reducedMotion ? 0 : 0.09}>
        <primitive object={orb} />
        <LivingOrbShell reducedMotion={reducedMotion} />
      </Float>
    </group>
  );
}

function EmbodiedPresence({ root }: { root: MutableRefObject<THREE.Group | null> }) {
  return (
    <group ref={root} name="home-authored-embodied-self" position={SPAWN} userData={{ semanticOwner: "urai-home-embodied-avatar", representation: "privacy-preserving-first-person-presence" }} raycast={DISABLED_RAYCAST}>
      <mesh position={[0, 0.012, 0.3]} rotation={[-Math.PI / 2, 0, 0]} scale={[0.45, 1.15, 1]}>
        <circleGeometry args={[0.4, 32]} />
        <meshBasicMaterial color="#020706" transparent opacity={0.16} depthWrite={false} />
      </mesh>
    </group>
  );
}

function GroundThresholdLandmark({ onEnter }: { onEnter: () => void }) {
  return (
    <group name="home-ground-environmental-threshold" position={GROUND_THRESHOLD} userData={{ destination: "ground", transition: "physical-descent", visiblePortal: false }}>
      <mesh position={[0, 0.55, 0]} onClick={(event) => { event.stopPropagation(); onEnter(); }}>
        <boxGeometry args={[3.6, 2.2, 3.6]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
      <pointLight color="#d6aa70" intensity={0.34} distance={5.2} decay={2} position={[0, 0.05, -0.7]} />
    </group>
  );
}

function LifeMapSkyLookout({ onEnter }: { onEnter: () => void }) {
  return (
    <group name="home-life-map-sky-lookout" position={LIFE_MAP_LOOKOUT} userData={{ destination: "life-map", transition: "sky-ascent", visiblePortal: false }}>
      <mesh position={[0, 0.8, 0]} onClick={(event) => { event.stopPropagation(); onEnter(); }}>
        <boxGeometry args={[3.6, 2.4, 3.6]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
      <pointLight color="#8ed3c4" intensity={0.28} distance={5.0} decay={2} position={[0, 1.3, -0.35]} />
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
    look.current.copy(position.current).addScaledVector(forward.current, portrait ? 6.4 : 8.4);
    camera.lookAt(look.current.x, 1.26 + pitch.current, look.current.z);
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
      cubicPoint(point.current, cameraStart.current, new THREE.Vector3(-3.6, 1.3, -5.5), new THREE.Vector3(-5.1, 0.2, -8.7), new THREE.Vector3(-3.8, -3.1, -13.6), eased);
      camera.position.copy(point.current);
      camera.lookAt(-4.8, -0.7 - eased, -13.1);
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
      if (linear >= 1 && !issued.current) {
        issued.current = true;
        requestUraiWorldTravel({ destination: "life-map", href: "/life-map/?from=home-sky", entryPortal: "home-sky", cameraCheckpoint: "home-sky-ascent-complete" });
      }
      return;
    }
    if (ascentStarted.current !== null) {
      ascentStarted.current = null;
      issued.current = false;
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
    look.current.copy(position.current).addScaledVector(forward.current, portrait ? 6.4 : 8.4);
    camera.lookAt(look.current.x, 1.26 + pitch.current, look.current.z);

    const distances: readonly [Nearby, THREE.Vector3, number][] = [
      ["orb", ORB, 2.05],
      ["ground", GROUND_THRESHOLD, 2.55],
      ["life-map", LIFE_MAP_LOOKOUT, 2.55],
    ];
    let next: Nearby = null;
    let best = Infinity;
    for (const [name, pointOfInterest, radius] of distances) {
      const distance = Math.hypot(position.current.x - pointOfInterest.x, position.current.z - pointOfInterest.z);
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

function HomeScene(props: {
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
      <color attach="background" args={[cosmic ? "#01050b" : "#071a1d"]} />
      <Sky distance={450000} sunPosition={[0, cosmic ? -2.2 : -0.65, -1]} inclination={0.56} azimuth={0.2} mieCoefficient={0.0015} mieDirectionalG={0.72} rayleigh={cosmic ? 0.12 : 0.32} turbidity={1.9} />
      <Stars radius={180} depth={82} count={cosmic ? 2100 : 1450} factor={cosmic ? 2.5 : 1.55} saturation={0.14} fade speed={props.reducedMotion ? 0 : 0.05} />
      <fogExp2 attach="fog" args={[cosmic ? "#050b14" : "#10292a", cosmic ? 0.0017 : 0.0075]} />
      <ambientLight intensity={cosmic ? 0.14 : 0.5} color="#b2cfc7" />
      <hemisphereLight args={["#9fc8c1", "#0b1713", cosmic ? 0.24 : 0.78]} />
      <directionalLight position={[12, 18, -18]} intensity={cosmic ? 0.36 : 2.0} color="#c9e1dc" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-near={0.5} shadow-camera-far={72} shadow-camera-left={-24} shadow-camera-right={24} shadow-camera-top={24} shadow-camera-bottom={-24} />
      <directionalLight position={[-8, 9, 7]} intensity={cosmic ? 0.12 : 0.52} color="#e0b77f" />
      <Moon />
      <AtmosphereParticles reducedMotion={props.reducedMotion} />
      <SceneReadiness onReady={props.onSceneReady} />
      <PlayerRig input={props.input} yaw={props.yaw} pitch={props.pitch} target={props.target} avatar={props.avatar} onNearby={props.onNearby} groundDescent={props.groundDescent} onGroundComplete={props.onGroundComplete} reducedMotion={props.reducedMotion} />
      <SanctuaryWorld walkTarget={props.target} reducedMotion={props.reducedMotion} />
      <EmbodiedPresence root={props.avatar} />
      <ReducedMotionContext.Provider value={props.reducedMotion}>
        <OrbStateContext.Provider value={props.orbState}>
          <OrbSanctuary onOpen={props.onOrbOpen} />
        </OrbStateContext.Provider>
      </ReducedMotionContext.Provider>
      <GroundThresholdLandmark onEnter={props.onGround} />
      <LifeMapSkyLookout onEnter={props.onLifeMap} />
      {!cosmic ? <ContactShadows position={[0, -0.08, -2.0]} opacity={0.24} scale={30} blur={4.2} far={15} resolution={512} frames={props.reducedMotion ? 1 : Infinity} /> : null}
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
  const pitch = useRef(-0.05);
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
    const store = useSceneStore.getState();
    if (store.inputLocked || groundDescent || store.phase === "ASCENT") return;
    target.current = null;
    setOrbState("transition");
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
    pitch.current = -0.05;
    target.current = SPAWN.clone();
    setTransitionSequence("idle");
  }, [groundDescent]);
  const input = useMovementInput({ enabled: !groundDescent, onInteract: interaction, onReset: reset });
  const look = useDragLook({ yaw, pitch, enabled: !groundDescent && phase !== "ASCENT", sensitivity: 0.0031, minPitch: -0.55, maxPitch: 0.68, onDragState: setDragging });

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
    const cancel = (event: KeyboardEvent) => {
      const store = useSceneStore.getState();
      if (event.key !== "Escape") return;
      if (store.phase === "ASCENT") {
        event.preventDefault();
        store.setPhase("HOME");
        store.unlock();
        setTransitionSequence("idle");
        setOrbState("idle");
        return;
      }
      if (groundDescent) {
        event.preventDefault();
        setGroundDescent(false);
        setTransitionSequence("idle");
        setOrbState("idle");
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
    <main className={`${styles.world} urai-asset-home-world`} data-urai-home-production data-urai-true-3d="true" data-home-primary-owner="asset-driven" data-home-real-world-first="true" data-home-visible-world="authored-coherent-three-dimensional-sanctuary" data-home-world-character="believable-natural-inhabitable-environment" data-home-visible-portals="false" data-home-transition-affordances="ground-environmental-descent life-map-sky-lookout" data-home-provider-environment={HOME_PROVIDER_ENVIRONMENT} data-home-provider-role="atmospheric-support-only" data-home-provider-regions="home-atmospheric-horizon" data-home-generated-scenery="suppressed" data-home-physical-base="authored-coherent-world" data-home-visual-ownership="three-dimensional-geometry" data-home-desktop-mobile-world="same-scene" data-home-embodied-self="privacy-preserving-shadow" data-home-movement="walk-keyboard-click-touch" data-home-pointer-lock="false" data-home-audio="production-opus-consent-controlled" data-home-assets-ready={ready ? "true" : "false"} data-home-runtime-assets="home-entry-chamber-v1.glb urai-orb-avatar-v1.glb replay-memory-film-main.webp" data-home-authored-regions="home-sanctuary-geometry home-mountain-horizon home-living-vegetation home-reflecting-water" data-home-nearby={nearby ?? "none"} data-home-camera-mode={groundDescent ? "descent" : phase === "ASCENT" ? "ascent" : dragging ? "look" : "embodied-first-person"} data-home-scene-phase={groundDescent ? "GROUND_DESCENT" : phase} data-home-ascent-progress={phase === "ASCENT" ? progress.toFixed(3) : "0.000"} data-home-input-locked={transitioning || inputLocked ? "true" : "false"} data-home-portal-sequence={transitionSequence} data-home-portal-lifecycle="environmental-approach-traversal-arrival" data-home-review-fixture={reviewFixture} data-home-orb-state={orbState} data-home-orb-clip={ORB_CLIPS[orbState]} data-home-animation-owner="provider-natural-world-plus-authored-physical-interactions" data-testid="home-visible-navigable-sanctuary-world" {...look}>
      <Canvas className={styles.canvas} dpr={[1, 1.5]} shadows camera={{ position: [0, 1.7, 8], fov: 54, near: 0.05, far: 280 }} gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }} onCreated={({ gl }) => {
        gl.outputColorSpace = THREE.SRGBColorSpace;
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.22;
        gl.setClearColor(0x000000, 0);
        setCanvasReady(true);
      }}>
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
