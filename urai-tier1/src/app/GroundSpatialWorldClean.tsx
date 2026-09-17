"use client";

import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Environment, useGLTF, useTexture } from "@react-three/drei";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import * as THREE from "three";
import {
  MobileMovementPad,
  stepEmbodiedMotion,
  useDragLook,
  useMovementInput,
  type MovementInput,
} from "@/spatial/navigation/EmbodiedNavigation";
import { useReducedMotion } from "@/hooks/useReducedMotion";

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
  temperate: { id: "temperate", label: "Temperate lived world", ground: "#596552", groundDeep: "#30382f", accent: "#86916f", horizon: "#4d6258", fog: "#7d9388", roughness: 0.94, textureRepeat: [9, 11] },
  urban: { id: "urban", label: "Urban lived world", ground: "#66645f", groundDeep: "#34363a", accent: "#8a8177", horizon: "#56616a", fog: "#87919a", roughness: 0.88, textureRepeat: [12, 14] },
  woodland: { id: "woodland", label: "Woodland lived world", ground: "#414d3f", groundDeep: "#252d27", accent: "#68795d", horizon: "#354d43", fog: "#71887c", roughness: 0.97, textureRepeat: [8, 10] },
  arid: { id: "arid", label: "Arid lived world", ground: "#8a6f52", groundDeep: "#554235", accent: "#b28c62", horizon: "#8c725d", fog: "#ba9b7b", roughness: 0.91, textureRepeat: [7, 9] },
  coastal: { id: "coastal", label: "Coastal lived world", ground: "#807563", groundDeep: "#4d504b", accent: "#a69b81", horizon: "#66818a", fog: "#8fa7aa", roughness: 0.89, textureRepeat: [10, 12] },
};

const BOUNDS = { minX: -28, maxX: 28, minZ: -48, maxZ: 16 };
const SPAWN = new THREE.Vector3(0, 0, 6);
const EYE_HEIGHT = 1.69;
const ROCK_01 = "/assets/urai/home-production/cc0/polyhaven-v48/rock_face_01/asset.gltf";
const ROCK_02 = "/assets/urai/home-production/cc0/polyhaven-v48/rock_face_02/asset.gltf";
const FERN = "/assets/urai/home-production/cc0/polyhaven-v48/fern_02/asset.gltf";
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
  if (profile === "woodland") return broad * 0.82 + micro * 0.75 + path;
  return broad * 0.68 + micro * 0.58 + path;
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
  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index);
    const z = position.getZ(index);
    const y = groundHeight(x, z, profile.id);
    position.setY(index, y);
    const mineral = 0.5 + 0.5 * Math.sin(x * 0.29 + z * 0.17) * Math.cos(x * 0.11 - z * 0.23);
    const wear = Math.exp(-Math.pow(x - Math.sin(z * 0.09) * 1.1, 2) / 5.5);
    const color = low.clone().lerp(mid, 0.48 + mineral * 0.28).lerp(high, Math.max(0, y) * 0.11 + wear * 0.045);
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
  return <meshStandardMaterial
    map={albedo}
    normalMap={normal}
    normalScale={new THREE.Vector2(profile.id === "urban" ? 0.34 : 0.62, profile.id === "urban" ? 0.34 : 0.62)}
    aoMap={arm}
    aoMapIntensity={0.72}
    roughnessMap={arm}
    roughness={profile.roughness}
    metalnessMap={arm}
    metalness={profile.id === "urban" ? 0.035 : 0.005}
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
        material.metalness = Math.min(material.metalness, 0.04);
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

