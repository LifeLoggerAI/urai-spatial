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
const ORB = new THREE.Vector3(0, 1.6, -2.7);
const GROUND_THRESHOLD = new THREE.Vector3(-6.9, 0, -11.8);
const LIFE_MAP_LOOKOUT = new THREE.Vector3(6.9, 0, -11.8);
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

const TREE_SPECS: readonly { position: Vec3; scale: number; lean: number; tone: 0 | 1 | 2 }[] = [
  { position: [-10.8, 0, 7.0], scale: 1.35, lean: -0.06, tone: 0 },
  { position: [-9.0, 0, 2.5], scale: 1.1, lean: 0.04, tone: 1 },
  { position: [-11.2, 0, -3.0], scale: 1.6, lean: -0.04, tone: 2 },
  { position: [-9.8, 0, -7.4], scale: 1.28, lean: 0.05, tone: 0 },
  { position: [-8.5, 0, -12.7], scale: 1.0, lean: -0.03, tone: 1 },
  { position: [10.7, 0, 6.6], scale: 1.3, lean: 0.05, tone: 1 },
  { position: [9.1, 0, 2.0], scale: 1.16, lean: -0.05, tone: 2 },
  { position: [11.1, 0, -3.6], scale: 1.52, lean: 0.03, tone: 0 },
  { position: [9.7, 0, -7.8], scale: 1.22, lean: -0.04, tone: 2 },
  { position: [8.3, 0, -12.8], scale: 1.02, lean: 0.04, tone: 1 },
];

const BOULDER_SPECS: readonly { position: Vec3; scale: Vec3; rotation: Vec3 }[] = [
  { position: [-7.6, 0.06, 5.3], scale: [1.5, 0.72, 1.0], rotation: [0.08, 0.7, -0.08] },
  { position: [-6.5, 0.02, 1.4], scale: [0.82, 0.45, 0.7], rotation: [-0.04, -0.3, 0.08] },
  { position: [-7.3, 0.02, -4.2], scale: [1.0, 0.55, 0.78], rotation: [0.06, 1.1, 0.02] },
  { position: [7.5, 0.04, 5.0], scale: [1.3, 0.62, 0.9], rotation: [-0.03, 0.35, -0.04] },
  { position: [6.7, 0.0, 1.0], scale: [0.8, 0.42, 0.66], rotation: [0.05, -0.8, 0.06] },
  { position: [7.3, 0.02, -4.7], scale: [1.08, 0.54, 0.82], rotation: [-0.05, 0.95, -0.02] },
  { position: [-3.8, -0.02, -9.8], scale: [0.72, 0.38, 0.58], rotation: [0.03, 0.5, 0.05] },
  { position: [3.6, -0.02, -10.4], scale: [0.75, 0.40, 0.60], rotation: [-0.02, -0.55, 0.04] },
];

function terrainHeight(x: number, z: number) {
  const broad = Math.sin(x * 0.105) * 0.3 + Math.cos(z * 0.11) * 0.22 + Math.sin((x + z) * 0.055) * 0.18;
  const detail = Math.sin(x * 0.43 + z * 0.26) * 0.055 + Math.cos(z * 0.37 - x * 0.21) * 0.045;
  const meadow = -Math.exp(-((x / 7.8) ** 2 + ((z + 1.3) / 9.0) ** 2)) * 0.42;
  const creek = -Math.exp(-(((x - 1.1) / 2.3) ** 2 + ((z + 9.6) / 5.8) ** 2)) * 0.55;
  return broad + detail + meadow + creek - 0.22;
}

