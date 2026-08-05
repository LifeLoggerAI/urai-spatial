"use client";

import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Sparkles, Stars } from "@react-three/drei";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState, type MutableRefObject } from "react";
import * as THREE from "three";
import { MobileMovementPad, stepEmbodiedMotion, useDragLook, useMovementInput, type MovementInput } from "@/spatial/navigation/EmbodiedNavigation";
import { DESTINATIONS, type GroundDestination } from "./ground/GroundWorldModel";

const BOUNDS = { minX: -18, maxX: 18, minZ: -40, maxZ: 12 };
const SPAWN = new THREE.Vector3(0, 0, 8.5);

type PlayerProps = {
  input: MovementInput;
  yaw: MutableRefObject<number>;
  pitch: MutableRefObject<number>;
  target: MutableRefObject<THREE.Vector3 | null>;
  onNearby: (value: GroundDestination | null) => void;
};

function terrainGeometry() {
  const geometry = new THREE.PlaneGeometry(64, 92, 170, 220);
  geometry.rotateX(-Math.PI / 2);
  const position = geometry.attributes.position as THREE.BufferAttribute;
  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index);
    const z = position.getZ(index);
    const central = Math.exp(-Math.pow(x / 8.5, 2)) * 1.4;
    const terraces = Math.sin(z * 0.22) * 0.42 + Math.sin(x * 0.34) * 0.26;
    const rim = Math.max(0, Math.abs(x) - 9) * 0.12;
    position.setY(index, terraces + rim - central - 1.2);
  }
  geometry.computeVertexNormals();
  return geometry;
}

function GroundTerrain({ target }: { target: MutableRefObject<THREE.Vector3 | null> }) {
  const geometry = useMemo(terrainGeometry, []);
  const onWalk = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    target.current = new THREE.Vector3(
      THREE.MathUtils.clamp(event.point.x, BOUNDS.minX, BOUNDS.maxX),
      0,
      THREE.MathUtils.clamp(event.point.z, BOUNDS.minZ, BOUNDS.maxZ),
    );
  };
  return (
    <group name="ground-continuity-architectural-shell">
      <mesh geometry={geometry} receiveShadow onClick={onWalk} name="ground-walkable-navigation-surface">
        <meshPhysicalMaterial color="#151f23" roughness={0.95} metalness={0.03} clearcoat={0.06} />
      </mesh>
      {[0, 1, 2, 3].map((lane) => {
        const curve = new THREE.CatmullRomCurve3([
          new THREE.Vector3((lane - 1.5) * 2.8, -0.66, 9),
          new THREE.Vector3((lane - 1.5) * 3.8, -0.64, -3),
          new THREE.Vector3((lane - 1.5) * 4.5, -0.45, -16),
          new THREE.Vector3((lane - 1.5) * 4.9, 0.1, -35),
        ]);
        return <mesh key={lane} name="ground-walkable-path-network"><tubeGeometry args={[curve, 120, 0.07, 10, false]} /><meshBasicMaterial color={lane % 2 ? "#76e4ff" : "#d6b6ff"} transparent opacity={0.48} toneMapped={false} /></mesh>;
      })}
    </group>
  );
}

function Chamber({ destination, active, onSelect }: { destination: GroundDestination; active: boolean; onSelect: () => void }) {
  const root = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!root.current) return;
    root.current.position.y = destination.position[1] + Math.sin(clock.elapsedTime * 0.42 + destination.position[0]) * 0.06;
  });
  const color = destination.color;
  const scale = active ? 1.12 : 1;
  return (
    <group ref={root} name={`ground-enterable-threshold-${destination.id}`} position={destination.position} scale={scale} onClick={(event) => { event.stopPropagation(); onSelect(); }}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[1.55, 2.15, 1.2, 8]} />
        <meshPhysicalMaterial color="#26333a" emissive={color} emissiveIntensity={active ? 0.24 : 0.08} roughness={0.72} metalness={0.14} clearcoat={0.28} />
      </mesh>
      <mesh position={[0, 1.1, 0]}>
        <torusGeometry args={[1.25, 0.085, 18, 160]} />
        <meshBasicMaterial color={color} transparent opacity={active ? 0.9 : 0.5} toneMapped={false} />
      </mesh>
      <mesh position={[0, 1.1, -0.04]}>
        <circleGeometry args={[1.16, 96]} />
        <meshBasicMaterial color={color} transparent opacity={active ? 0.18 : 0.07} toneMapped={false} />
      </mesh>
      <pointLight position={[0, 1.35, 0.6]} color={color} intensity={active ? 7 : 3.2} distance={10} decay={2} />
    </group>
  );
}

