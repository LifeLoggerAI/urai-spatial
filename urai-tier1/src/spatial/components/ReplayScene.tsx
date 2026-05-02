"use client";

import * as THREE from "three";
import { useMemo } from "react";

type Props = {
phase?: string;
active?: boolean;
selectedStar?: { id?: string; title?: string; tone?: string; position?: [number, number, number] } | null;
selectedStarPosition?: [number, number, number] | null;
position?: [number, number, number] | null;
[key: string]: unknown;
};

function makeParticles(seedStart: number, count: number) {
const out: Array<{ id: string; position: [number, number, number]; size: number; opacity: number }> = [];
let seed = seedStart;

const rand = () => {
seed = (seed * 1664525 + 1013904223) >>> 0;
return seed / 4294967296;
};

for (let i = 0; i < count; i++) {
out.push({
id: "replay-p-" + i,
position: [-24 + rand() * 48, -10 + rand() * 30, -32 + rand() * 58],
size: 0.04 + rand() * 0.16,
opacity: 0.18 + rand() * 0.48,
});
}

return out;
}

export function ReplayScene(props: Props) {
const phase = String(props.phase ?? "HIDDEN");
const active = props.active !== false && phase === "REPLAY";
const particles = useMemo(() => makeParticles(404, 260), []);

if (!active) return null;

const p = props.selectedStarPosition ?? props.position ?? props.selectedStar?.position ?? [0, 18, -220];

return ( <group position={p}>
<fog attach="fog" args={["#09051f", 10, 130]} />

```
  <mesh scale={[26, 18, 26]} renderOrder={20}>
    <sphereGeometry args={[1, 96, 48]} />
    <meshBasicMaterial color="#11082f" transparent opacity={0.22} side={THREE.BackSide} depthWrite={false} />
  </mesh>

  <mesh scale={[10, 7, 10]} renderOrder={30}>
    <sphereGeometry args={[1, 64, 32]} />
    <meshBasicMaterial color="#7c3aed" transparent opacity={0.18} side={THREE.BackSide} depthWrite={false} blending={THREE.AdditiveBlending} />
  </mesh>

  <mesh renderOrder={60}>
    <sphereGeometry args={[3.2, 64, 64]} />
    <meshBasicMaterial color="#c4b5fd" transparent opacity={1} depthTest={false} toneMapped={false} />
  </mesh>

  {particles.map((particle) => (
    <mesh key={particle.id} position={particle.position} scale={particle.size}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={particle.opacity} depthWrite={false} toneMapped={false} />
    </mesh>
  ))}
</group>
```

);
}

export default ReplayScene;