function makeTerrainGeometry() {
  const geometry = new THREE.PlaneGeometry(76, 76, 190, 190);
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
      const low = Math.sin(x * 0.027) * 0.55 + Math.cos(y * 0.031) * 0.45;
      const grain = Math.sin(x * 0.17 + y * 0.09) * 0.45 + Math.cos(y * 0.21 - x * 0.06) * 0.35;
      const n = THREE.MathUtils.clamp(low * 0.58 + grain * 0.42, -1, 1);
      data[index] = Math.round(22 + n * 5);
      data[index + 1] = Math.round(48 + n * 10);
      data[index + 2] = Math.round(39 + n * 7);
      data[index + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(11, 11);
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
  if (/path|step|terrace/.test(id)) material.color.set("#3b4138");
  else if (/basin|pedestal|stone/.test(id)) material.color.set("#4a514c");
  else if (/water|pool|stream/.test(id)) material.color.set("#234c56");
  else if (/terrain|ground|moss|garden/.test(id)) material.color.set("#274638");
  else if (/wood|beam|timber/.test(id)) material.color.set("#3c3027");
  else material.color.set("#37443e");
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

function seeded(index: number, salt = 0) {
  const v = Math.sin(index * 91.73 + salt * 37.17) * 43758.5453;
  return v - Math.floor(v);
}

function Rock({ position, scale, rotation, tone = 0 }: { position: Vec3; scale: Vec3; rotation: Vec3; tone?: number }) {
  const colors = ["#39443f", "#46514b", "#303c38"];
  return (
    <mesh position={position as [number, number, number]} scale={scale as [number, number, number]} rotation={rotation as [number, number, number]} castShadow receiveShadow>
      <icosahedronGeometry args={[1, 2]} />
      <meshStandardMaterial color={colors[tone % colors.length]} roughness={0.98} metalness={0} />
    </mesh>
  );
}

function NaturalTree({ position, scale, lean, tone }: { position: Vec3; scale: number; lean: number; tone: 0 | 1 | 2 }) {
  const leaf = tone === 0 ? "#173c2f" : tone === 1 ? "#1d4434" : "#12372e";
  const leafLit = tone === 0 ? "#285343" : tone === 1 ? "#2d5c47" : "#244f42";
  const canopy = [
    [-0.32, 3.35, 0.02, 1.0], [0.38, 3.28, -0.15, 0.9], [-0.8, 3.05, -0.1, 0.72],
    [0.92, 3.0, 0.08, 0.68], [0.05, 3.95, -0.04, 0.76], [-0.2, 2.72, 0.42, 0.7],
  ] as const;
  return (
    <group position={position as [number, number, number]} scale={scale} rotation={[0, lean * 3.0, lean]}>
      <mesh position={[0, 1.55, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.18, 0.33, 3.2, 9]} />
        <meshStandardMaterial color="#31251f" roughness={1} metalness={0} />
      </mesh>
      <mesh position={[-0.34, 2.55, 0]} rotation={[0, 0, -0.55]} castShadow>
        <cylinderGeometry args={[0.08, 0.15, 1.5, 7]} />
        <meshStandardMaterial color="#352820" roughness={1} />
      </mesh>
      <mesh position={[0.38, 2.45, -0.02]} rotation={[0, 0, 0.62]} castShadow>
        <cylinderGeometry args={[0.07, 0.14, 1.45, 7]} />
        <meshStandardMaterial color="#352820" roughness={1} />
      </mesh>
      {canopy.map(([x, y, z, s], index) => (
        <mesh key={index} position={[x, y, z]} scale={[s * 1.1, s * 0.78, s]} castShadow receiveShadow rotation={[seeded(index, tone) * 0.24, seeded(index, 7) * Math.PI, seeded(index, 3) * 0.16]}>
          <icosahedronGeometry args={[1, 2]} />
          <meshStandardMaterial color={index % 3 === 0 ? leafLit : leaf} roughness={0.98} metalness={0} />
        </mesh>
      ))}
    </group>
  );
}

function GrassField() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const color = new THREE.Color();
    for (let i = 0; i < 1200; i += 1) {
      const x = (seeded(i, 1) - 0.5) * 31;
      const z = (seeded(i, 2) - 0.5) * 34 - 2;
      if (Math.hypot(x * 0.72, z + 1.5) < 2.1) continue;
      const h = 0.32 + seeded(i, 3) * 0.55;
      dummy.position.set(x, terrainHeight(x, z) + h * 0.48, z);
      dummy.rotation.set(0, seeded(i, 4) * Math.PI, (seeded(i, 5) - 0.5) * 0.16);
      dummy.scale.set(0.035 + seeded(i, 6) * 0.045, h, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      color.set(i % 4 === 0 ? "#315848" : i % 4 === 1 ? "#284d40" : "#203f36");
      mesh.setColorAt(i, color);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [dummy]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, 1200]} castShadow={false} receiveShadow={false} frustumCulled={false}>
      <planeGeometry args={[1, 1, 1, 2]} />
      <meshStandardMaterial vertexColors side={THREE.DoubleSide} roughness={1} metalness={0} />
    </instancedMesh>
  );
}