function OrganicTree({ position, scale, woodland }: { position: [number, number, number]; scale: number; woodland: boolean }) {
  const crown = woodland ? "#2d4434" : "#465b42";
  return <group position={position} scale={scale} raycast={() => null}>
    <mesh position={[0, 1.55, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[0.12, 0.23, 3.1, 12]} />
      <meshStandardMaterial color="#46382e" roughness={0.98} />
    </mesh>
    <mesh position={[-0.18, 3.15, 0.05]} scale={[1.0, 0.82, 0.92]} castShadow receiveShadow>
      <sphereGeometry args={[1, 20, 14]} />
      <meshStandardMaterial color={crown} roughness={0.97} />
    </mesh>
    <mesh position={[0.55, 3.0, -0.18]} scale={[0.82, 0.7, 0.78]} castShadow receiveShadow>
      <sphereGeometry args={[1, 18, 12]} />
      <meshStandardMaterial color={woodland ? "#344d39" : "#53694d"} roughness={0.97} />
    </mesh>
    <mesh position={[-0.48, 2.75, -0.28]} scale={[0.72, 0.64, 0.68]} castShadow receiveShadow>
      <sphereGeometry args={[1, 18, 12]} />
      <meshStandardMaterial color={woodland ? "#263d2e" : "#3e573f"} roughness={0.98} />
    </mesh>
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
      <meshStandardMaterial color={index % 3 === 0 ? "#555d61" : index % 3 === 1 ? "#676766" : "#4c5358"} roughness={0.78} metalness={0.08} />
    </mesh>
    {windows.map((row) => <mesh key={row} position={[0, 1.15 + row * 1.35, 0.96 + (index % 3) * 0.08]} rotation={[0, 0, 0]} scale={[0.85 + (index % 2) * 0.25, 0.12, 1]}>
      <planeGeometry args={[1, 1]} />
      <meshStandardMaterial color="#77878a" emissive="#52656a" emissiveIntensity={0.08} roughness={0.32} metalness={0.12} />
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
  const items = useMemo(() => Array.from({ length: profile.id === "urban" ? 18 : 26 }, (_, index) => {
    const side = index % 2 ? -1 : 1;
    const lane = 7.5 + (index % 7) * 2.7;
    const x = side * lane + Math.sin(index * 1.71) * 2.4;
    const z = 6 - index * 1.95 + Math.cos(index * 0.83) * 2.6;
    const y = groundHeight(x, z, profile.id);
    const scale = 0.72 + (index % 5) * 0.13;
    return { x, y, z, scale, index };
  }), [profile]);

  if (profile.id === "urban") {
    return <group name="ground-urban-horizon" userData={{ treatment: "distant-irregular-extruded-skyline-not-box-placeholders" }} raycast={() => null}>
      {items.map((item) => <UrbanBuilding key={item.index} index={item.index} x={item.x * 1.15} z={Math.min(-34, item.z - 21)} heightValue={5.8 + (item.index % 6) * 1.55} />)}
    </group>;
  }

  if (profile.id === "arid") {
    return <group name="ground-arid-scanned-geology" userData={{ treatment: "polyhaven-scanned-rock-field" }} raycast={() => null}>
      {items.slice(0, 12).map((item) => <ScannedRock key={item.index} variant={item.index % 2 ? "01" : "02"} position={[item.x, item.y - 0.02, item.z]} rotation={[0, item.index * 0.41, 0]} scale={[2.2 * item.scale, 1.25 * item.scale, 2.45 * item.scale]} />)}
    </group>;
  }

  if (profile.id === "coastal") {
    return <group name="ground-coastal-world" userData={{ treatment: "scanned-rock-shore-and-physical-water" }} raycast={() => null}>
      <CoastalWater />
      {items.slice(0, 10).map((item) => <ScannedRock key={item.index} variant={item.index % 2 ? "01" : "02"} position={[item.x, item.y - 0.08, item.z]} rotation={[0, item.index * 0.47, 0]} scale={[1.25 * item.scale, 0.62 * item.scale, 1.5 * item.scale]} />)}
    </group>;
  }

  const woodland = profile.id === "woodland";
  const trees = items.slice(0, woodland ? 18 : 12);
  const ferns = items.slice(0, woodland ? 14 : 8);
  return <group name={woodland ? "ground-woodland-scanned-understory" : "ground-temperate-scanned-understory"} userData={{ treatment: "organic-tree-canopy-plus-polyhaven-fern-and-scanned-rock" }} raycast={() => null}>
    {trees.map((item) => <OrganicTree key={`tree-${item.index}`} position={[item.x, item.y, item.z]} scale={1.0 + item.scale * 0.38} woodland={woodland} />)}
    {ferns.map((item) => <FernPatch key={`fern-${item.index}`} position={[item.x * 0.72, groundHeight(item.x * 0.72, item.z - 1.3, profile.id), item.z - 1.3]} rotationY={item.index * 0.73} scale={0.82 + item.scale * 0.45} />)}
    {items.slice(0, 8).map((item) => <ScannedRock key={`rock-${item.index}`} variant={item.index % 2 ? "01" : "02"} position={[item.x * 0.55, groundHeight(item.x * 0.55, item.z + 2.2, profile.id) - 0.1, item.z + 2.2]} rotation={[0, item.index * 0.39, 0]} scale={[0.82 * item.scale, 0.48 * item.scale, 0.94 * item.scale]} />)}
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
  };

  return <group name="ground-lived-world" userData={{ semanticOwner: "ground-physical-lived-world", placeLayer: "consent-aware-empty-by-default", profile: profile.id, materialAuthority: "scanned-pbr-ground-v2" }}>
    <mesh name="ground-visible-traversable-terrain" geometry={geometry} onClick={onTerrainClick} receiveShadow>
      <TerrainMaterial profile={profile} />
    </mesh>
    <NaturalScatter profile={profile} />
  </group>;
}

function FirstPersonPlayer({ input, yaw, pitch, target, profile, onReady }: {
  input: MovementInput;
  yaw: MutableRefObject<number>;
  pitch: MutableRefObject<number>;
  target: MutableRefObject<THREE.Vector3 | null>;
  profile: EnvironmentProfile;
  onReady: () => void;
}) {
  const { camera, size } = useThree();
  const reducedMotion = useReducedMotion();
  const position = useRef(SPAWN.clone());
  const velocity = useRef(new THREE.Vector3());
  const desired = useRef(new THREE.Vector3());
  const lookAt = useRef(new THREE.Vector3());
  const forward = useRef(new THREE.Vector3());
  const ready = useRef(false);

  useFrame((_, delta) => {
    stepEmbodiedMotion({
      position: position.current,
      velocity: velocity.current,
      input,
      target,
      yaw: yaw.current,
      delta,
      speed: 3.7,
      acceleration: 12,
      deceleration: 14,
      bounds: BOUNDS,
      arrivalRadius: 0.32,
    });

    const surfaceY = groundHeight(position.current.x, position.current.z, profile.id);
    desired.current.set(position.current.x, surfaceY + EYE_HEIGHT, position.current.z);
    camera.position.lerp(desired.current, reducedMotion ? 1 : 1 - Math.pow(0.001, delta));

    forward.current.set(-Math.sin(yaw.current), 0, -Math.cos(yaw.current));
    lookAt.current.copy(camera.position).addScaledVector(forward.current, 12);
    lookAt.current.y += Math.tan(pitch.current) * 7.5;
    camera.lookAt(lookAt.current);

    if (camera instanceof THREE.PerspectiveCamera) {
      const portrait = size.height > size.width;
      const desiredFov = portrait ? 66 : 58;
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

function GroundScene({ profile, input, yaw, pitch, target, onReady }: {
  profile: EnvironmentProfile;
  input: MovementInput;
  yaw: MutableRefObject<number>;
  pitch: MutableRefObject<number>;
  target: MutableRefObject<THREE.Vector3 | null>;
  onReady: () => void;
}) {
  return <>
    <color attach="background" args={[profile.fog]} />
    <fogExp2 attach="fog" args={[profile.fog, profile.id === "urban" ? 0.018 : 0.0135]} />
    <Environment files="/assets/urai/home-production/cc0/environment/studio-small-08-1k.hdr" background={false} environmentIntensity={0.24} />
    <ambientLight intensity={0.35} color="#cad7d0" />
    <hemisphereLight args={["#d7e5df", profile.groundDeep, 0.56]} />
    <directionalLight position={[-14, 20, 8]} intensity={2.05} color="#f0d6b0" castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-28} shadow-camera-right={28} shadow-camera-top={28} shadow-camera-bottom={-28} shadow-camera-far={90} shadow-normalBias={0.035} />
    <directionalLight position={[12, 8, -18]} intensity={0.28} color="#81a8ad" />
    <Suspense fallback={null}><LivedGroundWorld profile={profile} target={target} /></Suspense>
    <FirstPersonPlayer input={input} yaw={yaw} pitch={pitch} target={target} profile={profile} onReady={onReady} />
  </>;
}

export default function GroundSpatialWorldClean() {
  const router = useRouter();
  const params = useSearchParams();
  const [ready, setReady] = useState(false);
  const [dragging, setDragging] = useState(false);
  const yaw = useRef(0);
  const pitch = useRef(-0.04);
  const target = useRef<THREE.Vector3 | null>(null);
  const profile = useMemo(() => resolveProfile(params.get("environment")), [params]);

  const reset = useCallback(() => {
    yaw.current = 0;
    pitch.current = -0.04;
    target.current = SPAWN.clone();
  }, []);
  const input = useMovementInput({ onEscape: () => router.push("/home?returnFrom=ground"), onReset: reset });
  const look = useDragLook({ yaw, pitch, sensitivity: 0.0032, minPitch: -0.96, maxPitch: 0.96, onDragState: setDragging });

  return <main
    className="ground-spatial-root"
    aria-label="URAI Ground first-person lived world"
    data-testid="urai-ground-lived-world"
    data-ground-visual-owner="physical-lived-world"
    data-ground-runtime-owner="first-person-lived-world"
    data-ground-visual-revision="ground-lived-world-v1"
    data-ground-art-revision="ground-scanned-pbr-v2"
    data-ground-exploration="first-person"
    data-ground-camera="eye-level-terrain-following"
    data-ground-eye-height={EYE_HEIGHT}
    data-ground-collision="visible-terrain-heightfield"
    data-ground-place-layer="consent-aware-empty-by-default"
    data-ground-environment-profile={profile.id}
    data-ground-private-location-mounted="false"
    data-ground-pointer-lock="false"
    data-ground-ready={ready ? "true" : "false"}
    data-ground-camera-mode={dragging ? "look" : "first-person"}
    {...look}
  >
    <Canvas
      shadows
      dpr={[1, 1.3]}
      camera={{ position: [0, EYE_HEIGHT, 6], fov: 58, near: 0.08, far: 180 }}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.outputColorSpace = THREE.SRGBColorSpace;
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 0.96;
      }}
    >
      <GroundScene profile={profile} input={input} yaw={yaw} pitch={pitch} target={target} onReady={() => setReady(true)} />
    </Canvas>

    <button className="ground-home-return" type="button" onClick={() => router.push("/home?returnFrom=ground")} aria-label="Return Home">Home</button>
    <nav className="ground-place-access" aria-label="Ground place and privacy tools">
      <a href="/location-map/geographic/">Places</a>
      <a href="/privacy-controls">Privacy</a>
    </nav>
    <div className="sr-only" role="status" aria-live="polite">{ready ? `${profile.label} is ready for first-person exploration.` : "Ground is forming."}</div>
    <MobileMovementPad input={input} label="Ground first-person movement controls" />
    <span className="sr-only" data-testid="urai-ground-walkable-surface">The visible Ground terrain is the traversal and click-to-move surface.</span>

    <style jsx>{`
      .ground-spatial-root{position:fixed;inset:0;width:100vw;height:100svh;overflow:hidden;background:${profile.fog};color:#f8fbff;isolation:isolate;outline:none;touch-action:none;cursor:${dragging ? "grabbing" : "grab"}}
      .ground-spatial-root canvas{position:absolute!important;inset:0;z-index:1;display:block;width:100%!important;height:100%!important;background:transparent!important}
      .ground-home-return{position:absolute;z-index:20;right:max(16px,env(safe-area-inset-right));top:max(16px,env(safe-area-inset-top));min-width:48px;min-height:48px;padding:0 13px;border:1px solid rgba(226,248,247,.2);border-radius:999px;background:rgba(5,20,24,.32);color:rgba(241,251,249,.88);backdrop-filter:blur(12px);font:750 9px/1 system-ui;letter-spacing:.12em;text-transform:uppercase;cursor:pointer}
      .ground-home-return:focus-visible,.ground-place-access a:focus-visible{outline:3px solid #fff;outline-offset:3px}
      .ground-place-access{position:absolute;z-index:19;left:max(16px,env(safe-area-inset-left));top:max(16px,env(safe-area-inset-top));display:flex;gap:8px;opacity:.02;transition:opacity .2s ease}
      .ground-place-access:focus-within{opacity:1}
      .ground-place-access a{display:grid;place-items:center;min-width:48px;min-height:48px;padding:0 12px;border:1px solid rgba(226,248,247,.18);border-radius:999px;background:rgba(5,20,24,.72);color:#f4fbfa;text-decoration:none;font:700 10px/1 system-ui}
      @media(max-width:760px){.ground-home-return{right:12px;top:12px}.ground-place-access{left:12px;top:12px}}
      @media(prefers-reduced-motion:reduce){.ground-place-access{transition:none}}
    `}</style>
  </main>;
}

useGLTF.preload(ROCK_01);
useGLTF.preload(ROCK_02);
useGLTF.preload(FERN);
