"use client";

import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Environment, useGLTF, useTexture } from "@react-three/drei";
import { useRouter, useSearchParams } from "next/navigation";
import { Component, Suspense, useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import * as THREE from "three";
import {
  MobileMovementPad,
  clearVirtualMovement,
  setVirtualMovement,
  stepEmbodiedMotion,
  useDragLook,
  useMovementInput,
  type MovementInput,
  type MovementObstacle,
} from "@/spatial/navigation/EmbodiedNavigation";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import {
  DEFAULT_GROUND_WEATHER,
  GROUND_ACCELERATION_MPS2,
  GROUND_ARRIVAL_RADIUS_M,
  GROUND_DECELERATION_MPS2,
  GROUND_DESKTOP_SPEED_MPS,
  GROUND_EYE_HEIGHT_M,
  GROUND_LANDSCAPE_FOV_DEG,
  GROUND_MOBILE_SPEED_MPS,
  GROUND_NEAR_PLANE_M,
  GROUND_PORTRAIT_FOV_DEG,
  buildGroundObstacleField,
  slopeDegrees,
  slopeSpeedMultiplier,
} from "@/spatial/ground/groundCanon";

type EnvironmentProfileId = "temperate" | "urban" | "woodland" | "arid" | "coastal";

type EnvironmentProfile = {
  id: EnvironmentProfileId;
  label: string;
  ground: string;
  groundDeep: string;
  accent: string;
  horizon: string;
  fog: string;
  roughness: number;
  textureRepeat: [number, number];
};

const PROFILES: Record<EnvironmentProfileId, EnvironmentProfile> = {
  temperate: { id: "temperate", label: "Temperate lived world", ground: "#596552", groundDeep: "#30382f", accent: "#86916f", horizon: "#46564d", fog: "#74877d", roughness: 0.94, textureRepeat: [18, 22] },
  urban: { id: "urban", label: "Urban lived world", ground: "#66645f", groundDeep: "#34363a", accent: "#8a8177", horizon: "#56616a", fog: "#87919a", roughness: 0.88, textureRepeat: [12, 14] },
  woodland: { id: "woodland", label: "Woodland lived world", ground: "#414d3f", groundDeep: "#252d27", accent: "#68795d", horizon: "#39483f", fog: "#687b70", roughness: 0.97, textureRepeat: [20, 24] },
  arid: { id: "arid", label: "Arid lived world", ground: "#8a6f52", groundDeep: "#554235", accent: "#b28c62", horizon: "#8c725d", fog: "#ba9b7b", roughness: 0.91, textureRepeat: [7, 9] },
  coastal: { id: "coastal", label: "Coastal lived world", ground: "#807563", groundDeep: "#4d504b", accent: "#a69b81", horizon: "#66818a", fog: "#8fa7aa", roughness: 0.89, textureRepeat: [10, 12] },
};

const BOUNDS = { minX: -28, maxX: 28, minZ: -48, maxZ: 16 };
const SPAWN = new THREE.Vector3(0, 0, 6);
const ROCK_01 = "/assets/urai/home-production/cc0/polyhaven-v48/rock_face_01/asset.gltf";
const ROCK_02 = "/assets/urai/home-production/cc0/polyhaven-v48/rock_face_02/asset.gltf";
const FERN = "/assets/urai/home-production/cc0/polyhaven-v48/fern_02/asset.gltf";
const NATURAL_CANOPY = "/assets/urai/generated/models/ground-natural-canopy-v3.glb";
const TERRAIN_ALBEDO = "/assets/urai/home-production/cc0/rock-tile-floor/rock-tile-floor-diff-1k.webp";
const TERRAIN_NORMAL = "/assets/urai/home-production/cc0/rock-tile-floor/rock-tile-floor-normal-gl-1k.webp";
const TERRAIN_ARM = "/assets/urai/home-production/cc0/rock-tile-floor/rock-tile-floor-arm-1k.webp";

function resolveProfile(raw: string | null): EnvironmentProfile {
  if (raw && raw in PROFILES) return PROFILES[raw as EnvironmentProfileId];
  return PROFILES.temperate;
}

function groundHeight(x: number, z: number, profile: EnvironmentProfileId) {
  const broad = Math.sin(x * 0.115 + z * 0.052) * 0.24 + Math.cos(z * 0.083 - x * 0.041) * 0.18;
  const micro = Math.sin(x * 0.73 + z * 0.39) * 0.035 + Math.cos(x * 1.17 - z * 0.54) * 0.022;
  const path = Math.exp(-Math.pow(x - Math.sin(z * 0.09) * 1.1, 2) / 7.2) * -0.08;
  if (profile === "urban") return broad * 0.12 + micro * 0.08;
  if (profile === "arid") return broad * 1.35 + micro * 0.5 + path * 0.25;
  if (profile === "coastal") return broad * 0.48 + micro * 0.3 + Math.max(0, (-z - 21) * 0.005);
  if (profile === "woodland") return broad * 1.24 + micro * 1.02 + path * 1.18;
  return broad * 1.02 + micro * 0.86 + path * 1.06;
}

function buildTerrainGeometry(profile: EnvironmentProfile) {
  const geometry = new THREE.PlaneGeometry(64, 72, 128, 144);
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, 0, -16);
  const position = geometry.getAttribute("position") as THREE.BufferAttribute;
  const uv = geometry.getAttribute("uv") as THREE.BufferAttribute;
  const colors = new Float32Array(position.count * 3);
  const low = new THREE.Color(profile.groundDeep);
  const mid = new THREE.Color(profile.ground);
  const high = new THREE.Color(profile.accent);
  const naturalSoil = new THREE.Color(profile.id === "woodland" ? "#3b382d" : "#4a4b39");
  const naturalMoss = new THREE.Color(profile.id === "woodland" ? "#506449" : "#637657");
  const naturalProfile = profile.id === "temperate" || profile.id === "woodland";
  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index);
    const z = position.getZ(index);
    const y = groundHeight(x, z, profile.id);
    position.setY(index, y);
    const mineral = 0.5 + 0.5 * Math.sin(x * 0.29 + z * 0.17) * Math.cos(x * 0.11 - z * 0.23);
    const wear = Math.exp(-Math.pow(x - Math.sin(z * 0.09) * 1.1, 2) / 5.5);
    const broadPatch = 0.5 + 0.5 * Math.sin(x * 0.17 + z * 0.13 + Math.sin(z * 0.07) * 1.4);
    const finePatch = 0.5 + 0.5 * Math.sin(x * 0.91 - z * 0.73) * Math.cos(x * 0.37 + z * 0.49);
    const color = naturalProfile
      ? naturalSoil.clone()
          .lerp(naturalMoss, THREE.MathUtils.clamp(0.18 + broadPatch * 0.48 + finePatch * 0.14 - wear * 0.12, 0.08, 0.78))
          .lerp(high, Math.max(0, y) * 0.045 + wear * 0.025)
      : low.clone().lerp(mid, 0.48 + mineral * 0.28).lerp(high, Math.max(0, y) * 0.11 + wear * 0.045);
    colors[index * 3] = color.r;
    colors[index * 3 + 1] = color.g;
    colors[index * 3 + 2] = color.b;
  }
  position.needsUpdate = true;
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("uv2", new THREE.BufferAttribute(new Float32Array(uv.array as ArrayLike<number>), 2));
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function TerrainMaterial({ profile }: { profile: EnvironmentProfile }) {
  const [albedo, normal, arm] = useTexture([TERRAIN_ALBEDO, TERRAIN_NORMAL, TERRAIN_ARM]);
  useMemo(() => {
    albedo.colorSpace = THREE.SRGBColorSpace;
    for (const texture of [albedo, normal, arm]) {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(profile.textureRepeat[0], profile.textureRepeat[1]);
      texture.anisotropy = 4;
      texture.needsUpdate = true;
    }
    return null;
  }, [albedo, arm, normal, profile]);
  const naturalSoilProfile = profile.id === "temperate" || profile.id === "woodland";
  if (naturalSoilProfile) {
    return <meshStandardMaterial
      color="#ffffff"
      roughness={profile.id === "woodland" ? 0.98 : 0.96}
      metalness={0}
      vertexColors
      envMapIntensity={profile.id === "woodland" ? 0.18 : 0.22}
    />;
  }
  const normalStrength = profile.id === "urban" ? 0.34 : 0.58;
  return <meshStandardMaterial
    normalMap={normal}
    normalScale={new THREE.Vector2(normalStrength, normalStrength)}
    aoMap={arm}
    aoMapIntensity={0.68}
    roughnessMap={arm}
    roughness={profile.roughness}
    metalnessMap={arm}
    metalness={profile.id === "urban" ? 0.02 : 0.005}
    vertexColors
    envMapIntensity={0.42}
  />;
}