function NaturalVegetation() {
  return (
    <group name="home-living-vegetation" userData={{ role: "authored-runtime-natural-grove", repeatedForgeVegetation: false }}>
      <GrassField />
      {TREE_SPECS.map((tree, index) => <NaturalTree key={`tree-${index}`} {...tree} />)}
      {BOULDER_SPECS.map((rock, index) => <Rock key={`boulder-${index}`} {...rock} tone={index} />)}
    </group>
  );
}

function Ridge({ z, y, width, height, color, seed }: { z: number; y: number; width: number; height: number; color: string; seed: number }) {
  const geometry = useMemo(() => {
    const segments = 64;
    const vertices: number[] = [];
    const indices: number[] = [];
    for (let i = 0; i <= segments; i += 1) {
      const t = i / segments;
      const x = (t - 0.5) * width;
      const ridge = Math.sin(t * Math.PI * (2.6 + seed * 0.1)) * 0.42 + Math.sin(t * Math.PI * 7.3 + seed) * 0.16 + Math.sin(t * Math.PI * 13.7 + seed * 2.1) * 0.07;
      const peak = Math.pow(Math.max(0, Math.sin(t * Math.PI)), 0.72);
      const top = y + (0.48 + ridge) * height * peak;
      vertices.push(x, -5, 0, x, top, 0);
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
      <Ridge z={-34} y={-1.0} width={86} height={12} color="#132c2d" seed={1} />
      <Ridge z={-48} y={0.5} width={108} height={17} color="#102328" seed={3} />
      <Ridge z={-66} y={2.0} width={134} height={22} color="#0b1920" seed={6} />
    </group>
  );
}

function SanctuaryPavilion() {
  return (
    <group name="home-sanctuary-geometry" userData={{ role: "inhabited-natural-shelter" }}>
      <Rock position={[-2.35, -0.05, -2.0]} scale={[1.05, 0.4, 0.72]} rotation={[0.04, 0.7, -0.05]} tone={1} />
      <Rock position={[2.55, -0.06, -2.3]} scale={[0.9, 0.36, 0.66]} rotation={[-0.04, -0.45, 0.02]} tone={2} />
      <pointLight color="#d5b07a" intensity={0.26} distance={5.5} decay={2} position={[-2.5, 0.45, -2.4]} />
      <pointLight color="#99c7bc" intensity={0.18} distance={5.2} decay={2} position={[2.5, 0.6, -2.6]} />
    </group>
  );
}

function SanctuaryPath() {
  const stones = useMemo(() => Array.from({ length: 18 }, (_, index) => {
    const t = index / 17;
    const x = Math.sin(t * Math.PI * 2.1) * 0.26;
    const z = 6.4 - t * 8.5;
    return { x, z, scale: 0.18 + seeded(index, 8) * 0.16, yaw: (seeded(index, 9) - 0.5) * 1.1 };
  }), []);
  return (
    <group name="home-natural-path-network" userData={{ role: "walkable-stone-path" }}>
      {stones.map((stone, index) => (
        <mesh key={index} position={[stone.x, terrainHeight(stone.x, stone.z) + 0.01, stone.z]} scale={[1.6, 0.2, 1]} rotation={[0, stone.yaw, 0]} receiveShadow>
          <icosahedronGeometry args={[stone.scale, 1]} />
          <meshStandardMaterial color={index % 2 ? "#3b4540" : "#465049"} roughness={1} metalness={0} />
        </mesh>
      ))}
    </group>
  );
}

function AtmosphereParticles({ reducedMotion }: { reducedMotion: boolean }) {
  const points = useRef<THREE.Points>(null);
  const geometry = useMemo(() => {
    const positions = new Float32Array(720 * 3);
    for (let i = 0; i < 720; i += 1) {
      positions[i * 3] = (seeded(i, 12) - 0.5) * 58;
      positions[i * 3 + 1] = 0.5 + seeded(i, 13) * 13;
      positions[i * 3 + 2] = -36 + seeded(i, 14) * 55;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, []);
  useFrame((_, delta) => {
    if (reducedMotion || !points.current) return;
    points.current.rotation.y += delta * 0.0025;
    points.current.position.y = Math.sin(performance.now() * 0.00011) * 0.06;
  });
  return (
    <points ref={points} geometry={geometry}>
      <pointsMaterial color="#a6d8c6" size={0.035} transparent opacity={0.32} depthWrite={false} sizeAttenuation />
    </points>
  );
}

function Moon() {
  return (
    <group position={[12, 15, -48]} name="home-moon-rim-light">
      <mesh>
        <sphereGeometry args={[2.6, 40, 40]} />
        <meshBasicMaterial color="#dbe8e4" toneMapped={false} />
      </mesh>
      <mesh scale={1.13}>
        <sphereGeometry args={[2.6, 32, 32]} />
        <meshBasicMaterial color="#a9d6ce" transparent opacity={0.07} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
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
      <primitive object={authoredWorld} />
      <mesh name="home-natural-terrain" geometry={TERRAIN_GEOMETRY} receiveShadow onClick={onWalk}>
        <meshStandardMaterial map={TERRAIN_TEXTURE} color="#315243" roughness={1} metalness={0} />
      </mesh>
      <NaturalHorizon />
      <NaturalVegetation />
      <SanctuaryPath />
      <SanctuaryPavilion />
      <mesh name="home-walkable-navigation-surface" rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.55, -2.0]} onClick={onWalk}>
        <planeGeometry args={[25, 27]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
      <mesh name="home-reflecting-water" position={[0.8, -0.58, -12.3]} rotation={[-Math.PI / 2, 0, 0]} scale={[2.2, 1.0, 1.0]} receiveShadow>
        <circleGeometry args={[3.2, 128]} />
        <meshPhysicalMaterial color="#163e49" roughness={0.08} metalness={0.02} clearcoat={1} clearcoatRoughness={0.12} transparent opacity={0.72} />
      </mesh>
    </group>
  );
}

function LivingOrbShell({ reducedMotion }: { reducedMotion: boolean }) {
  const core = useRef<THREE.Mesh>(null);
  const halo = useRef<THREE.Mesh>(null);
  const light = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    if (reducedMotion) return;
    const breathe = 1 + Math.sin(clock.elapsedTime * 1.15) * 0.035;
    core.current?.scale.setScalar(breathe);
    halo.current?.scale.setScalar(1 + Math.sin(clock.elapsedTime * 0.72 + 1.4) * 0.045);
    if (light.current) light.current.intensity = 3.0 + Math.sin(clock.elapsedTime * 1.15) * 0.35;
  });
  return (
    <group>
      <mesh ref={halo} scale={1.65}>
        <sphereGeometry args={[1, 48, 48]} />
        <meshPhysicalMaterial color="#b9f4e5" emissive="#4c9d8a" emissiveIntensity={0.18} roughness={0.06} metalness={0} transmission={0.5} thickness={0.35} transparent opacity={0.2} depthWrite={false} />
      </mesh>
      <mesh scale={1.24}>
        <sphereGeometry args={[1, 48, 48]} />
        <meshPhysicalMaterial color="#d8fff4" emissive="#7fd7c2" emissiveIntensity={0.45} roughness={0.12} metalness={0} transmission={0.22} clearcoat={1} clearcoatRoughness={0.08} transparent opacity={0.7} />
      </mesh>
      <mesh ref={core} scale={0.72}>
        <sphereGeometry args={[1, 40, 40]} />
        <meshStandardMaterial color="#f2cf94" emissive="#f2b76c" emissiveIntensity={2.8} roughness={0.2} metalness={0} toneMapped={false} />
      </mesh>
      <pointLight ref={light} color="#8ce8d2" intensity={3.0} distance={11} decay={2} />
      <pointLight color="#f1c17d" intensity={1.5} distance={6.5} decay={2} position={[0, -0.2, 0.7]} />
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
    <group ref={root} name="home-orb-sanctuary" position={ORB} scale={0.5} userData={{ runtimeAsset: ORB_MODEL, semanticOwner: "urai-home-webgl-orb", clip }} raycast={interactive ? undefined : DISABLED_RAYCAST} onClick={(event) => { event.stopPropagation(); onOpen(); }}>
      <Float speed={reducedMotion ? 0 : 0.55} rotationIntensity={reducedMotion ? 0 : 0.04} floatIntensity={reducedMotion ? 0 : 0.14}>
        <primitive object={orb} />
        <LivingOrbShell reducedMotion={reducedMotion} />
      </Float>
    </group>
  );
}

function EmbodiedPresence({ root }: { root: MutableRefObject<THREE.Group | null> }) {
  return (
    <group ref={root} name="home-authored-embodied-self" position={SPAWN} userData={{ semanticOwner: "urai-home-embodied-avatar", representation: "privacy-preserving-first-person-presence" }} raycast={DISABLED_RAYCAST}>
      <mesh position={[0, 0.015, 0.3]} rotation={[-Math.PI / 2, 0, 0]} scale={[0.48, 1.25, 1]}>
        <circleGeometry args={[0.42, 32]} />
        <meshBasicMaterial color="#020706" transparent opacity={0.2} depthWrite={false} />
      </mesh>
    </group>
  );
}

function GroundThresholdLandmark({ onEnter }: { onEnter: () => void }) {
  return (
    <group name="home-ground-environmental-threshold" position={GROUND_THRESHOLD} userData={{ destination: "ground", transition: "physical-descent", visiblePortal: false }}>
      <mesh position={[0, 0.45, 0]} onClick={(event) => { event.stopPropagation(); onEnter(); }}>
        <boxGeometry args={[4.2, 2.0, 4.2]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
      <pointLight color="#d6ab70" intensity={0.36} distance={5.5} decay={2} position={[0, 0.0, -0.8]} />
    </group>
  );
}

function LifeMapSkyLookout({ onEnter }: { onEnter: () => void }) {
  return (
    <group name="home-life-map-sky-lookout" position={LIFE_MAP_LOOKOUT} userData={{ destination: "life-map", transition: "sky-ascent", visiblePortal: false }}>
      <mesh position={[0, 0.85, 0]} onClick={(event) => { event.stopPropagation(); onEnter(); }}>
        <boxGeometry args={[4.0, 2.5, 4.0]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
      <pointLight color="#8fd4c6" intensity={0.25} distance={5.5} decay={2} position={[0, 1.4, -0.4]} />
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
    desired.current.copy(position.current).add(new THREE.Vector3(0, portrait ? 1.62 : 1.72, portrait ? 0.18 : 0.12).applyAxisAngle(up.current, yaw.current));
    camera.position.copy(desired.current);
    look.current.copy(position.current).addScaledVector(forward.current, portrait ? 7.0 : 9.2);
    camera.lookAt(look.current.x, 1.4 + pitch.current, look.current.z);
  }, [camera, pitch, size.height, size.width, yaw]);
  useLayoutEffect(() => { place(); }, [place]);

  useFrame(({ clock }, delta) => {
    const store = useSceneStore.getState();
    if (groundDescent) {
      if (groundStarted.current === null) { groundStarted.current = clock.elapsedTime; cameraStart.current.copy(camera.position); velocity.current.set(0, 0, 0); target.current = null; onNearby(null); }
      const duration = reducedMotion ? 0.45 : GROUND_DESCENT_DURATION_SECONDS;
      const linear = THREE.MathUtils.clamp((clock.elapsedTime - groundStarted.current) / duration, 0, 1);
      const eased = THREE.MathUtils.smootherstep(linear, 0, 1);
      cubicPoint(point.current, cameraStart.current, new THREE.Vector3(-4.8, 1.4, -8.0), new THREE.Vector3(-7.0, 0.0, -12.8), new THREE.Vector3(-4.8, -3.6, -17.5), eased);
      camera.position.copy(point.current); camera.lookAt(-6.0, -0.9 - eased, -17.0); store.setProgress(linear);
      if (linear >= 1 && !groundIssued.current) { groundIssued.current = true; onGroundComplete(); }
      return;
    }
    if (groundStarted.current !== null) { groundStarted.current = null; groundIssued.current = false; }
    if (store.phase === "ASCENT") {
      if (ascentStarted.current === null) { ascentStarted.current = clock.elapsedTime; cameraStart.current.copy(camera.position); velocity.current.set(0, 0, 0); target.current = null; onNearby(null); }
      const duration = reducedMotion ? 0.45 : ASCENT_DURATION_SECONDS;
      const linear = THREE.MathUtils.clamp((clock.elapsedTime - ascentStarted.current) / duration, 0, 1);
      const eased = THREE.MathUtils.smootherstep(linear, 0, 1);
      cubicPoint(point.current, cameraStart.current, new THREE.Vector3(5.2, 10.5, -11), new THREE.Vector3(2.0, 27, -28), new THREE.Vector3(0, 52, -62), eased);
      camera.position.copy(point.current); camera.lookAt(0, 12 + eased * 38, -34 - eased * 48); store.setProgress(linear);
      if (linear >= 1 && !issued.current) { issued.current = true; requestUraiWorldTravel({ destination: "life-map", href: "/life-map/?from=home-sky", entryPortal: "home-sky", cameraCheckpoint: "home-sky-ascent-complete" }); }
      return;
    }
    if (ascentStarted.current !== null) { ascentStarted.current = null; issued.current = false; }

    stepEmbodiedMotion({ delta, input, yaw: yaw.current, position: position.current, velocity: velocity.current, target, bounds: HOME_BOUNDS, speed: 3.25, acceleration: 8.5, deceleration: 12 });
    if (target.current && position.current.distanceTo(target.current) < 0.2) target.current = null;
    if (avatar.current) { avatar.current.position.copy(position.current); avatar.current.rotation.y = yaw.current; }
    const portrait = size.height > size.width;
    forward.current.set(Math.sin(yaw.current), 0, -Math.cos(yaw.current));
    desired.current.copy(position.current).add(new THREE.Vector3(0, portrait ? 1.62 : 1.72, portrait ? 0.18 : 0.12).applyAxisAngle(up.current, yaw.current));
    camera.position.lerp(desired.current, 1 - Math.pow(0.0008, delta));
    look.current.copy(position.current).addScaledVector(forward.current, portrait ? 7.0 : 9.2);
    camera.lookAt(look.current.x, 1.4 + pitch.current, look.current.z);

    const distances: readonly [Nearby, THREE.Vector3, number][] = [["orb", ORB, 2.55], ["ground", GROUND_THRESHOLD, 3.2], ["life-map", LIFE_MAP_LOOKOUT, 3.2]];
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
      <color attach="background" args={[cosmic ? "#01040a" : "#041015"]} />
      <Sky distance={450000} sunPosition={[0, cosmic ? -2.2 : -0.8, -1]} inclination={0.56} azimuth={0.2} mieCoefficient={0.0018} mieDirectionalG={0.72} rayleigh={cosmic ? 0.14 : 0.42} turbidity={2.2} />
      <Stars radius={180} depth={80} count={cosmic ? 1900 : 1250} factor={cosmic ? 2.6 : 1.65} saturation={0.16} fade speed={props.reducedMotion ? 0 : 0.06} />
      <fogExp2 attach="fog" args={[cosmic ? "#050b14" : "#0a1c1d", cosmic ? 0.0018 : 0.012]} />
      <ambientLight intensity={cosmic ? 0.12 : 0.28} color="#9bbab1" />
      <hemisphereLight args={["#82aca8", "#07100d", cosmic ? 0.2 : 0.48]} />
      <directionalLight position={[12, 18, -18]} intensity={cosmic ? 0.3 : 1.35} color="#bedbd5" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-near={0.5} shadow-camera-far={72} shadow-camera-left={-24} shadow-camera-right={24} shadow-camera-top={24} shadow-camera-bottom={-24} />
      <directionalLight position={[-8, 8, 6]} intensity={cosmic ? 0.1 : 0.34} color="#d7ad78" />
      <Moon />
      <AtmosphereParticles reducedMotion={props.reducedMotion} />
      <SceneReadiness onReady={props.onSceneReady} />
      <PlayerRig input={props.input} yaw={props.yaw} pitch={props.pitch} target={props.target} avatar={props.avatar} onNearby={props.onNearby} groundDescent={props.groundDescent} onGroundComplete={props.onGroundComplete} reducedMotion={props.reducedMotion} />
      <SanctuaryWorld walkTarget={props.target} />
      <EmbodiedPresence root={props.avatar} />
      <ReducedMotionContext.Provider value={props.reducedMotion}><OrbStateContext.Provider value={props.orbState}><OrbSanctuary onOpen={props.onOrbOpen} /></OrbStateContext.Provider></ReducedMotionContext.Provider>
      <GroundThresholdLandmark onEnter={props.onGround} />
      <LifeMapSkyLookout onEnter={props.onLifeMap} />
      {!cosmic ? <ContactShadows position={[0, -0.12, -2.8]} opacity={0.34} scale={32} blur={3.6} far={16} resolution={512} frames={props.reducedMotion ? 1 : Infinity} /> : null}
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
  const look = useDragLook({ yaw, pitch, enabled: !groundDescent && phase !== "ASCENT", sensitivity: 0.0031, minPitch: -0.55, maxPitch: 0.68, onDragState: setDragging });

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
    <main className={`${styles.world} urai-asset-home-world`} data-urai-home-production data-urai-true-3d="true" data-home-primary-owner="asset-driven" data-home-real-world-first="true" data-home-visible-world="authored-coherent-three-dimensional-sanctuary" data-home-world-character="believable-natural-inhabitable-environment" data-home-visible-portals="false" data-home-transition-affordances="ground-environmental-descent life-map-sky-lookout" data-home-provider-environment={HOME_PROVIDER_ENVIRONMENT} data-home-provider-role="atmospheric-support-only" data-home-provider-regions="home-atmospheric-horizon" data-home-generated-scenery="suppressed" data-home-physical-base="authored-coherent-world" data-home-visual-ownership="three-dimensional-geometry" data-home-desktop-mobile-world="same-scene" data-home-embodied-self="privacy-preserving-shadow" data-home-movement="walk-keyboard-click-touch" data-home-pointer-lock="false" data-home-audio="production-opus-consent-controlled" data-home-assets-ready={ready ? "true" : "false"} data-home-runtime-assets="home-entry-chamber-v1.glb urai-orb-avatar-v1.glb replay-memory-film-main.webp" data-home-authored-regions="home-sanctuary-geometry home-mountain-horizon home-living-vegetation home-reflecting-water" data-home-nearby={nearby ?? "none"} data-home-camera-mode={groundDescent ? "descent" : phase === "ASCENT" ? "ascent" : dragging ? "look" : "embodied-first-person"} data-home-scene-phase={groundDescent ? "GROUND_DESCENT" : phase} data-home-ascent-progress={phase === "ASCENT" ? progress.toFixed(3) : "0.000"} data-home-input-locked={transitioning || inputLocked ? "true" : "false"} data-home-portal-sequence={transitionSequence} data-home-portal-lifecycle="environmental-approach-traversal-arrival" data-home-review-fixture={reviewFixture} data-home-orb-state={orbState} data-home-orb-clip={ORB_CLIPS[orbState]} data-home-animation-owner="provider-natural-world-plus-authored-physical-interactions" data-testid="home-visible-navigable-sanctuary-world" {...look}>
      <Canvas className={styles.canvas} dpr={[1, 1.5]} shadows camera={{ position: [0, 1.72, 8], fov: 54, near: 0.05, far: 280 }} gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }} onCreated={({ gl }) => { gl.outputColorSpace = THREE.SRGBColorSpace; gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.08; gl.setClearColor(0x000000, 0); setCanvasReady(true); }}>
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
