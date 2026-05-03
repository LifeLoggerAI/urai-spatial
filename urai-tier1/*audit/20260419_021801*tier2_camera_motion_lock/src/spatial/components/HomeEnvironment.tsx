"use client";
/* URAI_CANON_HOME_ENV_V2 */
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { BackSide, Group, MathUtils, Mesh } from "three";
import type { CanonPhase } from "@/lib/uraiCanon/types";

export type HomeEnvironmentProps = {
visible?: boolean;
interactive?: boolean;
onSkySelect?: () => void;
onGroundSelect?: () => void;
onOrbSelect?: () => void;
phase?: CanonPhase;
dim?: number;
};

export function HomeEnvironment({
visible = true,
interactive = true,
onSkySelect,
onGroundSelect,
onOrbSelect,
phase = "HOME",
dim = 0,
}: HomeEnvironmentProps) {
const rootRef = useRef<Group>(null);
const groundRef = useRef<Mesh>(null);
const orbRef = useRef<Mesh>(null);
const ringRef = useRef<Mesh>(null);

useFrame((_, delta) => {
const travel = phase === "ASCENT" ? 1 : 0;
const show = visible || phase === "ASCENT" || phase === "HOME" ? 1 : 0;
const f = 1 - Math.exp(-delta * 3.0);

if (rootRef.current) {
  rootRef.current.visible = show > 0.001;
}
if (groundRef.current) {
  groundRef.current.position.y = MathUtils.lerp(groundRef.current.position.y, -2.8 - travel * 24, f);
  groundRef.current.position.z = MathUtils.lerp(groundRef.current.position.z, -4 - travel * 36, f);
  groundRef.current.scale.x = MathUtils.lerp(groundRef.current.scale.x, 34 + travel * 22, f);
  groundRef.current.scale.y = MathUtils.lerp(groundRef.current.scale.y, 34 + travel * 22, f);
  groundRef.current.scale.z = 1;
}
if (orbRef.current) {
  orbRef.current.position.y = MathUtils.lerp(orbRef.current.position.y, 0.85 - travel * 3.6, f);
  orbRef.current.position.z = MathUtils.lerp(orbRef.current.position.z, -1.25 - travel * 13.0, f);
  const s = 1.6 - travel * 0.55;
  orbRef.current.scale.setScalar(MathUtils.lerp(orbRef.current.scale.x, s, f));
}
if (ringRef.current) {
  if (orbRef.current) {
    ringRef.current.position.copy(orbRef.current.position);
  }
  ringRef.current.rotation.z += delta * 0.18;
  const rs = 3.4 - travel * 0.95;
  ringRef.current.scale.setScalar(MathUtils.lerp(ringRef.current.scale.x, rs, f));
}

});

return (
<group ref={rootRef} visible={visible || phase === "ASCENT" || phase === "HOME"}> <hemisphereLight intensity={0.75} color="#8cb1ff" groundColor="#020611" />
<directionalLight position={[4, 7, 6]} intensity={1.25} color="#c6d9ff" />
<pointLight position={[0, 1.0, -0.8]} intensity={12} distance={30} color="#c8dcff" />

  <mesh position={[0, 0, -40]} onClick={interactive ? onSkySelect : undefined}>
    <sphereGeometry args={[120, 48, 48]} />
    <meshBasicMaterial color="#02102e" side={BackSide} />
  </mesh>

  <mesh ref={groundRef} rotation={[-Math.PI / 2, 0, 0]} onClick={interactive ? onGroundSelect : undefined}>
    <circleGeometry args={[1, 128]} />
    <meshStandardMaterial color="#04144f" emissive="#031039" emissiveIntensity={0.55 - dim * 0.25} />
  </mesh>

  <mesh position={[0, -2.62, -6]} rotation={[-Math.PI / 2, 0, 0]}>
    <ringGeometry args={[3.5, 8.4, 64]} />
    <meshBasicMaterial color="#0b1b5f" transparent opacity={0.38} />
  </mesh>

  <mesh ref={orbRef} onClick={interactive ? onOrbSelect : undefined}>
    <sphereGeometry args={[1, 48, 48]} />
    <meshStandardMaterial color="#d9e7ff" emissive="#9fb9ff" emissiveIntensity={1.9 - dim * 0.45} />
  </mesh>

  <mesh ref={ringRef} rotation={[Math.PI / 2.4, 0.12, 0]}>
    <torusGeometry args={[1.35, 0.02, 18, 200]} />
    <meshBasicMaterial color="#c8d7ff" transparent opacity={0.45} />
  </mesh>

  <mesh position={[0, 0.85, -1.25]}>
    <sphereGeometry args={[1.75, 48, 48]} />
    <meshBasicMaterial color="#86a5ff" transparent opacity={0.12} />
  </mesh>
</group>

);
}

export default HomeEnvironment;