function normalizedClone(source: THREE.Object3D) {
  const clone = source.clone(true);
  const box = new THREE.Box3().setFromObject(clone);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const normalization = 1 / Math.max(size.x, size.y, size.z, 0.001);
  clone.scale.setScalar(normalization);
  clone.position.set(-center.x * normalization, -box.min.y * normalization, -center.z * normalization);
  clone.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.castShadow = true;
    object.receiveShadow = true;
    const sourceMaterials = Array.isArray(object.material) ? object.material : [object.material];
    const materials = sourceMaterials.map((sourceMaterial) => {
      const material = sourceMaterial.clone();
      if (material instanceof THREE.MeshStandardMaterial) {
        material.roughness = Math.max(material.roughness, 0.86);
        material.metalness = Math.min(material.metalness, 0.02);
        material.envMapIntensity = 0.42;
      }
      return material;
    });
    object.material = Array.isArray(object.material) ? materials : materials[0];
  });
  return clone;
}

function ScannedRock({ variant, position, rotation, scale }: {
  variant: "01" | "02";
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
}) {
  const asset = useGLTF(variant === "01" ? ROCK_01 : ROCK_02);
  const model = useMemo(() => normalizedClone(asset.scene), [asset.scene]);
  useEffect(() => () => model.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material) => material.dispose());
  }), [model]);
  return <group position={position} rotation={rotation} scale={scale} raycast={() => null}><primitive object={model} /></group>;
}

function FernPatch({ position, rotationY, scale }: { position: [number, number, number]; rotationY: number; scale: number }) {
  const asset = useGLTF(FERN);
  const model = useMemo(() => normalizedClone(asset.scene), [asset.scene]);
  useEffect(() => () => model.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material) => material.dispose());
  }), [model]);
  return <group position={position} rotation={[0, rotationY, 0]} scale={scale} raycast={() => null}><primitive object={model} /></group>;
}

class GroundCanopyBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? null : this.props.children; }
}

function CanopyLeafInstances({ geometry, leaves, color }: {
  geometry: THREE.BufferGeometry;
  leaves: ReadonlyArray<{ position: [number, number, number]; rotation: [number, number, number]; scale: [number, number, number] }>;
  color: string;
}) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useEffect(() => {
    const owner = mesh.current;
    if (!owner) return;
    leaves.forEach((leaf, index) => {
      dummy.position.set(...leaf.position);
      dummy.rotation.set(...leaf.rotation);
      dummy.scale.set(...leaf.scale);
      dummy.updateMatrix();
      owner.setMatrixAt(index, dummy.matrix);
    });
    owner.instanceMatrix.needsUpdate = true;
    owner.computeBoundingSphere();
  }, [dummy, leaves]);
  return <instancedMesh ref={mesh} args={[geometry, undefined, leaves.length]} castShadow receiveShadow frustumCulled>
    <meshStandardMaterial color={color} roughness={0.84} metalness={0} envMapIntensity={0.34} />
  </instancedMesh>;
}

