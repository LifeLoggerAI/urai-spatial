"use client";

import * as THREE from "three";

type Props = {
phase?: string;
active?: boolean;
};

const SHELLS = [
{ scale: 2.2, opacity: 0.06, color: "#7c3aed" },
{ scale: 3.1, opacity: 0.04, color: "#67e8f9" },
{ scale: 4.2, opacity: 0.025, color: "#ffffff" },
];

export function ReplayImmersion({ phase = "HIDDEN", active = true }: Props) {
if (!active || phase !== "REPLAY") return null;

return ( <group>
<mesh position={[0, 0, -1.2]}>
<sphereGeometry args={[1.8, 28, 28]} /> <meshBasicMaterial
       color="#ffffff"
       transparent
       opacity={0.058}
       depthWrite={false}
       toneMapped={false}
     /> </mesh>

  {SHELLS.map((shell, index) => (
    <mesh key={index} scale={shell.scale}>
      <sphereGeometry args={[1.8, 28, 28]} />
      <meshBasicMaterial
        color={shell.color}
        transparent
        opacity={shell.opacity}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  ))}
</group>

);
}

export default ReplayImmersion;