function Nexus() {
  return (
    <group name="ground-central-nexus" position={[0, 0.25, -8]}>
      {[2.4, 3.3, 4.4].map((radius, index) => <mesh key={radius} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1 + index * 0.03, 0]}><torusGeometry args={[radius, 0.035 + index * 0.01, 12, 180]} /><meshBasicMaterial color={index === 1 ? "#f5d18a" : "#88eaff"} transparent opacity={0.38 - index * 0.07} toneMapped={false} /></mesh>)}
      <mesh position={[0, 2.1, 0]} castShadow>
        <octahedronGeometry args={[1.05, 3]} />
        <meshPhysicalMaterial color="#e6fbff" emissive="#78dfff" emissiveIntensity={1.2} transmission={0.28} roughness={0.12} clearcoat={1} />
      </mesh>
      <pointLight position={[0, 2.1, 0]} color="#86e8ff" intensity={10} distance={20} decay={2} />
    </group>
  );
}

function Player({ input, yaw, pitch, target, onNearby }: PlayerProps) {
  const { camera } = useThree();
  const position = useRef(SPAWN.clone());
  const velocity = useRef(new THREE.Vector3());
  const lookAt = useRef(new THREE.Vector3());
  const nearbyRef = useRef<string | null>(null);
  useFrame((_, delta) => {
    stepEmbodiedMotion({ position: position.current, velocity: velocity.current, input, target, yaw: yaw.current, delta, speed: 4.1, acceleration: 11, deceleration: 13, bounds: BOUNDS, obstacles: [{ x: 0, z: -8, radius: 2.2 }] });
    camera.position.set(position.current.x, 1.9, position.current.z);
    lookAt.current.set(
      position.current.x - Math.sin(yaw.current) * Math.cos(pitch.current),
      1.9 + Math.sin(pitch.current),
      position.current.z - Math.cos(yaw.current) * Math.cos(pitch.current),
    );
    camera.lookAt(lookAt.current);
    let nearest: GroundDestination | null = null;
    let best = 3.1;
    for (const destination of DESTINATIONS) {
      const distance = Math.hypot(position.current.x - destination.position[0], position.current.z - destination.position[2]);
      if (distance < best) { best = distance; nearest = destination; }
    }
    const id = nearest?.id ?? null;
    if (id !== nearbyRef.current) { nearbyRef.current = id; onNearby(nearest); }
  });
  return null;
}

function GroundScene({ input, yaw, pitch, target, activeId, onNearby, onSelect }: {
  input: MovementInput;
  yaw: MutableRefObject<number>;
  pitch: MutableRefObject<number>;
  target: MutableRefObject<THREE.Vector3 | null>;
  activeId: string | null;
  onNearby: (value: GroundDestination | null) => void;
  onSelect: (destination: GroundDestination) => void;
}) {
  return (
    <>
      <color attach="background" args={["#020812"]} />
      <fogExp2 attach="fog" args={["#07131d", 0.028]} />
      <ambientLight intensity={0.56} color="#d2efff" />
      <hemisphereLight args={["#b9dcff", "#04080c", 1.25]} />
      <directionalLight position={[8, 18, 8]} intensity={3.2} color="#dff5ff" castShadow shadow-mapSize={[2048, 2048]} />
      <directionalLight position={[-10, 7, -12]} intensity={1.4} color="#9a7cff" />
      <Stars radius={130} depth={80} count={1200} factor={2.1} saturation={0.15} fade speed={0.025} />
      <Sparkles count={220} scale={[42, 20, 70]} position={[0, 5, -12]} size={1.5} speed={0.12} opacity={0.26} color="#bcecff" />
      <Player input={input} yaw={yaw} pitch={pitch} target={target} onNearby={onNearby} />
      <GroundTerrain target={target} />
      <Nexus />
      <group name="ground-workforce-and-council-presences">
        {DESTINATIONS.map((destination) => <Chamber key={destination.id} destination={destination} active={activeId === destination.id} onSelect={() => onSelect(destination)} />)}
      </group>
      <EffectComposer multisampling={0}>
        <Bloom intensity={1.08} luminanceThreshold={0.62} luminanceSmoothing={0.24} mipmapBlur />
        <Vignette eskil={false} offset={0.14} darkness={0.7} />
      </EffectComposer>
    </>
  );
}