function NaturalCanopy({ profile, position, rotationY, scale, shapeSeed }: {
  profile: EnvironmentProfile;
  position: [number, number, number];
  rotationY: number;
  scale: number;
  shapeSeed: number;
}) {
  const authored = useMemo(() => {
    const woodland = profile.id === "woodland";
    const trunkColor = woodland ? "#3a3027" : "#493a2c";
    const branchColor = woodland ? "#42372d" : "#514334";
    const leafA = woodland ? "#314b38" : "#526b50";
    const leafB = woodland ? "#3f5a40" : "#63745a";
    const leafC = woodland ? "#496047" : "#6c7d60";
    const leafD = woodland ? "#273f31" : "#465f49";

    const shapePhase = shapeSeed * 0.731;
    const trunkLeanX = (((shapeSeed * 17) % 19) - 9) * 0.008;
    const trunkLeanZ = (((shapeSeed * 23) % 17) - 8) * 0.007;
    const crownWidth = 0.74 + ((shapeSeed * 29) % 37) / 100;
    const crownDepth = 0.76 + ((shapeSeed * 31) % 33) / 100;
    const crownLift = 0.92 + ((shapeSeed * 11) % 19) / 100;
    const trunkCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(-0.035 + trunkLeanX * 0.35, 0.56, 0.018 + trunkLeanZ * 0.25),
      new THREE.Vector3(0.042 + trunkLeanX * 0.72, 1.16, -0.028 + trunkLeanZ * 0.58),
      new THREE.Vector3(-0.018 + trunkLeanX * 1.05, 1.78, 0.034 + trunkLeanZ * 0.94),
      new THREE.Vector3(0.046 + trunkLeanX * 1.35, 2.42 * crownLift, -0.026 + trunkLeanZ * 1.28),
      new THREE.Vector3(0.012 + trunkLeanX * 1.58, 2.72 * crownLift, 0.014 + trunkLeanZ * 1.48),
    ]);
    const trunkGeometry = new THREE.TubeGeometry(trunkCurve, 52, 0.102 + ((shapeSeed * 7) % 13) * 0.0018, 14, false);

    const branchDefs = [
      [[0.02, 1.12, 0.00], [0.30, 1.46, 0.06], [0.72, 1.73, 0.15], [1.02, 1.94, 0.23]],
      [[-0.01, 1.28, 0.02], [-0.28, 1.56, -0.04], [-0.66, 1.84, -0.16], [-0.98, 2.03, -0.22]],
      [[0.04, 1.47, -0.02], [0.18, 1.77, -0.30], [0.38, 2.02, -0.62], [0.56, 2.18, -0.88]],
      [[-0.02, 1.63, 0.02], [-0.14, 1.90, 0.28], [-0.34, 2.12, 0.56], [-0.56, 2.28, 0.82]],
      [[0.04, 1.83, 0.00], [0.34, 2.02, -0.10], [0.62, 2.20, -0.24], [0.82, 2.36, -0.34]],
      [[0.00, 1.96, 0.00], [-0.28, 2.12, 0.10], [-0.56, 2.29, 0.22], [-0.78, 2.42, 0.34]],
      [[0.03, 2.12, 0.00], [0.18, 2.31, 0.24], [0.30, 2.47, 0.48]],
      [[0.00, 2.24, -0.01], [-0.16, 2.40, -0.22], [-0.28, 2.54, -0.42]],
    ] as const;
    const transformedBranchDefs = branchDefs.map((points, branchIndex) => points.map(([x, y, z], pointIndex) => [
      x * crownWidth + trunkLeanX * y * 0.72 + Math.sin(shapePhase + branchIndex * 1.91 + pointIndex * 0.73) * 0.035,
      y * crownLift + Math.cos(shapePhase * 0.7 + branchIndex * 0.83 + pointIndex) * 0.025,
      z * crownDepth + trunkLeanZ * y * 0.66 + Math.cos(shapePhase + branchIndex * 1.37 + pointIndex * 0.61) * 0.035,
    ] as [number, number, number]));
    const branches = transformedBranchDefs.map((points, index) => new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z))),
      22,
      index < 2 ? 0.036 : 0.024,
      10,
      false,
    ));

    const leafGeometry = new THREE.SphereGeometry(1, 16, 12);
    leafGeometry.scale(0.72, 0.22, 0.94);
    leafGeometry.computeVertexNormals();

    const foliageAnchors = [
      ...transformedBranchDefs.map((points) => points[points.length - 1]),
      [trunkLeanX * 2.55, 2.67 * crownLift, trunkLeanZ * 2.45] as const,
      [0.22 * crownWidth + trunkLeanX * 2.2, 2.48 * crownLift, 0.10 * crownDepth + trunkLeanZ * 2.0] as const,
      [-0.21 * crownWidth + trunkLeanX * 2.15, 2.50 * crownLift, -0.09 * crownDepth + trunkLeanZ * 2.05] as const,
    ];
    const hash = (seed: number) => {
      const value = Math.sin(seed * 12.9898 + shapeSeed * 53.117 + (woodland ? 78.233 : 31.417)) * 43758.5453;
      return value - Math.floor(value);
    };
    const leaves = Array.from({ length: woodland ? 640 : 580 }, (_, index) => {
      const anchor = foliageAnchors[index % foliageAnchors.length];
      const spread = 0.06 + hash(index * 7 + 1) * 0.52;
      const theta = hash(index * 7 + 2) * Math.PI * 2;
      const x = anchor[0] + Math.cos(theta) * spread * (0.48 + hash(index * 7 + 3) * 0.92);
      const y = anchor[1] - 0.03 + (hash(index * 7 + 4) - 0.47) * 0.86;
      const z = anchor[2] + Math.sin(theta) * spread * (0.46 + hash(index * 7 + 5) * 0.88);
      const rx = (hash(index * 7 + 6) - 0.5) * 1.28;
      const ry = theta + (hash(index * 7 + 7) - 0.5) * 1.15;
      const rz = (hash(index * 7 + 8) - 0.5) * 1.12;
      const sx = 0.046 + hash(index * 7 + 9) * 0.036;
      const sy = 0.026 + hash(index * 7 + 10) * 0.022;
      const sz = 0.060 + hash(index * 7 + 11) * 0.050;
      return {
        position: [x, y, z] as [number, number, number],
        rotation: [rx, ry, rz] as [number, number, number],
        scale: [sx, sy, sz] as [number, number, number],
        color: index % 7 === 0 ? leafD : index % 5 === 0 ? leafC : index % 3 === 0 ? leafB : leafA,
      };
    });
    const leavesA = leaves.filter((leaf) => leaf.color === leafA);
    const leavesB = leaves.filter((leaf) => leaf.color === leafB);
    const leavesC = leaves.filter((leaf) => leaf.color === leafC);
    const leavesD = leaves.filter((leaf) => leaf.color === leafD);
    return { trunkGeometry, branches, leafGeometry, leavesA, leavesB, leavesC, leavesD, leafA, leafB, leafC, leafD, trunkColor, branchColor };
  }, [profile.id, shapeSeed]);

  useEffect(() => () => {
    authored.trunkGeometry.dispose();
    authored.leafGeometry.dispose();
    authored.branches.forEach((geometry) => geometry.dispose());
  }, [authored]);

  return <group
    position={position}
    rotation={[0, rotationY, 0]}
    scale={[
      scale * (0.84 + ((shapeSeed * 37) % 17) / 100),
      scale * (0.94 + ((shapeSeed * 19) % 13) / 100),
      scale * (0.82 + ((shapeSeed * 29) % 21) / 100),
    ]}
    raycast={() => null}
    name="ground-authored-natural-canopy-v13"
    userData={{
      treatment: "seed-varied-branch-architecture-layered-broadleaf-canopy-v28",
      provenance: NATURAL_CANOPY,
      visibleAuthority: "runtime-authored-canopy-v28",
      supersedesVisibleCandidate: "ground-v27-laned-canopy-rock-tile-microdetail",
      literalPixelRepair: "v28-organic-canopy-layout-procedural-soil-no-paving",
      supplementalPixelRepair: "v28-smoother-smaller-foliage-with-bounded-instancing",
      retainedContract: "ground-v25-pbr-terrain-dense-3d-canopy-atmospheric-depth",
    }}
  >
    <mesh geometry={authored.trunkGeometry} castShadow receiveShadow>
      <meshStandardMaterial color={authored.trunkColor} roughness={0.93} metalness={0} envMapIntensity={0.28} />
    </mesh>
    {authored.branches.map((geometry, index) => <mesh key={index} geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial color={authored.branchColor} roughness={0.94} metalness={0} envMapIntensity={0.26} />
    </mesh>)}
    <CanopyLeafInstances geometry={authored.leafGeometry} leaves={authored.leavesA} color={authored.leafA} />
    <CanopyLeafInstances geometry={authored.leafGeometry} leaves={authored.leavesB} color={authored.leafB} />
    <CanopyLeafInstances geometry={authored.leafGeometry} leaves={authored.leavesC} color={authored.leafC} />
    <CanopyLeafInstances geometry={authored.leafGeometry} leaves={authored.leavesD} color={authored.leafD} />
  </group>;
}

