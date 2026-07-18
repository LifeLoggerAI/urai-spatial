"use client";

import { Html, PerspectiveCamera, Stars } from "@react-three/drei";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { DESTINATIONS, STATE_LABEL, type GroundDestination } from "./GroundWorldModel";

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
        (size.width < 700 ? [0, 5.45, 10.8] : [0, 5.05, 10.4])),
    );
    look.set(...(active?.lookAt ?? [0, 1.75, -13.8]));
    const damping = prefersReducedMotion ? 100 : 3.8;
    cameraRef.current.position.x = THREE.MathUtils.damp(cameraRef.current.position.x, target.x, damping, delta);
    cameraRef.current.position.y = THREE.MathUtils.damp(cameraRef.current.position.y, target.y, damping, delta);
    cameraRef.current.position.z = THREE.MathUtils.damp(cameraRef.current.position.z, target.z, damping, delta);
    cameraRef.current.lookAt(look);
  });

  return (
    <PerspectiveCamera
      ref={cameraRef}
      makeDefault
      position={[0, 5.05, 10.4]}
      fov={size.width < 700 ? 59 : 47}
      near={0.08}
      far={150}
    />
  );
}

function GroundNexus({ prefersReducedMotion }: { prefersReducedMotion: boolean }) {
  const pulse = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!pulse.current || prefersReducedMotion) return;
    pulse.current.rotation.y = clock.elapsedTime * 0.025;
    pulse.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 0.4) * 0.018);
  });

  return (
    <group
      ref={pulse}
      position={[0, 0.08, -10.5]}
      name="ground-central-nexus"
      data-testid="urai-ground-central-nexus"
    >
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.35, 2.42, 96]} />
        <meshBasicMaterial color="#8beef6" transparent opacity={0.24} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3.55, 3.59, 96]} />
        <meshBasicMaterial color="#c4b5fd" transparent opacity={0.11} depthWrite={false} toneMapped={false} />
      </mesh>
      <pointLight position={[0, 1.1, 0]} color="#67e8f9" intensity={2.8} distance={10} decay={2} />
    </group>
  );
}

function DestinationBeacon({
  destination,
  active,
  onSelect,
  prefersReducedMotion,
}: {
  destination: GroundDestination;
  active: boolean;
  onSelect: () => void;
  prefersReducedMotion: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const color = useMemo(() => new THREE.Color(destination.color), [destination.color]);

  useFrame(({ clock }) => {
    if (!group.current || prefersReducedMotion) return;
    const wave = 1 + Math.sin(clock.elapsedTime * 0.42 + destination.position[0]) * 0.025;
    group.current.scale.setScalar(active ? wave * 1.08 : wave);
  });

  const activate = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    onSelect();
  };

  const truthOpacity = destination.workforceState === "blocked"
    ? 0.16
    : destination.workforceState === "awaiting-owner-approval"
      ? 0.24
      : destination.availability === "offline"
        ? 0.1
        : 0.3;

  return (
    <group
      ref={group}
      position={destination.position}
      name={`ground-authored-beacon-${destination.id}`}
      userData={{
        groundDestination: destination.id,
        serviceAvailability: destination.availability,
        workforceState: destination.workforceState,
        groundLayer: destination.layer,
      }}
    >
      <mesh onClick={activate} onPointerEnter={() => { document.body.style.cursor = "pointer"; }} onPointerLeave={() => { document.body.style.cursor = ""; }}>
        <sphereGeometry args={[1.65, 16, 16]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.44, active ? 0.58 : 0.5, 64]} />
        <meshBasicMaterial color={color} transparent opacity={active ? 0.68 : truthOpacity} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh position={[0, 1.15, 0]}>
        <cylinderGeometry args={[0.018, 0.04, 2.3, 12]} />
        <meshBasicMaterial color={color} transparent opacity={active ? 0.62 : truthOpacity * 0.72} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh position={[0, 2.35, 0]}>
        <sphereGeometry args={[active ? 0.12 : 0.075, 20, 20]} />
        <meshBasicMaterial color={color} transparent opacity={active ? 0.9 : 0.48} depthWrite={false} toneMapped={false} />
      </mesh>
      <pointLight position={[0, 2.1, 0]} color={color} intensity={active ? 5.5 : 1.1} distance={active ? 8 : 4.5} decay={2} />
      {active ? (
        <Html position={[0, 3.25, 0]} center distanceFactor={11}>
          <div className="ground-active-label">
            <strong>{destination.label}</strong>
            <span>{destination.signature} · {destination.detail}</span>
            <em>{STATE_LABEL[destination.workforceState]} · {destination.availability}</em>
            <small>{destination.emotionalSentence}</small>
          </div>
        </Html>
      ) : null}
    </group>
  );
}

function WorkforceSignals({ prefersReducedMotion }: { prefersReducedMotion: boolean }) {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!group.current || prefersReducedMotion) return;
    group.current.rotation.y = Math.sin(clock.elapsedTime * 0.03) * 0.025;
  });
  return (
    <group ref={group} name="ground-workforce-presence-signals">
      {DESTINATIONS.slice(0, 8).map((destination, index) => (
        <mesh
          key={`workforce-${destination.id}`}
          position={[
            destination.position[0] * 0.82 + (index % 2 ? 0.42 : -0.42),
            destination.position[1] + 1.35,
            destination.position[2] + 1.25,
          ]}
        >
          <sphereGeometry args={[0.045, 12, 12]} />
          <meshBasicMaterial color={destination.color} transparent opacity={destination.workforceState === "blocked" ? 0.12 : 0.32} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
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
    if (typeof query.addEventListener === "function") query.addEventListener("change", update);
    else query.addListener(update);
    return () => {
      if (typeof query.removeEventListener === "function") query.removeEventListener("change", update);
      else query.removeListener(update);
      document.body.style.cursor = "";
    };
  }, []);

  return (
    <>
      <CameraRig active={active} prefersReducedMotion={prefersReducedMotion} />
      <ambientLight intensity={0.24} color="#dbeafe" />
      <Stars
        radius={90}
        depth={56}
        count={prefersReducedMotion ? 160 : 340}
        factor={1.6}
        saturation={0.16}
        fade
        speed={prefersReducedMotion ? 0 : 0.018}
      />
      <GroundNexus prefersReducedMotion={prefersReducedMotion} />
      {DESTINATIONS.map((destination) => (
        <DestinationBeacon
          key={destination.id}
          destination={destination}
          active={active?.id === destination.id}
          onSelect={() => onSelect(destination)}
          prefersReducedMotion={prefersReducedMotion}
        />
      ))}
      <WorkforceSignals prefersReducedMotion={prefersReducedMotion} />
    </>
  );
}
