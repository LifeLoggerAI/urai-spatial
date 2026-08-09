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
const ORB = new THREE.Vector3(0, 1.62, -2.55);
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

const TREE_SPECS: readonly { position: Vec3; scale: number; yaw: number; tone: 0 | 1 | 2 }[] = [
  { position: [-10.9, 0, 7.1], scale: 1.42, yaw: 0.38, tone: 0 },
  { position: [-10.3, 0, 1.8], scale: 1.12, yaw: -0.24, tone: 1 },
  { position: [-11.5, 0, -5.8], scale: 1.55, yaw: 0.14, tone: 2 },
  { position: [-8.9, 0, -11.6], scale: 0.96, yaw: -0.35, tone: 1 },
  { position: [10.8, 0, 6.7], scale: 1.36, yaw: -0.32, tone: 1 },
  { position: [10.2, 0, 1.0], scale: 1.08, yaw: 0.28, tone: 2 },
  { position: [11.6, 0, -5.2], scale: 1.48, yaw: -0.15, tone: 0 },
  { position: [8.9, 0, -11.4], scale: 0.92, yaw: 0.36, tone: 2 },
];

const BOULDER_SPECS: readonly { position: Vec3; scale: Vec3; rotation: Vec3 }[] = [
  { position: [-8.2, 0.05, 5.3], scale: [1.25, 0.56, 0.88], rotation: [0.08, 0.7, -0.08] },
  { position: [-6.9, 0.01, 0.8], scale: [0.72, 0.38, 0.62], rotation: [-0.04, -0.3, 0.08] },
  { position: [-7.8, 0.02, -4.9], scale: [0.9, 0.46, 0.72], rotation: [0.06, 1.1, 0.02] },
  { position: [8.2, 0.04, 4.9], scale: [1.16, 0.52, 0.82], rotation: [-0.03, 0.35, -0.04] },
  { position: [7.2, 0.0, 0.4], scale: [0.7, 0.36, 0.58], rotation: [0.05, -0.8, 0.06] },
  { position: [7.8, 0.02, -5.2], scale: [0.96, 0.46, 0.74], rotation: [-0.05, 0.95, -0.02] },
  { position: [-3.4, -0.02, -10.6], scale: [0.65, 0.3, 0.52], rotation: [0.03, 0.5, 0.05] },
  { position: [3.2, -0.02, -10.8], scale: [0.68, 0.32, 0.54], rotation: [-0.02, -0.55, 0.04] },
];

function seeded(index: number, salt = 0) {
  const value = Math.sin(index * 91.73 + salt * 37.17) * 43758.5453;
  return value - Math.floor(value);
}

function terrainHeight(x: number, z: number) {
  const broad = Math.sin(x * 0.095) * 0.22 + Math.cos(z * 0.105) * 0.17 + Math.sin((x + z) * 0.052) * 0.11;
  const detail = Math.sin(x * 0.38 + z * 0.21) * 0.026 + Math.cos(z * 0.32 - x * 0.18) * 0.024;
  const meadow = -Math.exp(-((x / 8.6) ** 2 + ((z + 1.2) / 10.0) ** 2)) * 0.26;
  const waterBasin = -Math.exp(-(((x - 5.0) / 3.3) ** 2 + ((z + 6.7) / 4.6) ** 2)) * 0.32;
  return broad + detail + meadow + waterBasin - 0.12;
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
      data[index] = Math.round(24 + n * 6);
      data[index + 1] = Math.round(68 + n * 13);
      data[index + 2] = Math.round(49 + n * 9);
      data[index + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(12, 12);
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
  const colors = ["#45534e", "#56645d", "#374943"];
  return (
    <mesh position={position as [number, number, number]} scale={scale as [number, number, number]} rotation={rotation as [number, number, number]} castShadow receiveShadow>
      <icosahedronGeometry args={[1, 3]} />
      <meshStandardMaterial color={colors[tone % colors.length]} roughness={0.98} metalness={0} />
    </mesh>
  );
}

function MeadowTufts() {
  const count = 900;
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const color = new THREE.Color();
    for (let i = 0; i < count; i += 1) {
      const x = (seeded(i, 1) - 0.5) * 31;
      const z = (seeded(i, 2) - 0.5) * 33 - 2.5;
      const centerClear = Math.hypot(x * 0.72, z + 2.4) < 2.8;
      const pathClear = Math.abs(x) < 0.9 && z > -2.2 && z < 7.8;
      const poolClear = Math.hypot(x - 5.1, z + 6.2) < 3.7;
      if (centerClear || pathClear || poolClear) {
        dummy.scale.set(0, 0, 0);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        continue;
      }
      const height = 0.18 + seeded(i, 3) * 0.34;
      dummy.position.set(x, terrainHeight(x, z) + height * 0.48, z);
      dummy.rotation.set(0, seeded(i, 4) * Math.PI * 2, (seeded(i, 5) - 0.5) * 0.08);
      dummy.scale.set(0.55 + seeded(i, 6) * 0.8, height, 0.55 + seeded(i, 7) * 0.55);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      color.set(i % 5 === 0 ? "#457861" : i % 5 === 1 ? "#356952" : i % 5 === 2 ? "#285943" : "#214c3a");
      mesh.setColorAt(i, color);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [dummy]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} frustumCulled={false}>
      <coneGeometry args={[0.055, 1, 4, 1]} />
      <meshStandardMaterial vertexColors roughness={1} metalness={0} />
    </instancedMesh>
  );
}