function urbanFootprint(index: number) {
  const width = 1.15 + (index % 4) * 0.26;
  const depth = 0.9 + (index % 3) * 0.22;
  const notch = width * (0.18 + (index % 2) * 0.07);
  const shape = new THREE.Shape();
  shape.moveTo(-width, -depth);
  shape.lineTo(width, -depth);
  shape.lineTo(width, depth * 0.55);
  shape.lineTo(width - notch, depth);
  shape.lineTo(-width * 0.35, depth);
  shape.lineTo(-width, depth * 0.48);
  shape.closePath();
  return shape;
}

function UrbanBuilding({ index, x, z, heightValue }: { index: number; x: number; z: number; heightValue: number }) {
  const geometry = useMemo(() => {
    const next = new THREE.ExtrudeGeometry(urbanFootprint(index), { depth: heightValue, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 2, steps: 1 });
    next.rotateX(-Math.PI / 2);
    next.translate(0, heightValue * 0.5, 0);
    next.computeVertexNormals();
    return next;
  }, [heightValue, index]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const windows = useMemo(() => Array.from({ length: Math.max(2, Math.min(7, Math.floor(heightValue / 1.6))) }, (_, row) => row), [heightValue]);
  return <group position={[x, 0, z]} raycast={() => null}>
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial color={index % 3 === 0 ? "#555d61" : index % 3 === 1 ? "#676766" : "#4c5358"} roughness={0.78} metalness={0.02} />
    </mesh>
    {windows.map((row) => <mesh key={row} position={[0, 1.15 + row * 1.35, 0.96 + (index % 3) * 0.08]} scale={[0.85 + (index % 2) * 0.25, 0.12, 1]}>
      <planeGeometry args={[1, 1]} />
      <meshStandardMaterial color="#77878a" emissive="#52656a" emissiveIntensity={0.08} roughness={0.32} metalness={0.02} />
    </mesh>)}
  </group>;
}

function CoastalWater() {
  const water = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!water.current) return;
    water.current.position.y = -0.27 + Math.sin(clock.elapsedTime * 0.45) * 0.018;
    water.current.rotation.z = Math.sin(clock.elapsedTime * 0.17) * 0.0015;
  });
  return <mesh ref={water} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.27, -44]} receiveShadow raycast={() => null}>
    <planeGeometry args={[96, 42, 16, 10]} />
    <meshPhysicalMaterial color="#2d5a66" roughness={0.14} metalness={0.02} clearcoat={0.34} clearcoatRoughness={0.22} transmission={0.03} transparent opacity={0.92} envMapIntensity={0.72} />
  </mesh>;
}

function NaturalScatter({ profile }: { profile: EnvironmentProfile }) {
  const items = useMemo(() => {
    const hash = (seed: number) => {
      const value = Math.sin(seed * 12.9898 + profile.id.length * 41.733) * 43758.5453;
      return value - Math.floor(value);
    };
    return Array.from({ length: profile.id === "urban" ? 18 : 92 }, (_, index) => {
      const side = hash(index * 5 + 1) > 0.5 ? -1 : 1;
      const lane = 5.8 + hash(index * 5 + 2) * 17.8;
      const x = side * lane + (hash(index * 5 + 3) - 0.5) * 4.8;
      const z = 4.5 - hash(index * 5 + 4) * 58;
      const y = groundHeight(x, z, profile.id);
      const scale = 0.52 + hash(index * 5 + 5) * 0.94;
      return { x, y, z, scale, index };
    });
  }, [profile]);

  if (profile.id === "urban") {
    return <group name="ground-urban-horizon" userData={{ treatment: "distant-irregular-extruded-skyline-not-box-placeholders" }} raycast={() => null}>
      {items.map((item) => <UrbanBuilding key={item.index} index={item.index} x={item.x * 1.15} z={Math.min(-34, item.z - 21)} heightValue={5.8 + (item.index % 6) * 1.55} />)}
    </group>;
  }
  if (profile.id === "arid") {
    return <group name="ground-arid-scanned-geology" userData={{ treatment: "polyhaven-scanned-rock-field" }} raycast={() => null}>
      {items.slice(0, 18).map((item) => <ScannedRock key={item.index} variant={item.index % 2 ? "01" : "02"} position={[item.x, item.y - 0.02, item.z]} rotation={[0, item.index * 0.41, 0]} scale={[2.2 * item.scale, 1.25 * item.scale, 2.45 * item.scale]} />)}
    </group>;
  }
  if (profile.id === "coastal") {
    return <group name="ground-coastal-world" userData={{ treatment: "scanned-rock-shore-and-physical-water" }} raycast={() => null}>
      <CoastalWater />
      {items.slice(0, 10).map((item) => <ScannedRock key={item.index} variant={item.index % 2 ? "01" : "02"} position={[item.x, item.y - 0.08, item.z]} rotation={[0, item.index * 0.47, 0]} scale={[1.25 * item.scale, 0.62 * item.scale, 1.5 * item.scale]} />)}
    </group>;
  }

  const woodland = profile.id === "woodland";
  const ferns = items.slice(0, woodland ? 58 : 50);
  const canopies = items.filter((item) => item.z < (woodland ? 8.0 : 6.5)).slice(0, woodland ? 34 : 30);
  return <group name={woodland ? "ground-woodland-scanned-understory" : "ground-temperate-scanned-understory"} userData={{ treatment: "urai-self-authored-varied-canopy-v13-with-polyhaven-fern-rock-understory", canopyFallback: "scanned-understory-remains-without-canopy" }} raycast={() => null}>
    <GroundCanopyBoundary>
      <Suspense fallback={null}>
        {canopies.map((item) => {
          const organicX = Math.sin((item.index + 1) * 4.83) * 17.6 + Math.cos((item.index + 3) * 1.37) * 6.2;
          const z = item.z - 2.8 + Math.cos(item.index * 1.61) * 4.1 + Math.sin(item.index * 0.83) * 1.9;
          const spawnCorridor = Math.abs(organicX) < 3.1 && z > -10;
          const x = spawnCorridor
            ? organicX + (organicX >= 0 ? 4.4 : -4.4)
            : organicX;
          return <NaturalCanopy
            key={`canopy-${item.index}`}
            profile={profile}
            position={[x, groundHeight(x, z, profile.id) - 0.02, z]}
            rotationY={item.index * 1.173 + Math.sin(item.index * 0.67) * 0.74 + (woodland ? 0.22 : -0.14)}
            scale={(woodland ? 2.38 : 2.24) + item.scale * 0.72 + Math.sin(item.index * 2.31) * 0.18}
            shapeSeed={item.index + (woodland ? 101 : 17)}
          />;
        })}
      </Suspense>
    </GroundCanopyBoundary>
    {ferns.map((item) => <FernPatch key={`fern-${item.index}`} position={[item.x * 0.72, groundHeight(item.x * 0.72, item.z - 1.3, profile.id), item.z - 1.3]} rotationY={item.index * 0.73} scale={0.82 + item.scale * 0.45} />)}
    {items.slice(0, 12).map((item) => <ScannedRock key={`rock-${item.index}`} variant={item.index % 2 ? "01" : "02"} position={[item.x * 0.55, groundHeight(item.x * 0.55, item.z + 2.2, profile.id) - 0.1, item.z + 2.2]} rotation={[0, item.index * 0.39, 0]} scale={[0.82 * item.scale, 0.48 * item.scale, 0.94 * item.scale]} />)}
  </group>;
}

