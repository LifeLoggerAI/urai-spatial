"use client";

import * as THREE from "three";

type Props = {
phase?: string;
active?: boolean;
position?: [number, number, number] | null;
};

export function ReplayAtmosphere({
phase = "HIDDEN",
active = true,
position = null,
}: Props) {
if (!active || phase !== "REPLAY") return null;

const p = position ?? [0, 18, -220];

return ( <group position={p}> <mesh>
<sphereGeometry args={[18, 48, 48]} /> <meshBasicMaterial
       color="#7c3aed"
       transparent
       opacity={0.07}
       side={THREE.BackSide}
       depthWrite={false}
       toneMapped={false}
     /> </mesh>

  <mesh position={[0.22, 0.08, -0.18]}>
    <sphereGeometry args={[10, 36, 36]} />
    <meshBasicMaterial
      color="#67e8f9"
      transparent
      opacity={0.05}
      depthWrite={false}
      blending={THREE.AdditiveBlending}
      toneMapped={false}
    />
  </mesh>
</group>

);
}

export default ReplayAtmosphere;
