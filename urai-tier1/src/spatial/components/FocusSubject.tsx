"use client";

import * as THREE from "three";

type Props = {
phase?: string;
active?: boolean;
selectedStar?: { id?: string; title?: string; tone?: string; position?: [number, number, number] } | null;
star?: { id?: string; title?: string; tone?: string; position?: [number, number, number] } | null;
selectedStarPosition?: [number, number, number] | null;
position?: [number, number, number] | null;
[key: string]: unknown;
};

const COLORS: Record<string, string> = {
neutral: "#ffffff",
calm: "#93c5fd",
charged: "#fb7185",
grief: "#b79bff",
hope: "#fde68a",
tension: "#fb923c",
awe: "#67e8f9",
recovery: "#86efac",
};

export function FocusSubject(props: Props) {
const phase = String(props.phase ?? "HIDDEN");
const visible = props.active !== false && (phase === "FOCUS" || phase === "REPLAY");
if (!visible) return null;

const selected = props.selectedStar ?? props.star ?? null;
const p = props.selectedStarPosition ?? props.position ?? selected?.position ?? [0, 18, -220];
const color = COLORS[String(selected?.tone ?? "awe")] ?? "#67e8f9";

const enterReplay = (e: any) => {
e.stopPropagation();
console.info("[URAI_REPLAY_CLICK]", selected?.id ?? "selected-memory");
if (typeof window !== "undefined") {
window.dispatchEvent(new CustomEvent("urai:focus-enter-replay"));
}
};

return (
<group position={p} onPointerDown={phase === "FOCUS" ? enterReplay : undefined} onClick={phase === "FOCUS" ? enterReplay : undefined}> <mesh renderOrder={80}>
<sphereGeometry args={[5.4, 72, 72]} /> <meshBasicMaterial color={color} depthTest={false} toneMapped={false} /> </mesh>

```
  <mesh scale={[2.0, 2.0, 2.0]} renderOrder={79}>
    <sphereGeometry args={[5.4, 72, 72]} />
    <meshBasicMaterial color={color} transparent opacity={0.28} depthWrite={false} depthTest={false} blending={THREE.AdditiveBlending} toneMapped={false} />
  </mesh>

  {phase === "FOCUS" && (
    <mesh position={[0, -10, 0]} scale={[1.35, 1.35, 1.35]} renderOrder={85}>
      <sphereGeometry args={[1.4, 32, 32]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={0.92} depthWrite={false} depthTest={false} toneMapped={false} />
    </mesh>
  )}
</group>
```

);
}

export default FocusSubject;