function FlowerPoints({ tone, offset, count = 130 }: { tone: string; offset: number; count?: number }) {
  const geometry = useMemo(() => {
    const positions: number[] = [];
    for (let i = 0; i < count * 3; i += 1) {
      if (i % 3 !== offset) continue;
      const x = (seeded(i, 31) - 0.5) * 26;
      const z = (seeded(i, 32) - 0.5) * 25 - 1.5;
      if (Math.hypot(x * 0.72, z + 2.4) < 2.7 || Math.abs(x) < 0.75 && z > -2 && z < 7.5) continue;
      positions.push(x, terrainHeight(x, z) + 0.12 + seeded(i, 33) * 0.24, z);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    return g;
  }, [count, offset]);
  return (
    <points geometry={geometry}>
      <pointsMaterial color={tone} size={0.085} transparent opacity={0.8} depthWrite={false} sizeAttenuation toneMapped={false} />
    </points>
  );
}

function FireflyField({ reducedMotion }: { reducedMotion: boolean }) {
  const points = useRef<THREE.Points>(null);
  const geometry = useMemo(() => {
    const positions = new Float32Array(220 * 3);
    for (let i = 0; i < 220; i += 1) {
      const x = (seeded(i, 17) - 0.5) * 28;
      const z = (seeded(i, 18) - 0.5) * 24 - 2;
      positions[i * 3] = x;
      positions[i * 3 + 1] = terrainHeight(x, z) + 0.4 + seeded(i, 19) * 2.6;
      positions[i * 3 + 2] = z;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, []);
  useFrame(({ clock }) => {
    if (reducedMotion || !points.current) return;
    points.current.position.y = Math.sin(clock.elapsedTime * 0.32) * 0.05;
    points.current.rotation.y = Math.sin(clock.elapsedTime * 0.04) * 0.012;
  });
  return (
    <points ref={points} geometry={geometry}>
      <pointsMaterial color="#d9f7bd" size={0.06} transparent opacity={0.68} depthWrite={false} sizeAttenuation toneMapped={false} />
    </points>
  );
}

function NaturalTree({ position, scale, yaw, tone }: { position: Vec3; scale: number; yaw: number; tone: 0 | 1 | 2 }) {
  const dark = tone === 0 ? "#123a2b" : tone === 1 ? "#174432" : "#103629";
  const light = tone === 0 ? "#245844" : tone === 1 ? "#2a6049" : "#205440";
  const crown = [
    [-0.42, 3.2, 0.04, 1.05, 0.72, 0.82], [0.38, 3.28, -0.15, 0.98, 0.7, 0.78],
    [-0.9, 3.02, -0.1, 0.72, 0.58, 0.66], [0.93, 3.0, 0.08, 0.7, 0.56, 0.66],
    [0.04, 3.9, -0.04, 0.78, 0.66, 0.72], [-0.18, 2.68, 0.42, 0.73, 0.54, 0.68],
    [0.18, 2.7, -0.5, 0.68, 0.52, 0.64],
  ] as const;
  return (
    <group position={position as [number, number, number]} scale={scale} rotation={[0, yaw, 0]}>
      <mesh position={[0, 1.45, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.16, 0.3, 3.0, 10]} />
        <meshStandardMaterial color="#332820" roughness={1} />
      </mesh>
      <mesh position={[-0.34, 2.38, 0.02]} rotation={[0, 0.15, -0.72]} castShadow>
        <cylinderGeometry args={[0.07, 0.13, 1.35, 8]} />
        <meshStandardMaterial color="#352920" roughness={1} />
      </mesh>
      <mesh position={[0.38, 2.35, -0.05]} rotation={[0.05, -0.2, 0.74]} castShadow>
        <cylinderGeometry args={[0.065, 0.125, 1.3, 8]} />
        <meshStandardMaterial color="#352920" roughness={1} />
      </mesh>
      {crown.map(([x, y, z, sx, sy, sz], index) => (
        <mesh key={index} position={[x, y, z]} scale={[sx, sy, sz]} rotation={[seeded(index, tone) * 0.16, seeded(index, 7) * Math.PI, seeded(index, 3) * 0.12]} castShadow receiveShadow>
          <sphereGeometry args={[1, 18, 12]} />
          <meshStandardMaterial color={index % 3 === 0 ? light : dark} roughness={0.96} metalness={0} />
        </mesh>
      ))}
    </group>
  );
}

function NaturalVegetation({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <group name="home-living-vegetation" userData={{ role: "authored-runtime-natural-meadow", repeatedForgeVegetation: false }}>
      <MeadowTufts />
      <FlowerPoints tone="#f3f3dd" offset={0} />
      <FlowerPoints tone="#b9a9f0" offset={1} />
      <FlowerPoints tone="#ffe0a0" offset={2} />
      <FireflyField reducedMotion={reducedMotion} />
      {TREE_SPECS.map((tree, index) => <NaturalTree key={`tree-${index}`} {...tree} />)}
      {BOULDER_SPECS.map((rock, index) => <Rock key={`boulder-${index}`} {...rock} tone={index} />)}
    </group>
  );
}

function Ridge({ z, y, width, height, color, seed }: { z: number; y: number; width: number; height: number; color: string; seed: number }) {
  const geometry = useMemo(() => {
    const segments = 150;
    const vertices: number[] = [];
    const indices: number[] = [];
    for (let i = 0; i <= segments; i += 1) {
      const t = i / segments;
      const x = (t - 0.5) * width;
      const shoulder = Math.pow(Math.max(0, Math.sin(t * Math.PI)), 0.68);
      const longWave = Math.sin(t * Math.PI * (2.1 + seed * 0.11)) * 0.27;
      const midWave = Math.sin(t * Math.PI * 5.7 + seed) * 0.1;
      const detail = Math.sin(t * Math.PI * 11.3 + seed * 1.7) * 0.03;
      const top = y + (0.42 + longWave + midWave + detail) * height * shoulder;
      vertices.push(x, -8, 0, x, top, 0);
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
      <Ridge z={-31} y={-0.9} width={82} height={10.2} color="#1f4945" seed={1} />
      <Ridge z={-43} y={0.1} width={106} height={14.5} color="#17383b" seed={3} />
      <Ridge z={-58} y={1.0} width={132} height={19.5} color="#102a32" seed={6} />
      <Ridge z={-74} y={2.0} width={158} height={24} color="#0b1d27" seed={9} />
    </group>
  );
}

function SanctuaryPavilion() {
  return (
    <group name="home-sanctuary-geometry" userData={{ role: "inhabited-natural-resting-place" }}>
      <mesh position={[0, terrainHeight(0, -2.55) + 0.05, -2.55]} receiveShadow>
        <cylinderGeometry args={[2.15, 2.35, 0.18, 96]} />
        <meshStandardMaterial color="#53605a" roughness={0.92} metalness={0.02} />
      </mesh>
      <mesh position={[0, terrainHeight(0, -2.55) + 0.16, -2.55]} receiveShadow>
        <cylinderGeometry args={[1.72, 1.9, 0.12, 96]} />
        <meshStandardMaterial color="#6b766e" roughness={0.88} metalness={0.02} />
      </mesh>
      <mesh position={[0, terrainHeight(0, -2.55) + 0.235, -2.55]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.34, 0.025, 12, 128]} />
        <meshStandardMaterial color="#d9c48c" emissive="#b79052" emissiveIntensity={0.7} roughness={0.4} metalness={0.08} toneMapped={false} />
      </mesh>
      <mesh position={[0, terrainHeight(0, -2.55) + 0.25, -2.55]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.84, 0.89, 96]} />
        <meshBasicMaterial color="#bde7d8" transparent opacity={0.28} toneMapped={false} />
      </mesh>
      <Rock position={[-2.55, -0.03, -2.25]} scale={[0.82, 0.3, 0.6]} rotation={[0.04, 0.7, -0.05]} tone={1} />
      <Rock position={[2.6, -0.04, -2.5]} scale={[0.72, 0.28, 0.55]} rotation={[-0.04, -0.45, 0.02]} tone={2} />
      <pointLight color="#dcb780" intensity={0.42} distance={7} decay={2} position={[-2.6, 0.45, -2.4]} />
      <pointLight color="#8bd0c1" intensity={0.34} distance={7} decay={2} position={[2.6, 0.55, -2.6]} />
    </group>
  );
}

function SanctuaryPath() {
  const stones = useMemo(() => Array.from({ length: 20 }, (_, index) => {
    const t = index / 19;
    const x = Math.sin(t * Math.PI * 2.0) * 0.16;
    const z = 6.7 - t * 7.8;
    return { x, z, sx: 0.22 + seeded(index, 8) * 0.08, sz: 0.28 + seeded(index, 9) * 0.08, yaw: (seeded(index, 10) - 0.5) * 0.6 };
  }), []);
  return (
    <group name="home-natural-path-network" userData={{ role: "walkable-stone-path" }}>
      {stones.map((stone, index) => (
        <mesh key={index} position={[stone.x, terrainHeight(stone.x, stone.z) + 0.015, stone.z]} scale={[stone.sx * 1.7, 0.13, stone.sz]} rotation={[0, stone.yaw, 0]} receiveShadow>
          <cylinderGeometry args={[1, 1.1, 0.38, 12]} />
          <meshStandardMaterial color={index % 2 ? "#53625a" : "#657269"} roughness={1} metalness={0} />
        </mesh>
      ))}
    </group>
  );
}

function WaterGarden() {
  const pads = [
    [-1.6, -0.8, 0.34, 0.2], [-0.6, 0.9, 0.28, -0.4], [0.8, -0.3, 0.32, 0.6], [1.45, 0.75, 0.23, -0.8], [0.1, -1.35, 0.2, 0.3],
  ] as const;
  return (
    <group position={[5.0, -0.25, -6.8]} name="home-reflecting-water" userData={{ role: "moonlit-water-garden" }}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[1.35, 1, 1]} receiveShadow>
        <circleGeometry args={[3.0, 128]} />
        <meshPhysicalMaterial color="#174d60" emissive="#082934" emissiveIntensity={0.22} roughness={0.06} metalness={0.02} clearcoat={1} clearcoatRoughness={0.08} transparent opacity={0.82} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]} scale={[1.22, 1, 1]}>
        <ringGeometry args={[2.55, 2.72, 96]} />
        <meshBasicMaterial color="#78b7b0" transparent opacity={0.09} toneMapped={false} />
      </mesh>
      {pads.map(([x, z, size, yaw], index) => (
        <group key={index} position={[x, 0.035, z]} rotation={[0, yaw, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[1.25, 1, 1]}>
            <circleGeometry args={[size, 32, 0.22, Math.PI * 1.75]} />
            <meshStandardMaterial color="#2c6c54" roughness={0.9} />
          </mesh>
          {index === 1 || index === 3 ? (
            <mesh position={[0.02, 0.11, -0.02]}>
              <sphereGeometry args={[0.075, 16, 12]} />
              <meshStandardMaterial color="#ece7ff" emissive="#9b8fd0" emissiveIntensity={0.25} roughness={0.7} />
            </mesh>
          ) : null}
        </group>
      ))}
      <pointLight position={[-1.8, 0.35, 1.3]} color="#79c6bc" intensity={0.28} distance={5} decay={2} />
    </group>
  );
}

function LanternNook() {
  return (
    <group position={[-6.5, 0, -5.4]} name="home-warm-sanctuary-nook" userData={{ role: "warm-home-anchor" }}>
      <Rock position={[0, 0.0, 0]} scale={[1.7, 0.82, 1.25]} rotation={[0.02, 0.38, -0.03]} tone={1} />
      <Rock position={[-1.0, -0.05, 0.25]} scale={[0.9, 0.42, 0.72]} rotation={[0.03, -0.4, 0.02]} tone={2} />
      <mesh position={[0.2, 0.48, 0.52]}>
        <sphereGeometry args={[0.11, 20, 16]} />
        <meshStandardMaterial color="#ffd79b" emissive="#f1a74f" emissiveIntensity={3.4} toneMapped={false} />
      </mesh>
      <pointLight position={[0.2, 0.65, 0.52]} color="#ffc77b" intensity={1.25} distance={7} decay={2} />
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

function MilkyWay({ reducedMotion }: { reducedMotion: boolean }) {
  const points = useRef<THREE.Points>(null);
  const geometry = useMemo(() => {
    const positions: number[] = [];
    for (let i = 0; i < 900; i += 1) {
      const t = seeded(i, 51);
      const spread = (seeded(i, 52) - 0.5) * (2.0 + t * 4.5);
      const x = -8 + t * 18 + spread;
      const y = 10 + t * 34 + (seeded(i, 53) - 0.5) * 4;
      const z = -52 - t * 35 + (seeded(i, 54) - 0.5) * 8;
      positions.push(x, y, z);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    return g;
  }, []);
  useFrame((_, delta) => {
    if (reducedMotion || !points.current) return;
    points.current.rotation.z += delta * 0.00035;
  });
  return (
    <points ref={points} geometry={geometry}>
      <pointsMaterial color="#c5d8ff" size={0.085} transparent opacity={0.52} depthWrite={false} sizeAttenuation toneMapped={false} />
    </points>
  );
}

function Moon() {
  return (
    <group position={[12, 15.5, -52]} name="home-moon-rim-light">
      <mesh>
        <sphereGeometry args={[2.2, 56, 56]} />
        <meshBasicMaterial color="#e5f0ed" toneMapped={false} />
      </mesh>
      <mesh scale={1.23}>
        <sphereGeometry args={[2.2, 48, 48]} />
        <meshBasicMaterial color="#93cfc5" transparent opacity={0.06} depthWrite={false} toneMapped={false} />
      </mesh>
      <pointLight color="#b8d9d4" intensity={1.2} distance={75} decay={2} />
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
        <meshStandardMaterial map={TERRAIN_TEXTURE} color="#35664f" roughness={0.98} metalness={0} />
      </mesh>
      <NaturalHorizon />
      <NaturalVegetation reducedMotion={reducedMotion} />
      <SanctuaryPath />
      <SanctuaryPavilion />
      <WaterGarden />
      <LanternNook />
      <mesh name="home-walkable-navigation-surface" rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.55, -1.5]} onClick={onWalk}>
        <planeGeometry args={[25, 27]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
    </group>
  );
}

function orbitGeometry(radiusX: number, radiusY: number) {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i < 112; i += 1) {
    const t = (i / 112) * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(t) * radiusX, Math.sin(t) * radiusY, 0));
  }
  return new THREE.BufferGeometry().setFromPoints(points);
}