function buildDistantRidgeGeometry(profile: EnvironmentProfile) {
  const columns = 48;
  const rows = 6;
  const positions: number[] = [];
  const indices: number[] = [];
  const profileLift = profile.id === "urban" ? 0.52 : profile.id === "coastal" ? 0.58 : 1;
  for (let row = 0; row <= rows; row += 1) {
    const v = row / rows;
    const z = THREE.MathUtils.lerp(-154, -246, v);
    const envelope = Math.sin(v * Math.PI);
    for (let column = 0; column <= columns; column += 1) {
      const u = column / columns;
      const x = THREE.MathUtils.lerp(-188, 188, u);
      const irregular = 6.4
        + 2.8 * Math.sin(x * 0.031 + 0.7)
        + 1.6 * Math.sin(x * 0.079 - 1.1)
        + 0.8 * Math.cos(x * 0.147 + v * 2.4);
      const shoulder = 1.2 * Math.sin((u + v * 0.17) * Math.PI * 5.0);
      const y = -0.55 + envelope * Math.max(1.2, irregular + shoulder) * profileLift;
      positions.push(x, y, z);
    }
  }
  const stride = columns + 1;
  for (let row = 0; row < rows; row += 1) for (let column = 0; column < columns; column += 1) {
    const a = row * stride + column;
    const b = a + 1;
    const c = a + stride;
    const d = c + 1;
    indices.push(a, c, b, b, c, d);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function DistantGroundContinuation({ profile }: { profile: EnvironmentProfile }) {
  const ridge = useMemo(() => buildDistantRidgeGeometry(profile), [profile]);
  useEffect(() => () => ridge.dispose(), [ridge]);
  return <group name="ground-distant-continuation" raycast={() => null} userData={{ perceivedRangeMeters: 400, horizonAuthority: "authored-irregular-ridge-v4-muted-fog-blended" }}>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.32, -128]}>
      <planeGeometry args={[420, 300, 36, 28]} />
      <meshStandardMaterial color={profile.groundDeep} roughness={1} metalness={0} fog transparent opacity={0.86} depthWrite={false} />
    </mesh>
    <mesh name="ground-authored-distant-ridge-v4" geometry={ridge}>
      <meshStandardMaterial color={profile.groundDeep} roughness={1} metalness={0} fog />
    </mesh>
    <mesh name="ground-atmospheric-ridge-layer" geometry={ridge} position={[0, -1.6, -34]} scale={[1.12, 0.72, 1.08]} raycast={() => null}>
      <meshStandardMaterial color={profile.horizon} roughness={1} metalness={0} fog transparent opacity={0.72} />
    </mesh>
  </group>;
}


function GroundRootNetwork({ profile }: { profile: EnvironmentProfile }) {
  const roots = useMemo(() => {
    const definitions = [
      [[-18, 7.8, 8], [-13, 6.0, 2], [-9, 4.4, -5], [-5, 3.1, -13], [-2, 2.1, -22]],
      [[17, 8.4, 6], [12, 6.5, 0], [8, 4.7, -7], [5, 3.0, -15], [3, 2.0, -25]],
      [[-10, 9.2, -5], [-7, 7.0, -10], [-4, 5.0, -18], [-1, 3.8, -27], [1, 2.5, -36]],
      [[11, 8.8, -8], [8, 6.8, -13], [5, 5.0, -21], [2, 3.6, -30], [-1, 2.5, -41]],
      [[-22, 6.8, -18], [-16, 5.5, -20], [-10, 4.1, -24], [-4, 3.0, -30], [0, 2.4, -37]],
      [[21, 7.1, -22], [15, 5.8, -23], [10, 4.3, -27], [5, 3.1, -33], [1, 2.5, -41]],
    ] as const;
    return definitions.map((points, index) => {
      const curve = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
      return new THREE.TubeGeometry(curve, 48, 0.17 + index * 0.025, 10, false);
    });
  }, []);
  useEffect(() => () => roots.forEach((geometry) => geometry.dispose()), [roots]);
  return <group name="ground-canonical-root-network-v14" raycast={() => null}>
    {roots.map((geometry, index) => <mesh key={index} geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial
        color={profile.id === "woodland" ? "#34281f" : "#403126"}
        roughness={0.98}
        metalness={0}
        envMapIntensity={0.12}
      />
    </mesh>)}
  </group>;
}

export function GroundSubstrateWorld({ profile }: { profile: EnvironmentProfile }) {
  const rockPlacements = useMemo(() => [
    { p: [-16, 0.1, 2] as [number, number, number], r: [0.1, 0.9, 0] as [number, number, number], s: [7.4, 5.8, 6.2] as [number, number, number], v: "01" as const },
    { p: [17, -0.2, -2] as [number, number, number], r: [0.0, -1.0, 0] as [number, number, number], s: [8.0, 6.4, 6.8] as [number, number, number], v: "02" as const },
    { p: [-20, -0.5, -19] as [number, number, number], r: [0.2, 0.4, -0.05] as [number, number, number], s: [10.0, 8.0, 8.0] as [number, number, number], v: "02" as const },
    { p: [19, -0.4, -24] as [number, number, number], r: [-0.1, -0.7, 0.05] as [number, number, number], s: [9.6, 7.4, 8.2] as [number, number, number], v: "01" as const },
    { p: [-12, -0.8, -43] as [number, number, number], r: [0.1, 1.1, 0] as [number, number, number], s: [12.0, 9.0, 9.6] as [number, number, number], v: "01" as const },
    { p: [12, -0.8, -45] as [number, number, number], r: [0.0, -1.2, 0] as [number, number, number], s: [12.5, 9.6, 10.2] as [number, number, number], v: "02" as const },
  ], []);

  const fernPlacements = useMemo(() => [
    [-5.4, -7.5, 0.72], [5.8, -8.4, 0.66], [-7.8, -17.5, 0.8], [7.2, -18.2, 0.78],
    [-4.6, -28.0, 0.62], [4.4, -30.5, 0.7], [-8.5, -37.0, 0.84], [8.3, -38.8, 0.72],
  ] as const, []);

  return <group
    name="ground-deeper-living-substrate-v14"
    userData={{
      visualAuthority: "terrain-to-root-to-geology-to-lived-ground",
      continuity: "same-home-deeper-substrate",
      fantasyCave: false,
      exteriorForestOwner: false,
    }}
  >
    <mesh name="ground-substrate-vault" position={[0, 7.8, -18]} scale={[34, 11, 44]} raycast={() => null}>
      <sphereGeometry args={[1, 64, 32]} />
      <meshStandardMaterial
        side={THREE.BackSide}
        color="#151713"
        roughness={1}
        metalness={0}
        envMapIntensity={0.06}
      />
    </mesh>
    <GroundRootNetwork profile={profile} />
    {rockPlacements.map((item, index) => <ScannedRock
      key={index}
      variant={item.v}
      position={item.p}
      rotation={item.r}
      scale={item.s}
    />)}
    {fernPlacements.map(([x, z, scale], index) => <FernPatch
      key={index}
      position={[x, groundHeight(x, z, profile.id) + 0.02, z]}
      rotationY={index * 1.37}
      scale={scale}
    />)}
    <mesh name="ground-moisture-channel" rotation={[-Math.PI / 2, 0, 0]} position={[1.6, 0.02, -24]} raycast={() => null}>
      <planeGeometry args={[2.8, 28, 8, 40]} />
      <meshPhysicalMaterial color="#172b2c" roughness={0.24} metalness={0} transmission={0.08} transparent opacity={0.58} />
    </mesh>
    <pointLight position={[-8, 3.4, -10]} intensity={1.15} color="#b88958" distance={18} decay={2} />
    <pointLight position={[7, 2.8, -25]} intensity={0.92} color="#6a9f98" distance={20} decay={2} />
    <pointLight position={[0, 3.6, -40]} intensity={1.25} color="#9ba76e" distance={24} decay={2} />
  </group>;
}

