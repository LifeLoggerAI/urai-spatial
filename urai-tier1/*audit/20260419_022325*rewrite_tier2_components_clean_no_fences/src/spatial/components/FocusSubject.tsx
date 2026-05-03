"use client";
/* URAI_TIER2_FOCUS_ARRIVAL_LOCK_V1 */
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { Group, MathUtils } from "three";

export type FocusSubjectProps = {
visible?: boolean;
interactive?: boolean;
starId?: string | null;
position?: [number, number, number] | null;
opacity?: number;
onEnterReplay?: () => void;
};

export function FocusSubject({
visible = false,
interactive = true,
starId = null,
position = null,
opacity = 1,
onEnterReplay,
}: FocusSubjectProps) {
const rootRef = useRef<Group>(null);
const target = useMemo<[number, number, number]>(() => position ?? [0, 0, -48], [position]);

useFrame((_, delta) => {
if (!rootRef.current) return;
const f = 1 - Math.exp(-delta * 5.8);
rootRef.current.visible = visible && !!starId;
rootRef.current.position.x = MathUtils.lerp(rootRef.current.position.x, target[0], f);
rootRef.current.position.y = MathUtils.lerp(rootRef.current.position.y, target[1], f);
rootRef.current.position.z = MathUtils.lerp(rootRef.current.position.z, target[2], f);
rootRef.current.rotation.y += delta * 0.085;
rootRef.current.scale.setScalar(MathUtils.lerp(rootRef.current.scale.x, visible ? 1 : 0.82, f));
});

return (
<group ref={rootRef} visible={visible && !!starId}>
<mesh onClick={interactive ? onEnterReplay : undefined}>
<sphereGeometry args={[0.82, 32, 32]} />
<meshStandardMaterial color="#edf3ff" emissive="#b5c9ff" emissiveIntensity={1.75 * opacity} /> </mesh>

```
  <mesh rotation={[Math.PI / 2.22, 0, 0]}>
    <torusGeometry args={[1.72, 0.035, 16, 160]} />
    <meshBasicMaterial color="#cad8ff" transparent opacity={0.42 * opacity} />
  </mesh>

  <mesh rotation={[0.22, Math.PI / 2, 0]}>
    <torusGeometry args={[2.28, 0.02, 16, 160]} />
    <meshBasicMaterial color="#8aa7ff" transparent opacity={0.22 * opacity} />
  </mesh>

  <mesh scale={[3.4, 3.4, 3.4]}>
    <sphereGeometry args={[0.74, 24, 24]} />
    <meshBasicMaterial color="#9cb6ff" transparent opacity={0.08 * opacity} />
  </mesh>
</group>
```

);
}

export default FocusSubject;
