"use client";

import { PerspectiveCamera, Stars } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { DESTINATIONS, type GroundDestination } from "./GroundWorldModel";
import { WorldEnvelope } from "./GroundWorldEnvironment";
import { Corridor, DestinationArchitecture } from "./GroundWorldStructures";

function CameraRig({
  active,
  prefersReducedMotion,
}: {
  active: GroundDestination | null;
  prefersReducedMotion: boolean;
}) {
  const { size } = useThree();
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const target = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, delta) => {
    if (!cameraRef.current) return;
    target.set(
      ...(active?.camera ??
        (size.width < 700 ? [0, 5.65, 10.6] : [0, 5.25, 10.2])),
    );
    look.set(...(active?.lookAt ?? [0, 1.85, -13.6]));
    const damping = prefersReducedMotion ? 100 : 4.1;
    cameraRef.current.position.x = THREE.MathUtils.damp(
      cameraRef.current.position.x,
      target.x,
      damping,
      delta,
    );
    cameraRef.current.position.y = THREE.MathUtils.damp(
      cameraRef.current.position.y,
      target.y,
      damping,
      delta,
    );
    cameraRef.current.position.z = THREE.MathUtils.damp(
      cameraRef.current.position.z,
      target.z,
      damping,
      delta,
    );
    cameraRef.current.lookAt(look);
  });

  return (
    <PerspectiveCamera
      ref={cameraRef}
      makeDefault
      position={[0, 5.25, 10.2]}
      fov={size.width < 700 ? 61 : 49}
      near={0.08}
      far={160}
    />
  );
}

function GroundNexus({
  prefersReducedMotion,
}: {
  prefersReducedMotion: boolean;
}) {
  const pulse = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!pulse.current || prefersReducedMotion) return;
    pulse.current.rotation.y = clock.elapsedTime * 0.035;
    pulse.current.rotation.z = Math.sin(clock.elapsedTime * 0.15) * 0.04;
  });
  return (
    <group
      position={[0, 0.08, -10.5]}
      name="ground-central-nexus"
      data-testid="urai-ground-central-nexus"
    >
      <mesh receiveShadow castShadow>
        <cylinderGeometry args={[4.25, 4.75, 0.38, 64]} />
        <meshPhysicalMaterial
          color="#0a1822"
          emissive="#133748"
          emissiveIntensity={0.22}
          roughness={0.22}
          metalness={0.68}
          clearcoat={0.82}
        />
      </mesh>
      <mesh position={[0, 0.23, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.25, 2.42, 96]} />
        <meshBasicMaterial
          color="#67e8f9"
          transparent
          opacity={0.54}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0, 0.25, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3.4, 3.5, 96]} />
        <meshBasicMaterial
          color="#c4b5fd"
          transparent
          opacity={0.24}
          toneMapped={false}
        />
      </mesh>
      <group ref={pulse} position={[0, 1.1, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.45, 0.035, 12, 96]} />
          <meshBasicMaterial
            color="#67e8f9"
            transparent
            opacity={0.38}
            toneMapped={false}
          />
        </mesh>
        <mesh rotation={[Math.PI / 2.45, 0.4, 0.3]}>
          <torusGeometry args={[1.85, 0.022, 10, 96]} />
          <meshBasicMaterial
            color="#fde68a"
            transparent
            opacity={0.24}
            toneMapped={false}
          />
        </mesh>
      </group>
    </group>
  );
}

