"use client";

import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Sparkles, Stars, useAnimations, useGLTF } from "@react-three/drei";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import * as THREE from "three";
import {
  MobileMovementPad,
  stepEmbodiedMotion,
  useDragLook,
  useMovementInput,
  type MovementInput,
} from "@/spatial/navigation/EmbodiedNavigation";
import { DESTINATIONS, type GroundDestination } from "./ground/GroundWorldModel";

const GROUND_MODEL = "/assets/urai/generated/models/ground-world-terrain-v1.glb";
const BOUNDS = { minX: -13, maxX: 13, minZ: -13, maxZ: 13 };
const SPAWN = new THREE.Vector3(0, 0, 8.5);

function liftedMaterial(material: THREE.Material) {
  const clone = material.clone();
  if (clone instanceof THREE.MeshStandardMaterial) {
    clone.color.multiplyScalar(1.55);
    clone.emissive.copy(clone.color).multiplyScalar(0.18);
    clone.emissiveIntensity = Math.max(clone.emissiveIntensity, 0.55);
    clone.roughness = Math.min(clone.roughness, 0.7);
    clone.metalness = Math.min(clone.metalness, 0.35);
    clone.needsUpdate = true;
  }
  return clone;
}

function prepareModel(source: THREE.Object3D) {
  source.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.material = Array.isArray(object.material)
      ? object.material.map(liftedMaterial)
      : liftedMaterial(object.material);
    object.castShadow = true;
    object.receiveShadow = true;
    object.frustumCulled = false;
  });
  return source;
}

function bindGroundAuthoredRegions(source: THREE.Object3D) {
  const thresholds: Record<string, string[]> = {};
  for (const destination of DESTINATIONS) {
    const matched: THREE.Object3D[] = [];
    source.traverse((object) => {
      if (object.name === `ground-destination-${destination.id}` || object.name.startsWith(`${destination.id}-`)) matched.push(object);
    });
    if (!matched.length) throw new Error(`Authored Ground is missing destination geometry for ground-enterable-threshold-${destination.id}.`);
    thresholds[destination.id] = matched.map((object) => object.name);
    for (const object of matched) {
      object.userData.uraiEnterableThreshold = `ground-enterable-threshold-${destination.id}`;
      object.userData.destinationHref = destination.href;
      object.userData.destinationLabel = destination.label;
    }
  }
  source.userData.uraiEnterableThresholds = thresholds;
  return source;
}

function GroundWorld({ target, activeId, onSelect }: {
  target: MutableRefObject<THREE.Vector3 | null>;
  activeId: string | null;
  onSelect: (destination: GroundDestination) => void;
}) {
  const { scene, animations } = useGLTF(GROUND_MODEL);
  const root = useRef<THREE.Group>(null);
  const world = useMemo(() => bindGroundAuthoredRegions(prepareModel(scene.clone(true))), [scene]);
  const { actions } = useAnimations(animations, root);

  useEffect(() => {
    actions.Ground_Pulse?.reset().fadeIn(0.35).play();
    actions.Nexus_Idle?.reset().fadeIn(0.35).play();
    return () => {
      actions.Ground_Pulse?.fadeOut(0.2);
      actions.Nexus_Idle?.fadeOut(0.2);
    };
  }, [actions]);

  useEffect(() => {
    for (const destination of DESTINATIONS) {
      const node = world.getObjectByName(`ground-destination-${destination.id}`);
      if (node) node.scale.setScalar(activeId === destination.id ? 1.08 : 1);
    }
  }, [activeId, world]);

  const onWorldClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    let object: THREE.Object3D | null = event.object;
    while (object) {
      const threshold = typeof object.userData.uraiEnterableThreshold === "string" ? object.userData.uraiEnterableThreshold : null;
      const destination = threshold
        ? DESTINATIONS.find((item) => threshold === `ground-enterable-threshold-${item.id}`)
        : DESTINATIONS.find((item) => object?.name === `ground-destination-${item.id}` || object?.name.startsWith(`${item.id}-`));
      if (destination) { onSelect(destination); return; }
      object = object.parent;
    }
    target.current = new THREE.Vector3(
      THREE.MathUtils.clamp(event.point.x, BOUNDS.minX, BOUNDS.maxX),
      0,
      THREE.MathUtils.clamp(event.point.z, BOUNDS.minZ, BOUNDS.maxZ),
    );
  };

  return (
    <group ref={root} name="ground-continuity-architectural-shell" userData={{ runtimeAsset: GROUND_MODEL, semanticOwner: "ground-continuity-architectural-shell" }} onClick={onWorldClick}>
      <group name="ground-walkable-path-network" userData={{ authoredNodeFamily: "path-bridge-* engraved-path-*" }}>
        <group name="ground-central-nexus" userData={{ authoredNodeFamily: "ground-central-nexus nexus-core" }}>
          <group name="ground-workforce-and-council-presences" userData={{ authoredNodeFamily: "ground-destination-council council-* workforce-*" }}>
            <primitive object={world} />
          </group>
        </group>
      </group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]} name="ground-walkable-navigation-surface" userData={{ semanticOwner: "urai-ground-walkable-surface" }} onClick={onWorldClick}>
        <planeGeometry args={[28, 28]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
    </group>
  );
}

