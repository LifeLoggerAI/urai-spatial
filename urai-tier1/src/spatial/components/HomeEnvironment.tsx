"use client";

import * as THREE from "three";

type Props = {
phase?: string;
active?: boolean;
};

export function HomeEnvironment({ active = true }: Props) {
if (!active) return null;

return ( <group>
<mesh position={[0, 0, -80]} scale={[260, 160, 1]} renderOrder={-20}>
<planeGeometry args={[1, 1, 1, 1]} /> <meshBasicMaterial
       color="#08030f"
       side={THREE.DoubleSide}
       depthWrite={false}
       depthTest={false}
       toneMapped={false}
     /> </mesh>

  <mesh position={[0, 36, -120]} scale={[110, 110, 110]} renderOrder={-10}>
    <sphereGeometry args={[1, 64, 64]} />
    <meshBasicMaterial
      color="#2b1559"
      transparent
      opacity={0.22}
      depthWrite={false}
      depthTest={false}
      blending={THREE.AdditiveBlending}
      toneMapped={false}
    />
  </mesh>

  <ambientLight intensity={0.65} />
  <directionalLight position={[8, 12, 8]} intensity={0.8} />
</group>

);
}

export default HomeEnvironment;