function LivedGroundWorld({ profile, target }: { profile: EnvironmentProfile; target: MutableRefObject<THREE.Vector3 | null> }) {
  const geometry = useMemo(() => buildTerrainGeometry(profile), [profile]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const onTerrainClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    if (event.delta > 8) return;
    target.current = new THREE.Vector3(
      THREE.MathUtils.clamp(event.point.x, BOUNDS.minX, BOUNDS.maxX),
      0,
      THREE.MathUtils.clamp(event.point.z, BOUNDS.minZ, BOUNDS.maxZ),
    );
    window.dispatchEvent(new CustomEvent('urai:ground-surface-commit', { detail: { x: event.point.x, z: event.point.z } }));
  };

  return <group name="ground-lived-world" userData={{ semanticOwner: "ground-physical-lived-world", placeLayer: "consent-aware-empty-by-default", profile: profile.id, materialAuthority: "scanned-pbr-ground-v2" }}>
    <mesh name="ground-visible-traversable-terrain" geometry={geometry} onClick={onTerrainClick} receiveShadow>
      <TerrainMaterial profile={profile} />
    </mesh>
    <AtmosphericGroundSky profile={profile} />
    <DistantGroundContinuation profile={profile} />
    <NaturalScatter profile={profile} />
  </group>;
}

function FirstPersonPlayer({ input, yaw, pitch, target, profile, obstacles, playerPosition, isCoarse, onReady }: {
  input: MovementInput;
  yaw: MutableRefObject<number>;
  pitch: MutableRefObject<number>;
  target: MutableRefObject<THREE.Vector3 | null>;
  profile: EnvironmentProfile;
  obstacles: readonly MovementObstacle[];
  playerPosition: MutableRefObject<THREE.Vector3>;
  isCoarse: boolean;
  onReady: () => void;
}) {
  const { camera, size } = useThree();
  const reducedMotion = useReducedMotion();
  const position = playerPosition;
  const velocity = useRef(new THREE.Vector3());
  const desired = useRef(new THREE.Vector3());
  const lookAt = useRef(new THREE.Vector3());
  const forward = useRef(new THREE.Vector3());
  const ready = useRef(false);

  useFrame((_, delta) => {
    const terrainSlope = slopeDegrees((x, z) => groundHeight(x, z, profile.id), position.current.x, position.current.z);
    const slopeMultiplier = slopeSpeedMultiplier(terrainSlope);
    const baseSpeed = isCoarse ? GROUND_MOBILE_SPEED_MPS : GROUND_DESKTOP_SPEED_MPS;
    stepEmbodiedMotion({
      position: position.current,
      velocity: velocity.current,
      input,
      target,
      yaw: yaw.current,
      delta,
      speed: baseSpeed * slopeMultiplier,
      acceleration: GROUND_ACCELERATION_MPS2,
      deceleration: GROUND_DECELERATION_MPS2,
      bounds: BOUNDS,
      obstacles: [...obstacles],
      arrivalRadius: GROUND_ARRIVAL_RADIUS_M,
    });

    const surfaceY = groundHeight(position.current.x, position.current.z, profile.id);
    desired.current.set(position.current.x, surfaceY + GROUND_EYE_HEIGHT_M, position.current.z);
    camera.position.lerp(desired.current, reducedMotion ? 1 : 1 - Math.pow(0.001, delta));

    forward.current.set(-Math.sin(yaw.current), 0, -Math.cos(yaw.current));
    lookAt.current.copy(camera.position).addScaledVector(forward.current, 12);
    lookAt.current.y += Math.tan(pitch.current) * 7.5;
    camera.lookAt(lookAt.current);

    if (camera instanceof THREE.PerspectiveCamera) {
      const portrait = size.height > size.width;
      const desiredFov = portrait ? GROUND_PORTRAIT_FOV_DEG : GROUND_LANDSCAPE_FOV_DEG;
      if (Math.abs(camera.fov - desiredFov) > 0.01) {
        camera.fov = desiredFov;
        camera.updateProjectionMatrix();
      }
    }

    if (!ready.current) {
      ready.current = true;
      onReady();
    }
  });
  return null;
}

