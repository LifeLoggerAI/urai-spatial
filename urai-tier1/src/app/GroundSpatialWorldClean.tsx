"use client";

import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
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
};

const PROFILES: Record<EnvironmentProfileId, EnvironmentProfile> = {
  temperate: { id: "temperate", label: "Temperate lived world", ground: "#596552", groundDeep: "#30382f", accent: "#86916f", horizon: "#4d6258", fog: "#7d9388", roughness: 0.94 },
  urban: { id: "urban", label: "Urban lived world", ground: "#66645f", groundDeep: "#34363a", accent: "#8a8177", horizon: "#56616a", fog: "#87919a", roughness: 0.88 },
  woodland: { id: "woodland", label: "Woodland lived world", ground: "#414d3f", groundDeep: "#252d27", accent: "#68795d", horizon: "#354d43", fog: "#71887c", roughness: 0.97 },
  arid: { id: "arid", label: "Arid lived world", ground: "#8a6f52", groundDeep: "#554235", accent: "#b28c62", horizon: "#8c725d", fog: "#ba9b7b", roughness: 0.91 },
  coastal: { id: "coastal", label: "Coastal lived world", ground: "#807563", groundDeep: "#4d504b", accent: "#a69b81", horizon: "#66818a", fog: "#8fa7aa", roughness: 0.89 },
};

const BOUNDS = { minX: -28, maxX: 28, minZ: -48, maxZ: 16 };
const SPAWN = new THREE.Vector3(0, 0, 6);
const EYE_HEIGHT = 1.69;

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
  const geometry = new THREE.PlaneGeometry(64, 72, 96, 108);
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, 0, -16);
  const position = geometry.getAttribute("position") as THREE.BufferAttribute;
  const colors = new Float32Array(position.count * 3);
  const low = new THREE.Color(profile.groundDeep);
  const mid = new THREE.Color(profile.ground);
  const high = new THREE.Color(profile.accent);
  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index);
    const z = position.getZ(index);
    const y = groundHeight(x, z, profile.id);
    position.setY(index, y);
    const noise = 0.5 + 0.5 * Math.sin(x * 0.29 + z * 0.17) * Math.cos(x * 0.11 - z * 0.23);
    const color = low.clone().lerp(mid, 0.46 + noise * 0.34).lerp(high, Math.max(0, y) * 0.12);
    colors[index * 3] = color.r;
    colors[index * 3 + 1] = color.g;
    colors[index * 3 + 2] = color.b;
  }
  position.needsUpdate = true;
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function NaturalScatter({ profile }: { profile: EnvironmentProfile }) {
  const items = useMemo(() => Array.from({ length: profile.id === "urban" ? 18 : 30 }, (_, index) => {
    const side = index % 2 ? -1 : 1;
    const lane = 7 + (index % 7) * 2.5;
    const x = side * lane + Math.sin(index * 1.71) * 2.2;
    const z = 7 - index * 1.85 + Math.cos(index * 0.83) * 2.4;
    const y = groundHeight(x, z, profile.id);
    const scale = 0.7 + (index % 5) * 0.12;
    return { x, y, z, scale, index };
  }), [profile]);

  if (profile.id === "urban") {
    return <group name="ground-urban-horizon" raycast={() => null}>
      {items.map((item) => <mesh key={item.index} position={[item.x * 1.1, 1.8 + (item.index % 5) * 0.55, Math.min(-31, item.z - 18)]} scale={[item.scale * 1.5, 3.4 + (item.index % 5), item.scale * 1.4]} castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={item.index % 3 === 0 ? "#4d5358" : "#62666a"} roughness={0.83} metalness={0.08} />
      </mesh>)}
    </group>;
  }

  if (profile.id === "arid") {
    return <group name="ground-arid-stone-field" raycast={() => null}>
      {items.slice(0, 20).map((item) => <mesh key={item.index} position={[item.x, item.y + 0.18 * item.scale, item.z]} rotation={[0.18 * Math.sin(item.index), item.index * 0.37, 0.12 * Math.cos(item.index)]} scale={[0.7 * item.scale, 0.38 * item.scale, 0.9 * item.scale]} castShadow receiveShadow>
        <dodecahedronGeometry args={[1, 1]} />
        <meshStandardMaterial color={item.index % 2 ? "#755b45" : "#927153"} roughness={0.96} metalness={0} />
      </mesh>)}
    </group>;
  }

  if (profile.id === "coastal") {
    return <group name="ground-coastal-world" raycast={() => null}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.22, -39]} receiveShadow>
        <planeGeometry args={[80, 32]} />
        <meshPhysicalMaterial color="#365d68" roughness={0.24} metalness={0.02} clearcoat={0.18} clearcoatRoughness={0.3} transparent opacity={0.88} />
      </mesh>
      {items.slice(0, 12).map((item) => <mesh key={item.index} position={[item.x, item.y + 0.11, item.z]} scale={[0.45 * item.scale, 0.22 * item.scale, 0.58 * item.scale]} castShadow receiveShadow>
        <dodecahedronGeometry args={[1, 1]} />
        <meshStandardMaterial color="#68655c" roughness={0.96} />
      </mesh>)}
    </group>;
  }

  return <group name={profile.id === "woodland" ? "ground-woodland-tree-line" : "ground-temperate-tree-line"} raycast={() => null}>
    {items.map((item) => <group key={item.index} position={[item.x, item.y, item.z]} scale={item.scale}>
      <mesh position={[0, 1.05, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.10, 0.15, 2.1, 7]} />
        <meshStandardMaterial color="#4c4033" roughness={0.98} />
      </mesh>
      <mesh position={[0, 2.25, 0]} castShadow receiveShadow>
        <icosahedronGeometry args={[0.82, 2]} />
        <meshStandardMaterial color={profile.id === "woodland" ? "#334b36" : "#4e6548"} roughness={0.96} />
      </mesh>
    </group>)}
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

  return <group name="ground-lived-world" userData={{ semanticOwner: "ground-physical-lived-world", placeLayer: "consent-aware-empty-by-default", profile: profile.id }}>
    <mesh name="ground-visible-traversable-terrain" geometry={geometry} onClick={onTerrainClick} receiveShadow>
      <meshStandardMaterial vertexColors roughness={profile.roughness} metalness={0.01} envMapIntensity={0.42} />
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
    <fogExp2 attach="fog" args={[profile.fog, 0.014]} />
    <Environment files="/assets/urai/home-production/cc0/environment/studio-small-08-1k.hdr" background={false} environmentIntensity={0.24} />
    <ambientLight intensity={0.38} color="#cad7d0" />
    <hemisphereLight args={["#d7e5df", profile.groundDeep, 0.58]} />
    <directionalLight position={[-14, 20, 8]} intensity={2.2} color="#f0d6b0" castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-28} shadow-camera-right={28} shadow-camera-top={28} shadow-camera-bottom={-28} shadow-camera-far={90} shadow-normalBias={0.035} />
    <directionalLight position={[12, 8, -18]} intensity={0.32} color="#81a8ad" />
    <LivedGroundWorld profile={profile} target={target} />
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
