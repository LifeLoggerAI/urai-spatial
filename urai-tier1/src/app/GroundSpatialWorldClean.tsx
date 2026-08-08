"use client";

import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Sparkles, useAnimations, useGLTF } from "@react-three/drei";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
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
import { DESTINATIONS, type GroundDestination, type GroundChamberForm } from "./ground/GroundWorldModel";

const GROUND_MODEL = "/assets/urai/generated/models/ground-world-terrain-v1.glb";
const BOUNDS = { minX: -14, maxX: 14, minZ: -34, maxZ: 11 };
const SPAWN = new THREE.Vector3(0, 0, 4);

const CHAMBER_CHARACTER: Record<GroundChamberForm, readonly [number, number, number]> = {
  pavilion: [1.55, 0.62, 1.7],
  sanctuary: [1.18, 1.34, 1.3],
  council: [1.75, 0.72, 1.65],
  transit: [0.78, 1.72, 1.28],
  restorative: [1.62, 0.58, 1.58],
  archive: [0.92, 1.5, 1.18],
  reflection: [1.58, 0.78, 0.82],
  vault: [1.25, 1.2, 1.28],
  observatory: [1.5, 0.9, 1.6],
  aperture: [0.7, 1.58, 0.78],
  theater: [1.85, 0.64, 1.28],
};

function liftedMaterial(material: THREE.Material) {
  const clone = material.clone();
  if (clone instanceof THREE.MeshStandardMaterial) {
    clone.color.multiplyScalar(1.08);
    clone.emissive.copy(clone.color).multiplyScalar(0.035);
    clone.emissiveIntensity = Math.max(clone.emissiveIntensity, 0.16);
    clone.roughness = Math.max(clone.roughness, 0.5);
    clone.metalness = Math.min(clone.metalness, 0.3);
    clone.needsUpdate = true;
  }
  return clone;
}

function prepareModel(source: THREE.Object3D) {
  source.traverse((object) => {
    if (object.name.startsWith("ground-dimensional-path-")) {
      object.visible = false;
      return;
    }
    if (object.name.endsWith("-signal-rune")) object.scale.multiplyScalar(0.62);
    if (!(object instanceof THREE.Mesh)) return;
    object.material = Array.isArray(object.material)
      ? object.material.map(liftedMaterial)
      : liftedMaterial(object.material);
    object.castShadow = true;
    object.receiveShadow = true;
    object.frustumCulled = false;
  });

  for (const destination of DESTINATIONS) {
    const root = source.getObjectByName(`ground-destination-${destination.id}`);
    if (!root) continue;
    const character = CHAMBER_CHARACTER[destination.chamberForm];
    root.scale.set(character[0], character[1], character[2]);
    root.userData.uraiChamberForm = destination.chamberForm;
    root.userData.uraiLayer = destination.layer;
  }
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
      if (!node) continue;
      const character = CHAMBER_CHARACTER[destination.chamberForm];
      const attention = activeId === destination.id ? 1.07 : 1;
      node.scale.set(character[0] * attention, character[1] * attention, character[2] * attention);
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
      if (destination) {
        onSelect(destination);
        return;
      }
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
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, -11]} name="ground-walkable-navigation-surface" userData={{ semanticOwner: "urai-ground-walkable-surface" }} onClick={onWorldClick}>
        <planeGeometry args={[30, 44]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
    </group>
  );
}

function ArchitecturalRouteLighting({ activeId }: { activeId: string | null }) {
  const routes = useMemo(() => DESTINATIONS.map((destination) => {
    const dx = destination.position[0];
    const dz = destination.position[2] + 1;
    const length = Math.max(1, Math.hypot(dx, dz));
    return {
      destination,
      position: [dx / 2, 0.095, (-1 + destination.position[2]) / 2] as [number, number, number],
      rotationY: Math.atan2(dx, dz),
      length,
    };
  }), []);

  return <group name="ground-authored-architectural-route-lighting" raycast={() => null}>
    {routes.map(({ destination, position, rotationY, length }) => {
      const active = activeId === destination.id;
      return <mesh key={destination.id} position={position} rotation={[0, rotationY, 0]} receiveShadow>
        <boxGeometry args={[active ? 0.52 : 0.34, 0.025, length]} />
        <meshStandardMaterial
          color={destination.color}
          emissive={destination.color}
          emissiveIntensity={active ? 0.7 : 0.14}
          roughness={0.72}
          metalness={0.08}
          transparent
          opacity={active ? 0.34 : 0.11}
        />
      </mesh>;
    })}
  </group>;
}