function AtmosphericGroundSky({ profile }: { profile: EnvironmentProfile }) {
  const uniforms = useMemo(() => ({
    zenithColor: { value: new THREE.Color(profile.id === "woodland" ? "#668695" : "#7194a4") },
    upperColor: { value: new THREE.Color(profile.id === "arid" ? "#a58a70" : profile.id === "woodland" ? "#8fa49b" : "#9fb0aa") },
    horizonColor: { value: new THREE.Color(profile.fog) },
    groundHazeColor: { value: new THREE.Color(profile.horizon) },
  }), [profile.fog, profile.horizon, profile.id]);

  return <mesh name="ground-authored-atmospheric-dome-v11" scale={360} frustumCulled={false} renderOrder={-1000}>
    <sphereGeometry args={[1, 64, 32]} />
    <shaderMaterial
      side={THREE.BackSide}
      depthWrite={false}
      depthTest={false}
      toneMapped={false}
      uniforms={uniforms}
      vertexShader={`
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `}
      fragmentShader={`
        varying vec3 vDir;
        uniform vec3 zenithColor;
        uniform vec3 upperColor;
        uniform vec3 horizonColor;
        uniform vec3 groundHazeColor;
        void main() {
          float h = clamp(vDir.y * 0.5 + 0.5, 0.0, 1.0);
          float upperMix = smoothstep(0.42, 0.96, h);
          vec3 sky = mix(upperColor, zenithColor, upperMix);
          float horizonBand = 1.0 - smoothstep(0.015, 0.28, abs(vDir.y));
          sky = mix(sky, horizonColor, horizonBand * 0.20);
          float groundBand = 1.0 - smoothstep(-0.24, 0.04, vDir.y);
          sky = mix(sky, groundHazeColor, groundBand * 0.10);
          vec3 sunDir = normalize(vec3(-0.38, 0.30, -0.88));
          float sunDot = max(0.0, dot(normalize(vDir), sunDir));
          float sunGlow = pow(sunDot, 34.0) * 0.08 + pow(sunDot, 240.0) * 0.24;
          sky += vec3(1.0, 0.72, 0.46) * sunGlow;
          float haze = pow(max(0.0, 1.0 - abs(vDir.y)), 5.0) * 0.055;
          sky += vec3(0.68, 0.60, 0.50) * haze;
          gl_FragColor = vec4(sky, 1.0);
        }
      `}
    />
  </mesh>;
}

function GroundScene({ profile, input, yaw, pitch, target, obstacles, playerPosition, isCoarse, onReady }: {
  profile: EnvironmentProfile;
  input: MovementInput;
  yaw: MutableRefObject<number>;
  pitch: MutableRefObject<number>;
  target: MutableRefObject<THREE.Vector3 | null>;
  obstacles: readonly MovementObstacle[];
  playerPosition: MutableRefObject<THREE.Vector3>;
  isCoarse: boolean;
  onReady: () => void;
}) {
  const reducedMotion = useReducedMotion();
  const heightAt = useCallback((x: number, z: number) => groundHeight(x, z, profile.id), [profile.id]);
  const weather = DEFAULT_GROUND_WEATHER;
  return <>
    <color attach="background" args={[profile.horizon]} />
    <fogExp2 attach="fog" args={[profile.fog, 0.0062 + weather.atmosphericDensity * 0.0008]} />
    <Suspense fallback={null}><Environment files="/assets/urai/home-production/cc0/environment/studio-small-08-1k.hdr" background={false} environmentIntensity={0.36} /></Suspense>
    <ambientLight intensity={0.28} color="#b9c8bd" />
    <hemisphereLight args={["#c7d9d7", "#3b3329", 0.72]} />
    <directionalLight position={[-10, 15, 4]} intensity={2.05} color="#f1d7ac" castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-28} shadow-camera-right={28} shadow-camera-top={28} shadow-camera-bottom={-28} shadow-camera-far={90} shadow-normalBias={0.035} />
    <directionalLight position={[12, 8, -24]} intensity={0.44} color="#7fa2aa" />
    <Suspense fallback={null}><LivedGroundWorld profile={profile} target={target} /></Suspense>
    <FirstPersonPlayer input={input} yaw={yaw} pitch={pitch} target={target} profile={profile} obstacles={obstacles} playerPosition={playerPosition} isCoarse={isCoarse} onReady={onReady} />
  </>;
}

function GroundAnalogPad({ input, visible }: { input: MovementInput; visible: boolean }) {
  const pad = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [thumb, setThumb] = useState({ x: 0, y: 0 });
  const update = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = pad.current?.getBoundingClientRect();
    if (!rect) return;
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = event.clientX - centerX;
    const dy = event.clientY - centerY;
    const max = 38;
    const length = Math.hypot(dx, dy);
    const scale = length > max ? max / length : 1;
    const x = dx * scale;
    const y = dy * scale;
    setThumb({ x, y });
    const normalizedX = Math.abs(x / max) < 0.14 ? 0 : x / max;
    const normalizedY = Math.abs(y / max) < 0.14 ? 0 : y / max;
    setVirtualMovement(input, normalizedX, normalizedY);
  };
  const stop = () => {
    setActive(false);
    setThumb({ x: 0, y: 0 });
    clearVirtualMovement(input);
  };
  return <div
    ref={pad}
    className="ground-analog-pad"
    data-movement-ui="true"
    role="group"
    aria-label="Ground analog movement"
    data-active={active ? "true" : "false"}
    style={{
      display: visible ? "block" : "none",
      position: "absolute",
      zIndex: 24,
      left: "max(18px, env(safe-area-inset-left))",
      bottom: "max(88px, calc(env(safe-area-inset-bottom) + 76px))",
      width: 100,
      height: 100,
      border: "1px solid rgba(233,248,244,.24)",
      borderRadius: "50%",
      background: "rgba(5,17,20,.28)",
      backdropFilter: "blur(8px)",
      touchAction: "none",
      opacity: active ? 0.66 : 0.38,
    }}
    onPointerDown={(event) => { setActive(true); event.currentTarget.setPointerCapture(event.pointerId); update(event); }}
    onPointerMove={(event) => { if (active) update(event); }}
    onPointerUp={stop}
    onPointerCancel={stop}
  ><span style={{
    position: "absolute",
    left: "50%",
    top: "50%",
    width: 34,
    height: 34,
    marginLeft: -17,
    marginTop: -17,
    border: "1px solid rgba(244,252,249,.34)",
    borderRadius: "50%",
    background: "rgba(223,242,233,.18)",
    pointerEvents: "none",
    transform: `translate(${thumb.x}px, ${thumb.y}px)`,
  }} /></div>;
}