function OrbOrbit({ rx, ry, rotation, opacity, color = "#c6fff0" }: { rx: number; ry: number; rotation: Vec3; opacity: number; color?: string }) {
  const geometry = useMemo(() => orbitGeometry(rx, ry), [rx, ry]);
  return (
    <lineLoop geometry={geometry} rotation={rotation as [number, number, number]}>
      <lineBasicMaterial color={color} transparent opacity={opacity} toneMapped={false} />
    </lineLoop>
  );
}

function LivingOrbShell({ reducedMotion }: { reducedMotion: boolean }) {
  const group = useRef<THREE.Group>(null);
  const core = useRef<THREE.Mesh>(null);
  const inner = useRef<THREE.Mesh>(null);
  const light = useRef<THREE.PointLight>(null);
  useFrame(({ clock }, delta) => {
    if (reducedMotion) return;
    const breathe = 1 + Math.sin(clock.elapsedTime * 1.08) * 0.032;
    core.current?.scale.setScalar(breathe);
    inner.current?.scale.setScalar(1 + Math.sin(clock.elapsedTime * 0.82 + 0.8) * 0.018);
    if (group.current) group.current.rotation.y += delta * 0.085;
    if (light.current) light.current.intensity = 3.5 + Math.sin(clock.elapsedTime * 1.08) * 0.38;
  });
  return (
    <group ref={group}>
      <mesh scale={1.5}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshPhysicalMaterial color="#c9fff2" emissive="#4d9e8b" emissiveIntensity={0.24} roughness={0.035} metalness={0} transmission={0.58} thickness={0.26} transparent opacity={0.18} depthWrite={false} />
      </mesh>
      <mesh ref={inner} scale={1.08}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshPhysicalMaterial color="#e1fff7" emissive="#7fd9c4" emissiveIntensity={0.48} roughness={0.08} metalness={0} transmission={0.3} clearcoat={1} clearcoatRoughness={0.05} transparent opacity={0.48} />
      </mesh>
      <mesh ref={core} scale={0.56}>
        <sphereGeometry args={[1, 56, 56]} />
        <meshStandardMaterial color="#ffe6b7" emissive="#f3bb67" emissiveIntensity={3.4} roughness={0.14} metalness={0} toneMapped={false} />
      </mesh>
      <OrbOrbit rx={1.66} ry={0.72} rotation={[0.45, 0.2, 0.18]} opacity={0.38} />
      <OrbOrbit rx={1.58} ry={0.78} rotation={[-0.32, 0.8, -0.24]} opacity={0.28} color="#ffe1a2" />
      <OrbOrbit rx={1.42} ry={0.9} rotation={[0.1, -0.55, 0.7]} opacity={0.2} />
      <pointLight ref={light} color="#8ce8d2" intensity={3.5} distance={11} decay={2} />
      <pointLight color="#f4c37e" intensity={1.35} distance={6.5} decay={2} position={[0, -0.1, 0.55]} />
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
    <group ref={root} name="home-orb-sanctuary" position={ORB} scale={0.46} userData={{ runtimeAsset: ORB_MODEL, semanticOwner: "urai-home-webgl-orb", clip }} raycast={interactive ? undefined : DISABLED_RAYCAST} onClick={(event) => { event.stopPropagation(); onOpen(); }}>
      <Float speed={reducedMotion ? 0 : 0.42} rotationIntensity={reducedMotion ? 0 : 0.024} floatIntensity={reducedMotion ? 0 : 0.1}>
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
        <meshBasicMaterial color="#020706" transparent opacity={0.14} depthWrite={false} />
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
      <pointLight color="#d6aa70" intensity={0.44} distance={5.8} decay={2} position={[0, 0.05, -0.7]} />
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
      <pointLight color="#8ed3c4" intensity={0.34} distance={5.4} decay={2} position={[0, 1.3, -0.35]} />
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
    camera.lookAt(look.current.x, 1.38 + pitch.current, look.current.z);
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
    camera.lookAt(look.current.x, 1.38 + pitch.current, look.current.z);

    const distances: readonly [Nearby, THREE.Vector3, number][] = [
      ["orb", ORB, 2.2],
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
      <color attach="background" args={[cosmic ? "#01050b" : "#06141b"]} />
      <Sky distance={450000} sunPosition={[0, cosmic ? -2.2 : -0.8, -1]} inclination={0.57} azimuth={0.21} mieCoefficient={0.0014} mieDirectionalG={0.72} rayleigh={cosmic ? 0.12 : 0.3} turbidity={1.7} />
      <Stars radius={190} depth={90} count={cosmic ? 2400 : 1900} factor={cosmic ? 2.6 : 1.85} saturation={0.16} fade speed={props.reducedMotion ? 0 : 0.045} />
      <fogExp2 attach="fog" args={[cosmic ? "#050b14" : "#0b2225", cosmic ? 0.0017 : 0.0062]} />
      <ambientLight intensity={cosmic ? 0.14 : 0.58} color="#b8d5cd" />
      <hemisphereLight args={["#a6ced0", "#07120e", cosmic ? 0.24 : 0.9]} />
      <directionalLight position={[12, 18, -18]} intensity={cosmic ? 0.36 : 2.25} color="#d1e9e5" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-near={0.5} shadow-camera-far={72} shadow-camera-left={-24} shadow-camera-right={24} shadow-camera-top={24} shadow-camera-bottom={-24} />
      <directionalLight position={[-8, 9, 7]} intensity={cosmic ? 0.12 : 0.62} color="#e7bb7e" />
      <Moon />
      <MilkyWay reducedMotion={props.reducedMotion} />
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
      {!cosmic ? <ContactShadows position={[0, -0.06, -2.2]} opacity={0.36} scale={32} blur={3.8} far={17} resolution={512} frames={props.reducedMotion ? 1 : 1} /> : null}
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
  const pitch = useRef(-0.04);
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
    pitch.current = -0.04;
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
      <Canvas className={styles.canvas} dpr={[1, 1.45]} shadows camera={{ position: [0, 1.7, 8], fov: 52, near: 0.05, far: 300 }} gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }} onCreated={({ gl }) => {
        gl.outputColorSpace = THREE.SRGBColorSpace;
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.38;
        gl.shadowMap.type = THREE.PCFSoftShadowMap;
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