function LayeredTerraces() {
  const terraces = [
    { y: 0.08, z: -6, width: 22, depth: 8, color: "#0b1a25" },
    { y: 0.5, z: -14.2, width: 24, depth: 8.8, color: "#0a1722" },
    { y: 1.35, z: -22.1, width: 21, depth: 7.5, color: "#091521" },
    { y: 2.65, z: -29, width: 23, depth: 7.8, color: "#08131e" },
  ] as const;
  return (
    <group
      name="ground-layered-terraces"
      data-testid="urai-ground-layered-terraces"
    >
      {terraces.map((terrace, index) => (
        <group key={terrace.z} position={[0, terrace.y, terrace.z]}>
          <mesh receiveShadow castShadow>
            <boxGeometry args={[terrace.width, 0.38, terrace.depth]} />
            <meshPhysicalMaterial
              color={terrace.color}
              emissive={index % 2 ? "#102c3c" : "#0d2633"}
              emissiveIntensity={0.12}
              roughness={0.45}
              metalness={0.42}
              clearcoat={0.28}
            />
          </mesh>
          <mesh position={[0, 0.22, terrace.depth * 0.48]}>
            <boxGeometry args={[terrace.width * 0.8, 0.035, 0.08]} />
            <meshBasicMaterial
              color={index % 2 ? "#a78bfa" : "#67e8f9"}
              transparent
              opacity={0.18}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}
      {[
        [-4.8, 0.2, -8.8],
        [4.8, 0.2, -8.8],
        [-6.8, 0.75, -18.1],
        [6.8, 0.75, -18.1],
        [-4.2, 1.85, -25.6],
        [4.2, 1.85, -25.6],
      ].map(([x, y, z], index) => (
        <mesh
          key={`${x}-${z}`}
          position={[x, y, z]}
          rotation={[-0.18, 0, 0]}
          receiveShadow
          castShadow
        >
          <boxGeometry args={[2.6, 0.24, 4.6]} />
          <meshPhysicalMaterial
            color="#0a1924"
            emissive={index % 2 ? "#221b3b" : "#103246"}
            emissiveIntensity={0.12}
            roughness={0.42}
            metalness={0.46}
            clearcoat={0.32}
          />
        </mesh>
      ))}
    </group>
  );
}

function InitialOverlook() {
  return (
    <group
      position={[0, 4.15, 4.2]}
      name="ground-arrival-overlook"
      data-testid="urai-ground-arrival-overlook"
    >
      <mesh position={[0, -0.2, 0]} receiveShadow castShadow>
        <boxGeometry args={[8.2, 0.42, 3.4]} />
        <meshPhysicalMaterial
          color="#0d1b25"
          emissive="#123141"
          emissiveIntensity={0.14}
          roughness={0.32}
          metalness={0.58}
          clearcoat={0.48}
        />
      </mesh>
      <mesh position={[0, 0.1, -1.5]}>
        <boxGeometry args={[7.4, 0.05, 0.08]} />
        <meshBasicMaterial
          color="#67e8f9"
          transparent
          opacity={0.36}
          toneMapped={false}
        />
      </mesh>
      {[-3.8, 3.8].map((x) => (
        <mesh key={x} position={[x, 1.2, -0.2]}>
          <boxGeometry args={[0.18, 2.8, 0.18]} />
          <meshStandardMaterial
            color="#102936"
            emissive="#67e8f9"
            emissiveIntensity={0.12}
            roughness={0.4}
            metalness={0.5}
          />
        </mesh>
      ))}
    </group>
  );
}

function WorkforcePresence({
  destination,
  index,
  prefersReducedMotion,
}: {
  destination: GroundDestination;
  index: number;
  prefersReducedMotion: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const color = useMemo(
    () => new THREE.Color(destination.color),
    [destination.color],
  );
  const blocked = destination.workforceState === "blocked";
  const waiting = destination.workforceState === "awaiting-owner-approval";
  const opacity =
    destination.workforceState === "revoked"
      ? 0.18
      : blocked
        ? 0.34
        : waiting
          ? 0.58
          : 0.78;

  useFrame(({ clock }) => {
    if (!group.current || prefersReducedMotion || blocked || waiting) return;
    const time = clock.elapsedTime * 0.13 + index * 0.8;
    group.current.position.x =
      destination.position[0] * 0.88 + Math.sin(time) * 0.18;
    group.current.position.z =
      destination.position[2] + 1.7 + Math.cos(time) * 0.14;
    group.current.rotation.y = -time + Math.PI * 0.5;
  });

  return (
    <group
      ref={group}
      position={[
        destination.position[0] * 0.88,
        destination.position[1],
        destination.position[2] + (waiting ? 3.25 : 1.7),
      ]}
      userData={{
        workforceState: destination.workforceState,
        serviceAvailability: destination.availability,
      }}
    >
      <mesh position={[0, 1.62, 0]} castShadow>
        <sphereGeometry args={[0.15, 24, 24]} />
        <meshStandardMaterial
          color="#eefcff"
          emissive={color}
          emissiveIntensity={0.45}
          transparent
          opacity={opacity}
        />
      </mesh>
      <mesh position={[0, 1.03, 0]} castShadow>
        <capsuleGeometry args={[0.19, 0.76, 10, 20]} />
        <meshPhysicalMaterial
          color="#111c26"
          emissive={color}
          emissiveIntensity={0.22}
          roughness={0.3}
          metalness={0.48}
          clearcoat={0.5}
          transparent
          opacity={opacity}
        />
      </mesh>
      <mesh position={[-0.24, 1.15, 0]} rotation={[0, 0, -0.16]} castShadow>
        <capsuleGeometry args={[0.055, 0.42, 6, 12]} />
        <meshStandardMaterial
          color="#172531"
          emissive={color}
          emissiveIntensity={0.14}
          transparent
          opacity={opacity}
        />
      </mesh>
      <mesh position={[0.24, 1.15, 0]} rotation={[0, 0, 0.16]} castShadow>
        <capsuleGeometry args={[0.055, 0.42, 6, 12]} />
        <meshStandardMaterial
          color="#172531"
          emissive={color}
          emissiveIntensity={0.14}
          transparent
          opacity={opacity}
        />
      </mesh>
      <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.25, 0.33, 48]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={opacity * 0.65}
          toneMapped={false}
        />
      </mesh>
      {blocked ? (
        <group position={[0, 0.32, 0]}>
          <mesh rotation={[0, 0, Math.PI / 4]}>
            <boxGeometry args={[0.9, 0.06, 0.06]} />
            <meshBasicMaterial color={color} toneMapped={false} />
          </mesh>
          <mesh rotation={[0, 0, -Math.PI / 4]}>
            <boxGeometry args={[0.9, 0.06, 0.06]} />
            <meshBasicMaterial color={color} toneMapped={false} />
          </mesh>
        </group>
      ) : null}
    </group>
  );
}

export function GroundScene({
  active,
  onSelect,
}: {
  active: GroundDestination | null;
  onSelect: (destination: GroundDestination) => void;
}) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPrefersReducedMotion(query.matches);
    update();
    if (typeof query.addEventListener === "function")
      query.addEventListener("change", update);
    else query.addListener(update);
    return () => {
      if (typeof query.removeEventListener === "function")
        query.removeEventListener("change", update);
      else query.removeListener(update);
    };
  }, []);

  return (
    <>
      <color attach="background" args={["#010712"]} />
      <fog attach="fog" args={["#061520", 12, 66]} />
      <CameraRig active={active} prefersReducedMotion={prefersReducedMotion} />
      <ambientLight intensity={0.44} color="#dbeafe" />
      <hemisphereLight args={["#cfeeff", "#020408", 1.18]} />
      <directionalLight
        position={[-8, 13, 8]}
        intensity={2.25}
        color="#e7f7ff"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <directionalLight
        position={[9, 8, -12]}
        intensity={0.72}
        color="#c4b5fd"
      />
      <pointLight
        position={[0, 7, -10]}
        intensity={9}
        color="#67e8f9"
        distance={34}
        decay={2}
      />
      <pointLight
        position={[-10, 5, -24]}
        intensity={5.5}
        color="#a78bfa"
        distance={28}
        decay={2}
      />
      <pointLight
        position={[10, 5, -24]}
        intensity={5.5}
        color="#86efac"
        distance={28}
        decay={2}
      />
      <Stars
        radius={100}
        depth={70}
        count={prefersReducedMotion ? 480 : 980}
        factor={2.2}
        saturation={0.24}
        fade
        speed={prefersReducedMotion ? 0 : 0.025}
      />
      <WorldEnvelope />
      <LayeredTerraces />
      <InitialOverlook />
      <GroundNexus prefersReducedMotion={prefersReducedMotion} />
      {DESTINATIONS.map((destination) => (
        <Corridor key={`path-${destination.id}`} destination={destination} />
      ))}
      {DESTINATIONS.map((destination, index) => (
        <DestinationArchitecture
          key={destination.id}
          destination={destination}
          variant={index}
          active={active?.id === destination.id}
          onSelect={() => onSelect(destination)}
        />
      ))}
      {DESTINATIONS.slice(0, 8).map((destination, index) => (
        <WorkforcePresence
          key={`worker-${destination.id}`}
          destination={destination}
          index={index}
          prefersReducedMotion={prefersReducedMotion}
        />
      ))}
      {!prefersReducedMotion ? (
        <EffectComposer>
          <Bloom
            intensity={0.68}
            luminanceThreshold={0.17}
            luminanceSmoothing={0.38}
          />
          <Vignette eskil={false} offset={0.14} darkness={0.38} />
        </EffectComposer>
      ) : null}
    </>
  );
}