function Player({ input, yaw, pitch, target, activeId, onNearby }: {
  input: MovementInput;
  yaw: MutableRefObject<number>;
  pitch: MutableRefObject<number>;
  target: MutableRefObject<THREE.Vector3 | null>;
  activeId: string | null;
  onNearby: (value: GroundDestination | null) => void;
}) {
  const { camera, size } = useThree();
  const position = useRef(SPAWN.clone());
  const velocity = useRef(new THREE.Vector3());
  const desired = useRef(new THREE.Vector3());
  const cameraOffset = useRef(new THREE.Vector3());
  const forward = useRef(new THREE.Vector3());
  const lookAt = useRef(new THREE.Vector3());
  const nearbyRef = useRef<string | null>(null);
  const activeDestination = useMemo(() => DESTINATIONS.find((destination) => destination.id === activeId) || null, [activeId]);

  useFrame((_, delta) => {
    stepEmbodiedMotion({
      position: position.current,
      velocity: velocity.current,
      input,
      target,
      yaw: yaw.current,
      delta,
      speed: 4.1,
      acceleration: 11,
      deceleration: 13,
      bounds: BOUNDS,
      obstacles: [{ x: 0, z: -1, radius: 2.15 }],
    });

    const portrait = size.height > size.width;
    const distance = portrait ? 6.6 : 8.2;
    const height = portrait ? 3.15 : 3.35;
    cameraOffset.current.set(0, height + pitch.current * 0.72, distance).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw.current);
    desired.current.copy(position.current).add(cameraOffset.current);
    camera.position.lerp(desired.current, 1 - Math.pow(0.0018, delta));

    if (activeDestination && Math.hypot(position.current.x - activeDestination.camera[0], position.current.z - activeDestination.camera[2]) < 5.5) {
      lookAt.current.set(activeDestination.lookAt[0], activeDestination.lookAt[1], activeDestination.lookAt[2]);
    } else {
      forward.current.set(0, 0, -12.5).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw.current);
      lookAt.current.copy(position.current).add(forward.current);
      lookAt.current.y = 1.25 + pitch.current;
    }
    camera.lookAt(lookAt.current);

    let nearest: GroundDestination | null = null;
    let best = 3.2;
    for (const destination of DESTINATIONS) {
      const distanceToDestination = Math.hypot(position.current.x - destination.position[0], position.current.z - destination.position[2]);
      if (distanceToDestination < best) {
        best = distanceToDestination;
        nearest = destination;
      }
    }
    const id = nearest?.id ?? null;
    if (id !== nearbyRef.current) {
      nearbyRef.current = id;
      onNearby(nearest);
    }
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
      <ambientLight intensity={0.52} color="#d8f4f2" />
      <hemisphereLight args={["#eaf8ef", "#1f2d2c", 1.05]} />
      <directionalLight position={[9, 18, 12]} intensity={3.25} color="#ffd7a0" castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-11, 9, -8]} intensity={0.9} color="#9edcff" />
      <pointLight position={[0, 4.2, -1]} intensity={3.2} distance={24} decay={2} color="#ffc479" />
      <pointLight position={[7.5, 3.1, -15]} intensity={1.6} distance={22} decay={2} color="#8fe5ff" />
      <pointLight position={[-8.2, 3.4, -23]} intensity={1.4} distance={22} decay={2} color="#cabdff" />
      <Sparkles count={28} scale={[28, 7, 36]} position={[0, 2.5, -12]} size={0.48} speed={0.025} opacity={0.045} color="#f9e7ba" />
      <Player input={input} yaw={yaw} pitch={pitch} target={target} activeId={activeId} onNearby={onNearby} />
      <GroundWorld target={target} activeId={activeId} onSelect={onSelect} />
      <ArchitecturalRouteLighting activeId={activeId} />
      <EffectComposer multisampling={0}>
        <Bloom intensity={0.24} luminanceThreshold={0.82} luminanceSmoothing={0.18} mipmapBlur />
        <Vignette eskil={false} offset={0.12} darkness={0.12} />
      </EffectComposer>
    </>
  );
}