export default function GroundSpatialWorldClean() {
  const router = useRouter();
  const params = useSearchParams();
  const [ready, setReady] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [isCoarse, setIsCoarse] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(pointer: coarse)").matches
      || window.matchMedia("(max-width: 760px)").matches
      || navigator.maxTouchPoints > 0
      || "ontouchstart" in window;
  });
  const yaw = useRef(0);
  const pitch = useRef(-0.04);
  const target = useRef<THREE.Vector3 | null>(null);
  const playerPosition = useRef(SPAWN.clone());
  const profile = useMemo(() => resolveProfile(params.get("environment")), [params]);
  const obstacles = useMemo(() => buildGroundObstacleField(profile.id), [profile.id]);

  useEffect(() => {
    const pointerQuery = window.matchMedia('(pointer: coarse)');
    const compactQuery = window.matchMedia('(max-width: 760px)');
    const update = () => setIsCoarse(
      pointerQuery.matches
      || compactQuery.matches
      || navigator.maxTouchPoints > 0
      || 'ontouchstart' in window,
    );
    update();
    pointerQuery.addEventListener?.('change', update);
    compactQuery.addEventListener?.('change', update);
    return () => {
      pointerQuery.removeEventListener?.('change', update);
      compactQuery.removeEventListener?.('change', update);
    };
  }, []);

  const reset = useCallback(() => {
    yaw.current = 0;
    pitch.current = -0.04;
    target.current = SPAWN.clone();
    playerPosition.current.copy(SPAWN);
  }, []);
  const input = useMovementInput({ onEscape: () => router.push("/home?returnFrom=ground"), onReset: reset });
  const look = useDragLook({ yaw, pitch, sensitivity: 0.0032, minPitch: -0.96, maxPitch: 0.96, onDragState: setDragging });

  return <main
    className="ground-spatial-root"
    aria-label="URAI Ground first-person lived world"
    data-testid="urai-ground-lived-world"
    data-ground-visual-owner="atmospheric-living-environment"
    data-ground-runtime-owner="first-person-lived-world"
    data-ground-visual-revision="ground-lived-world-v2-canon-lock"
    data-ground-art-revision="ground-v28-organic-canopy-procedural-soil-atmospheric-depth" data-ground-canopy-repair="ground-v28-smooth-small-leaflets-non-avenue-layout"
    data-ground-exploration="first-person-no-visible-body"
    data-ground-camera="eye-level-terrain-following-no-authored-bob"
    data-ground-eye-height={GROUND_EYE_HEIGHT_M}
    data-ground-speed-desktop={GROUND_DESKTOP_SPEED_MPS}
    data-ground-speed-mobile={GROUND_MOBILE_SPEED_MPS}
    data-ground-acceleration={GROUND_ACCELERATION_MPS2}
    data-ground-deceleration={GROUND_DECELERATION_MPS2}
    data-ground-collision="terrain-plus-authored-obstacle-field"
    data-ground-place-layer="consent-aware-empty-by-default"
    data-ground-environment-profile={profile.id}
    data-ground-private-location-mounted="false"
    data-ground-pointer-lock="false"
    data-ground-visible-avatar="false"
    data-ground-visible-hands="false"
    data-ground-ready={ready ? "true" : "false"}
    data-ground-camera-mode={dragging ? "look" : "first-person"}
    {...look}
  >
    <Canvas
      shadows
      dpr={[1, 1.3]}
      camera={{ position: [0, GROUND_EYE_HEIGHT_M, 6], fov: GROUND_LANDSCAPE_FOV_DEG, near: GROUND_NEAR_PLANE_M, far: 800 }}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.outputColorSpace = THREE.SRGBColorSpace;
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 0.90;
      }}
    >
      <GroundScene profile={profile} input={input} yaw={yaw} pitch={pitch} target={target} obstacles={obstacles} playerPosition={playerPosition} isCoarse={isCoarse} onReady={() => setReady(true)} />
    </Canvas>

    <button className="ground-home-return" type="button" onClick={() => router.push("/home?returnFrom=ground")} aria-label="Return Home">Home</button>
    <nav className="ground-place-access" aria-label="Ground place and privacy tools">
      <a href="/location-map/geographic/">Places</a>
      <a href="/privacy-controls">Privacy</a>
    </nav>
    <div className="sr-only" role="status" aria-live="polite">{ready ? `${profile.label} is ready for first-person exploration. UrAi remains available through semantic voice and accessible controls; no follower Orb is rendered.` : "Ground is forming."}</div>
    <GroundAnalogPad input={input} visible={isCoarse} />
    <details className="ground-accessible-movement" data-movement-ui="true"><summary>Movement controls</summary><MobileMovementPad input={input} label="Ground first-person movement controls" /></details>
    <span className="sr-only" data-testid="urai-ground-walkable-surface">The visible Ground terrain is the traversal and click-to-move surface.</span>

    <style jsx>{`
      .ground-spatial-root{position:fixed;inset:0;width:100vw;height:100svh;overflow:hidden;background:${profile.fog};color:#f8fbff;isolation:isolate;outline:none;touch-action:none;cursor:${dragging ? "grabbing" : "grab"}}
      .ground-spatial-root canvas{position:absolute!important;inset:0;z-index:1;display:block;width:100%!important;height:100%!important;background:transparent!important}
      .ground-home-return{position:absolute;z-index:20;right:max(16px,env(safe-area-inset-right));top:max(16px,env(safe-area-inset-top));min-width:48px;min-height:48px;padding:0 13px;border:1px solid rgba(226,248,247,.2);border-radius:999px;background:rgba(5,20,24,.32);color:rgba(241,251,249,.88);backdrop-filter:blur(12px);font:750 9px/1 system-ui;letter-spacing:.12em;text-transform:uppercase;cursor:pointer}
      .ground-home-return:focus-visible,.ground-place-access a:focus-visible,.ground-accessible-movement summary:focus-visible{outline:3px solid #fff;outline-offset:3px}
      .ground-place-access{position:absolute;z-index:19;left:max(16px,env(safe-area-inset-left));top:max(16px,env(safe-area-inset-top));display:flex;gap:8px;opacity:.02;transition:opacity .2s ease}
      .ground-place-access:focus-within{opacity:1}
      .ground-place-access a{display:grid;place-items:center;min-width:48px;min-height:48px;padding:0 12px;border:1px solid rgba(226,248,247,.18);border-radius:999px;background:rgba(5,20,24,.72);color:#f4fbfa;text-decoration:none;font:700 10px/1 system-ui}
      .ground-analog-pad{display:none;position:absolute;z-index:24;left:max(18px,env(safe-area-inset-left));bottom:max(88px,calc(env(safe-area-inset-bottom) + 76px));width:100px;height:100px;border:1px solid rgba(233,248,244,.16);border-radius:50%;background:rgba(5,17,20,.18);backdrop-filter:blur(8px);touch-action:none;opacity:.24;transition:opacity .14s ease}
      @media (pointer:coarse),(max-width:760px){.ground-analog-pad{display:block}}
      .ground-analog-pad[data-active='true']{opacity:.62}
      .ground-analog-pad span{position:absolute;left:50%;top:50%;width:34px;height:34px;margin:-17px;border:1px solid rgba(244,252,249,.26);border-radius:50%;background:rgba(223,242,233,.13);pointer-events:none}
      .ground-accessible-movement{position:absolute;z-index:25;left:max(12px,env(safe-area-inset-left));bottom:max(12px,env(safe-area-inset-bottom));max-width:190px;color:#fff;font:700 10px/1 system-ui}
      .ground-accessible-movement summary{display:grid;place-items:center;min-height:44px;padding:0 12px;border:1px solid rgba(255,255,255,.18);border-radius:999px;background:rgba(4,14,18,.55);cursor:pointer;list-style:none}
      .ground-accessible-movement summary::-webkit-details-marker{display:none}
      .ground-accessible-movement:not([open]) :global(.urai-mobile-movement){display:none!important}
      @media(max-width:760px){.ground-home-return{right:12px;top:12px}.ground-place-access{left:12px;top:12px}}
      @media(prefers-reduced-motion:reduce){.ground-place-access,.ground-analog-pad{transition:none}}
    `}</style>
  </main>;
}

useGLTF.preload(ROCK_01);
useGLTF.preload(ROCK_02);
useGLTF.preload(FERN);
useGLTF.preload(NATURAL_CANOPY);