export default function GroundSpatialWorldClean() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [nearby, setNearby] = useState<GroundDestination | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const yaw = useRef(0);
  const pitch = useRef(-0.05);
  const target = useRef<THREE.Vector3 | null>(null);
  const enter = useCallback((destination: GroundDestination) => router.push(destination.href), [router]);
  const interact = useCallback(() => { if (nearby) enter(nearby); }, [enter, nearby]);
  const reset = useCallback(() => { yaw.current = 0; pitch.current = -0.05; target.current = SPAWN.clone(); }, []);
  const input = useMovementInput({ onEscape: () => router.push("/home?returnFrom=ground"), onInteract: interact, onReset: reset });
  const look = useDragLook({ yaw, pitch, sensitivity: 0.0034, onDragState: setDragging });

  return (
    <main
      className="ground-spatial-root"
      aria-label="URAI Ground embodied private infrastructure"
      data-testid="urai-ground-private-workforce-world"
      data-ground-visual-owner="shared-continuity-architecture"
      data-ground-no-compositing-bands="true"
      data-ground-exploration="walkable"
      data-ground-pointer-lock="false"
      data-ground-ready={ready ? "true" : "false"}
      data-ground-camera-mode={dragging ? "look" : "embodied-idle"}
      {...look}
    >
      <Canvas shadows dpr={[1, 1.6]} camera={{ position: [0, 1.9, 8.5], fov: 56, near: 0.08, far: 180 }} gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }} onCreated={({ gl }) => { gl.setClearColor(0x020812, 1); setReady(true); }}>
        <GroundScene input={input} yaw={yaw} pitch={pitch} target={target} activeId={activeId} onNearby={(destination) => { setNearby(destination); if (destination) setActiveId(destination.id); }} onSelect={(destination) => { setActiveId(destination.id); target.current = new THREE.Vector3(destination.camera[0], 0, destination.camera[2]); }} />
      </Canvas>
      <header className="ground-brand" aria-hidden="true"><span>URAI GROUND</span><strong>{nearby ? nearby.label : "Private infrastructure beneath the living world"}</strong></header>
      <div className="ground-prompt" role="status" aria-live="polite">{nearby ? `Enter ${nearby.label}` : "Walk deeper. Approach a chamber."}</div>
      <nav className="ground-directory" aria-label="Ground destinations">
        {DESTINATIONS.map((destination) => <button key={destination.id} type="button" aria-current={activeId === destination.id ? "location" : undefined} onClick={() => { setActiveId(destination.id); target.current = new THREE.Vector3(destination.camera[0], 0, destination.camera[2]); }}><span style={{ background: destination.color }} /><strong>{destination.label}</strong></button>)}
      </nav>
      <MobileMovementPad input={input} label="Ground movement controls" />
      <style jsx>{`
        .ground-spatial-root{position:fixed;inset:0;width:100vw;height:100svh;overflow:hidden;background:#020812;color:#f8fbff;isolation:isolate;outline:none;touch-action:none;cursor:${dragging ? "grabbing" : "grab"}}
        .ground-spatial-root canvas{position:absolute!important;inset:0;display:block;width:100%!important;height:100%!important}
        .ground-brand{position:absolute;z-index:10;left:max(20px,env(safe-area-inset-left));top:max(20px,env(safe-area-inset-top));display:grid;gap:5px;pointer-events:none;text-shadow:0 12px 40px rgba(0,0,0,.76)}
        .ground-brand span{font:850 10px/1 system-ui;letter-spacing:.28em;color:#a5f3fc}.ground-brand strong{font:700 clamp(17px,2vw,28px)/1.1 system-ui;letter-spacing:-.03em}
        .ground-prompt{position:absolute;z-index:10;left:50%;bottom:max(24px,env(safe-area-inset-bottom));transform:translateX(-50%);padding:10px 16px;border:1px solid rgba(207,250,254,.16);border-radius:999px;background:rgba(2,10,22,.56);backdrop-filter:blur(14px);font:750 11px/1 system-ui;letter-spacing:.1em;text-transform:uppercase;pointer-events:none;white-space:nowrap}
        .ground-directory{position:absolute;z-index:12;right:max(14px,env(safe-area-inset-right));top:50%;transform:translateY(-50%);display:grid;gap:6px;max-height:72vh;overflow:auto;padding:6px;scrollbar-width:none}
        .ground-directory::-webkit-scrollbar{display:none}.ground-directory button{display:flex;align-items:center;gap:8px;min-width:46px;max-width:46px;min-height:44px;padding:8px 12px;border:1px solid rgba(174,225,255,.14);border-radius:15px;background:rgba(2,10,22,.52);color:#f2f9ff;overflow:hidden;transition:max-width .22s ease,background .2s ease,border-color .2s ease;backdrop-filter:blur(12px)}
        .ground-directory button:hover,.ground-directory button:focus-visible,.ground-directory button[aria-current]{max-width:220px;background:rgba(8,34,52,.82);border-color:rgba(207,250,254,.48);outline:none}.ground-directory span{flex:0 0 auto;width:9px;height:9px;border-radius:50%;box-shadow:0 0 14px currentColor}.ground-directory strong{white-space:nowrap;font:700 11px/1 system-ui}
        @media(min-width:901px) and (pointer:fine){.ground-spatial-root :global(.urai-mobile-movement){display:none}}
        @media(max-width:700px){.ground-brand{right:72px}.ground-brand strong{font-size:16px}.ground-directory{top:auto;right:12px;left:172px;bottom:max(78px,calc(env(safe-area-inset-bottom) + 68px));transform:none;display:flex;overflow-x:auto;max-height:none}.ground-directory button{flex:0 0 auto;max-width:46px}.ground-directory button:hover,.ground-directory button:focus-visible,.ground-directory button[aria-current]{max-width:160px}.ground-prompt{bottom:max(20px,env(safe-area-inset-bottom));max-width:calc(100vw - 190px);overflow:hidden;text-overflow:ellipsis}}
      `}</style>
    </main>
  );
}