export default function GroundSpatialWorldClean() {
  const router = useRouter();
  const params = useSearchParams();
  const [ready, setReady] = useState(false);
  const [nearby, setNearby] = useState<GroundDestination | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const yaw = useRef(0);
  const pitch = useRef(-0.08);
  const target = useRef<THREE.Vector3 | null>(null);

  const enter = useCallback((destination: GroundDestination) => router.push(destination.href), [router]);
  const interact = useCallback(() => {
    if (nearby) enter(nearby);
  }, [enter, nearby]);
  const reset = useCallback(() => {
    yaw.current = 0;
    pitch.current = -0.08;
    target.current = SPAWN.clone();
    setActiveId(null);
  }, []);
  const input = useMovementInput({ onEscape: () => router.push("/home?returnFrom=ground"), onInteract: interact, onReset: reset });
  const look = useDragLook({ yaw, pitch, sensitivity: 0.0034, onDragState: setDragging });
  const focusDestination = useCallback((destination: GroundDestination) => {
    setActiveId(destination.id);
    target.current = new THREE.Vector3(destination.camera[0], 0, destination.camera[2]);
  }, []);

  useEffect(() => {
    const district = params.get("district");
    if (!district) return;
    const destination = DESTINATIONS.find((item) => item.id === district);
    if (destination) focusDestination(destination);
  }, [focusDestination, params]);

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
        <GroundScene
          input={input}
          yaw={yaw}
          pitch={pitch}
          target={target}
          activeId={activeId}
          onNearby={(destination) => {
            setNearby(destination);
            if (destination) setActiveId(destination.id);
          }}
          onSelect={focusDestination}
        />
      </Canvas>

      <header className="ground-brand" aria-hidden="true">
        <span>URAI GROUND</span>
        <strong>{nearby ? nearby.label : "Private infrastructure beneath the living world"}</strong>
      </header>
      <button className="ground-home-return" type="button" onClick={() => router.push("/home?returnFrom=ground")} aria-label="Return Home">Home</button>
      <div className="ground-prompt" role="status" aria-live="polite">{nearby ? `Enter ${nearby.label}` : "Walk deeper. Approach a chamber."}</div>
      <nav className="ground-directory ground-destination-compass" aria-label="Ground destinations">
        {DESTINATIONS.map((destination) => (
          <button
            key={destination.id}
            type="button"
            data-ground-destination={destination.id}
            aria-label={`Approach ${destination.label}`}
            aria-current={activeId === destination.id ? "location" : undefined}
            onFocus={(event) => event.currentTarget.scrollIntoView({ block: "nearest", inline: "nearest" })}
            onClick={() => focusDestination(destination)}
            onDoubleClick={() => enter(destination)}
          >
            <span style={{ background: destination.color }} />
            <strong>{destination.label}</strong>
          </button>
        ))}
      </nav>
      <MobileMovementPad input={input} label="Ground movement controls" />
      <span className="sr-only" data-testid="urai-ground-walkable-surface">The authored Ground navigation surface is active.</span>

      <style jsx>{`
        .ground-spatial-root{position:fixed;inset:0;width:100vw;height:100svh;overflow:hidden;background:#102b38;color:#f8fbff;isolation:isolate;outline:none;touch-action:none;cursor:${dragging ? "grabbing" : "grab"}}
        .ground-spatial-root canvas{position:absolute!important;inset:0;display:block;width:100%!important;height:100%!important;filter:saturate(1.02) contrast(1.015)}
        .ground-brand{position:absolute;z-index:10;left:max(18px,env(safe-area-inset-left));top:max(18px,env(safe-area-inset-top));display:grid;gap:4px;max-width:min(360px,62vw);pointer-events:none;text-shadow:0 10px 34px rgba(0,0,0,.58)}
        .ground-brand span{font:800 9px/1 system-ui;letter-spacing:.28em;color:rgba(197,246,255,.82)}
        .ground-brand strong{font:650 12px/1.25 system-ui;letter-spacing:.01em;color:rgba(244,251,252,.72);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .ground-home-return{position:absolute;z-index:14;right:max(16px,env(safe-area-inset-right));top:max(16px,env(safe-area-inset-top));min-width:48px;min-height:48px;padding:0 13px;border:1px solid rgba(226,248,247,.16);border-radius:999px;background:rgba(5,20,24,.38);color:rgba(241,251,249,.82);backdrop-filter:blur(12px);font:750 9px/1 system-ui;letter-spacing:.12em;text-transform:uppercase;cursor:pointer}
        .ground-prompt{position:absolute;z-index:10;left:50%;bottom:max(84px,calc(env(safe-area-inset-bottom) + 74px));transform:translateX(-50%);padding:8px 13px;border:1px solid rgba(235,250,245,.12);border-radius:999px;background:rgba(5,19,24,.32);backdrop-filter:blur(12px);font:720 9px/1 system-ui;letter-spacing:.11em;text-transform:uppercase;color:rgba(239,249,247,.68);pointer-events:none;white-space:nowrap}
        .ground-directory{position:absolute;z-index:12;left:50%;bottom:max(18px,env(safe-area-inset-bottom));transform:translateX(-50%);display:flex;align-items:center;gap:2px;max-width:min(720px,calc(100vw - 140px));overflow-x:auto;padding:4px 6px;scrollbar-width:none;mask-image:linear-gradient(90deg,transparent,#000 28px,#000 calc(100% - 28px),transparent)}
        .ground-directory::-webkit-scrollbar{display:none}
        .ground-directory button{display:flex;align-items:center;justify-content:center;gap:0;min-width:48px;min-height:48px;width:48px;max-width:180px;padding:0;border:1px solid transparent;border-radius:999px;background:transparent;color:#f3fbff;cursor:pointer;transition:background .2s ease,border-color .2s ease,width .24s ease,gap .24s ease,padding .24s ease}
        .ground-directory button>span{width:7px;height:7px;border-radius:50%;box-shadow:0 0 18px currentColor;flex:0 0 auto}
        .ground-directory strong{max-width:0;overflow:hidden;opacity:0;white-space:nowrap;font:700 9px/1 system-ui;letter-spacing:.04em;transition:max-width .2s ease,opacity .2s ease}
        .ground-directory button:is(:hover,:focus-visible,[aria-current="location"]){width:auto;gap:8px;padding:0 12px;border-color:rgba(201,246,255,.24);background:rgba(4,18,24,.48);backdrop-filter:blur(12px)}
        .ground-directory button:is(:hover,:focus-visible,[aria-current="location"]) strong{max-width:122px;opacity:.82}
        .ground-destination-compass :is(a,button) strong{transition:max-width .2s ease,opacity .2s ease}
        @media(max-width:760px){.ground-brand{left:14px;top:14px;max-width:62vw}.ground-brand strong{font-size:10px}.ground-home-return{right:12px;top:12px}.ground-directory{left:0;right:0;bottom:max(14px,env(safe-area-inset-bottom));transform:none;max-width:none;padding-inline:max(14px,env(safe-area-inset-left)) max(14px,env(safe-area-inset-right));scroll-padding-inline-start:max(14px,env(safe-area-inset-left));scroll-padding-inline-end:max(14px,env(safe-area-inset-right));mask-image:linear-gradient(90deg,transparent,#000 28px,#000 calc(100% - 28px),transparent)}.ground-directory button{flex:0 0 48px}.ground-directory button:is(:hover,:focus-visible,[aria-current="location"]){flex-basis:auto}.ground-prompt{bottom:78px;max-width:calc(100vw - 28px);overflow:hidden;text-overflow:ellipsis}}
        @media(prefers-reduced-motion:reduce){.ground-directory strong{font-size:9px;transition:none}.ground-destination-compass :is(a,button) strong{transition:none}.ground-directory button{transition:none}}
      `}</style>
    </main>
  );
}

useGLTF.preload(GROUND_MODEL);
