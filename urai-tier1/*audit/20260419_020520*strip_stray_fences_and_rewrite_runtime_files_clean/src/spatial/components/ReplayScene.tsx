"use client";
/* URAI_CANON_REPLAY_V3 */
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { BackSide, Group, MathUtils } from "three";

export type ReplaySceneProps = {
visible?: boolean;
opacity?: number;
starId?: string | null;
position?: [number, number, number] | null;
onExit?: () => void;
};

export function ReplayScene({
visible = false,
opacity = 1,
starId = null,
position = null,
onExit,
}: ReplaySceneProps) {
const rootRef = useRef<Group>(null);
const target = useMemo<[number, number, number]>(() => position ?? [0, 0, -48], [position]);

useFrame((_, delta) => {
if (!rootRef.current) return;
const factor = 1 - Math.exp(-delta * 3.2);
rootRef.current.visible = visible && !!starId;
rootRef.current.position.x = MathUtils.lerp(rootRef.current.position.x, target[0], factor);
rootRef.current.position.y = MathUtils.lerp(rootRef.current.position.y, target[1], factor);
rootRef.current.position.z = MathUtils.lerp(rootRef.current.position.z, target[2], factor);
rootRef.current.rotation.y += delta * 0.05;
});

return (
<group ref={rootRef} visible={visible && !!starId}>
<mesh scale={[1, 1, 1]} onClick={visible ? onExit : undefined}>
<sphereGeometry args={[14, 48, 48]} />
<meshBasicMaterial color="#020611" transparent opacity={0.55 * opacity} side={BackSide} /> </mesh>

```
  <mesh position={[0, -3.6, -1.6]} rotation={[-Math.PI / 2, 0, 0]}>
    <circleGeometry args={[10, 96]} />
    <meshBasicMaterial color="#05123f" transparent opacity={0.38 * opacity} />
  </mesh>

  <mesh position={[0, 0, -0.6]}>
    <sphereGeometry args={[1.6, 36, 36]} />
    <meshStandardMaterial color="#edf3ff" emissive="#b8cbff" emissiveIntensity={2.0 * opacity} />
  </mesh>

  <mesh rotation={[Math.PI / 2.2, 0, 0]}>
    <torusGeometry args={[3.2, 0.05, 20, 180]} />
    <meshBasicMaterial color="#c8d8ff" transparent opacity={0.42 * opacity} />
  </mesh>

  <mesh rotation={[0.18, 0.46, 0]}>
    <torusGeometry args={[5.4, 0.03, 20, 180]} />
    <meshBasicMaterial color="#7f9fff" transparent opacity={0.18 * opacity} />
  </mesh>

  <mesh scale={[7.2, 7.2, 7.2]}>
    <sphereGeometry args={[1, 32, 32]} />
    <meshBasicMaterial color="#88a4ff" transparent opacity={0.06 * opacity} />
  </mesh>
</group>
```

);
}

export default ReplayScene;