function Player({ input, yaw, pitch, target, onNearby }: {
  input: MovementInput;
  yaw: MutableRefObject<number>;
  pitch: MutableRefObject<number>;
  target: MutableRefObject<THREE.Vector3 | null>;
  onNearby: (value: GroundDestination | null) => void;
}) {
  const { camera, size } = useThree();
  const position = useRef(SPAWN.clone());
  const velocity = useRef(new THREE.Vector3());
  const desired = useRef(new THREE.Vector3());
  const lookAt = useRef(new THREE.Vector3());
  const nearbyRef = useRef<string | null>(null);

  useFrame((_, delta) => {
    stepEmbodiedMotion({ position: position.current, velocity: velocity.current, input, target, yaw: yaw.current, delta, speed: 4.1, acceleration: 11, deceleration: 13, bounds: BOUNDS, obstacles: [{ x: 0, z: -1, radius: 2.2 }] });
    const portrait = size.height > size.width;
    const distance = portrait ? 13.5 : 16.5;
    const height = portrait ? 7.6 : 8.8;
    desired.current.set(position.current.x, height + pitch.current * 1.4, position.current.z + distance);
    camera.position.lerp(desired.current, 1 - Math.pow(0.0025, delta));
    lookAt.current.set(position.current.x, 0.8, position.current.z - (portrait ? 5.2 : 7.6));
    camera.lookAt(lookAt.current);

    let nearest: GroundDestination | null = null;
    let best = 3.2;
    for (const destination of DESTINATIONS) {
      const distanceToDestination = Math.hypot(position.current.x - destination.position[0], position.current.z - destination.position[2]);
      if (distanceToDestination < best) { best = distanceToDestination; nearest = destination; }
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
      <color attach="background" args={["#102b38"]} />
      <fogExp2 attach="fog" args={["#173843", 0.012]} />
      <ambientLight intensity={1.0} color="#d8f4f2" />
      <hemisphereLight args={["#eaf8ef", "#1f2d2c", 2.1]} />
      <directionalLight position={[9, 18, 12]} intensity={6.2} color="#ffd7a0" castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-11, 9, -8]} intensity={3.0} color="#9edcff" />
      <pointLight position={[0, 10, -5]} intensity={12} distance={55} decay={2} color="#ffc479" />
      <pointLight position={[8, 5, 4]} intensity={5} distance={32} decay={2} color="#8fe5ff" />
      <Stars radius={130} depth={80} count={650} factor={1.45} saturation={0.1} fade speed={0.015} />
      <Sparkles count={95} scale={[28, 12, 30]} position={[0, 4, -4]} size={1.0} speed={0.05} opacity={0.13} color="#f9e7ba" />
      <Player input={input} yaw={yaw} pitch={pitch} target={target} onNearby={onNearby} />
      <GroundWorld target={target} activeId={activeId} onSelect={onSelect} />
      <EffectComposer multisampling={0}>
        <Bloom intensity={0.72} luminanceThreshold={0.62} luminanceSmoothing={0.22} mipmapBlur />
        <Vignette eskil={false} offset={0.12} darkness={0.16} />
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
  const pitch = useRef(-0.08);
  const target = useRef<THREE.Vector3 | null>(null);

  const enter = useCallback((destination: GroundDestination) => router.push(destination.href), [router]);
  const interact = useCallback(() => { if (nearby) enter(nearby); }, [enter, nearby]);
  const reset = useCallback(() => { yaw.current = 0; pitch.current = -0.08; target.current = SPAWN.clone(); }, []);
  const input = useMovementInput({ onEscape: () => router.push("/home?returnFrom=ground"), onInteract: interact, onReset: reset });
  const look = useDragLook({ yaw, pitch, sensitivity: 0.0034, onDragState: setDragging });
  const focusDestination = useCallback((destination: GroundDestination) => {
    setActiveId(destination.id);
    target.current = new THREE.Vector3(destination.camera[0], 0, destination.camera[2]);
  }, []);

  return (
    <main
      className="ground-spatial-root"
      aria-label="URAI Ground embodied private infrastructure"
      data-testid="urai-ground-private-workforce-world"
      data-ground-visual-owner="shared-continuity-architecture"
      data-ground-runtime-owner="final-glb-infrastructure-world"
      data-ground-runtime-assets="ground-world-terrain-v1.glb"
      data-ground-no-compositing-bands="true"
      data-ground-exploration="walkable"
      data-ground-pointer-lock="false"
      data-ground-ready={ready ? "true" : "false"}
      data-ground-camera-mode={dragging ? "look" : "embodied-idle"}
      data-ground-enterable-thresholds={DESTINATIONS.map((destination) => `ground-enterable-threshold-${destination.id}`).join(" ")}
      {...look}
    >
      <Canvas
        shadows
        dpr={[1, 1.3]}
        camera={{ position: [0, 8.8, 25], fov: 52, near: 0.08, far: 180 }}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x102b38, 1);
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.35;
          setReady(true);
        }}
      >
        <GroundScene input={input} yaw={yaw} pitch={pitch} target={target} activeId={activeId} onNearby={(destination) => { setNearby(destination); if (destination) setActiveId(destination.id); }} onSelect={focusDestination} />
      </Canvas>
      <header className="ground-brand" aria-hidden="true"><span>URAI GROUND</span><strong>{nearby ? nearby.label : "Private infrastructure beneath the living world"}</strong></header>
      <div className="ground-prompt" role="status" aria-live="polite">{nearby ? `Enter ${nearby.label}` : "Walk deeper. Approach a chamber."}</div>
      <nav className="ground-directory ground-destination-compass" aria-label="Ground destinations">
        {DESTINATIONS.map((destination) => (
          <button key={destination.id} type="button" data-ground-destination={destination.id} aria-current={activeId === destination.id ? "location" : undefined} onFocus={(event) => event.currentTarget.scrollIntoView({ block: "nearest", inline: "nearest" })} onClick={() => focusDestination(destination)} onDoubleClick={() => enter(destination)}>
            <span style={{ background: destination.color }} /><strong>{destination.label}</strong>
          </button>
        ))}
      </nav>
      <MobileMovementPad input={input} label="Ground movement controls" />
      <span className="sr-only" data-testid="urai-ground-walkable-surface">The authored Ground navigation surface is active.</span>
      <style jsx>{`
        .ground-spatial-root{position:fixed;inset:0;width:100vw;height:100svh;overflow:hidden;background:#102b38;color:#f8fbff;isolation:isolate;outline:none;touch-action:none;cursor:${dragging ? "grabbing" : "grab"}}
        .ground-spatial-root canvas{position:absolute!important;inset:0;display:block;width:100%!important;height:100%!important;filter:saturate(1.08) contrast(1.02)}
        .ground-brand{position:absolute;z-index:10;left:max(20px,env(safe-area-inset-left));top:max(20px,env(safe-area-inset-top));display:grid;gap:5px;pointer-events:none;text-shadow:0 12px 40px rgba(0,0,0,.56)}
        .ground-brand span{font:850 10px/1 system-ui;letter-spacing:.28em;color:#c5f6ff}.ground-brand strong{font:700 clamp(17px,2vw,28px)/1.1 system-ui;letter-spacing:-.03em}
        .ground-prompt{position:absolute;z-index:10;left:50%;bottom:max(24px,env(safe-area-inset-bottom));transform:translateX(-50%);padding:10px 16px;border:1px solid rgba(235,250,245,.18);border-radius:999px;background:rgba(5,19,24,.46);backdrop-filter:blur(14px);font:750 11px/1 system-ui;letter-spacing:.1em;text-transform:uppercase;pointer-events:none;white-space:nowrap}
        .ground-directory{position:absolute;z-index:12;right:max(14px,env(safe-area-inset-right));top:50%;transform:translateY(-50%);display:grid;gap:6px;max-height:72vh;overflow:auto;padding:6px;scrollbar-width:none}.ground-directory::-webkit-scrollbar{display:none}
        .ground-directory button{display:flex;align-items:center;gap:8px;min-width:48px;min-height:48px;max-width:190px;padding:9px 11px;border:1px solid rgba(255,255,255,.12);border-radius:999px;background:rgba(4,18,24,.46);color:#f3fbff;backdrop-filter:blur(12px);cursor:pointer}.ground-directory button span{width:7px;height:7px;border-radius:50%}.ground-directory strong{font:700 10px/1 system-ui;letter-spacing:.06em}.ground-destination-compass :is(a,button) strong{transition:none}.ground-directory button[aria-current="location"]{border-color:rgba(201,246,255,.64);background:rgba(20,56,65,.7)}
        @media(max-width:760px){.ground-brand{left:16px;top:16px}.ground-directory{left:0;right:0;top:auto;bottom:72px;transform:none;display:flex;overflow-x:auto;padding-inline:max(14px,env(safe-area-inset-left)) max(14px,env(safe-area-inset-right));scroll-padding-inline-start:max(14px,env(safe-area-inset-left));scroll-padding-inline-end:max(14px,env(safe-area-inset-right))}.ground-directory button{flex:0 0 auto}.ground-directory strong{font-size:9px;transition:none}.ground-prompt{bottom:126px;max-width:calc(100vw - 28px);overflow:hidden;text-overflow:ellipsis}}
      `}</style>
    </main>
  );
}

useGLTF.preload(GROUND_MODEL);
