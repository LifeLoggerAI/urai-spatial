"use client";

import * as THREE from "three";

type StarLike = {
  id?: string;
  title?: string;
  tone?: string;
  position?: [number, number, number];
};

type Props = {
  phase?: string;
  active?: boolean;
  selectedStar?: StarLike | null;
  star?: StarLike | null;
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

export function ReplayScene(props: Props) {
  const phase = String(props.phase ?? "HIDDEN");
  const visible = props.active !== false && phase === "REPLAY";

  if (!visible) return null;

  const selected = props.selectedStar ?? props.star ?? null;
  const p = props.selectedStarPosition ?? props.position ?? selected?.position ?? [0, 18, -220];
  const color = COLORS[String(selected?.tone ?? "awe")] ?? "#67e8f9";

  return (
    <group position={p}>
      <fog attach="fog" args={["#09051f", 10, 130]} />

      <mesh renderOrder={120}>
        <sphereGeometry args={[7.4, 72, 72]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.42}
          depthWrite={false}
          depthTest={false}
          toneMapped={false}
        />
      </mesh>

      <mesh scale={[1.75, 1.75, 1.75]} renderOrder={119}>
        <sphereGeometry args={[7.4, 72, 72]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.18}
          depthWrite={false}
          depthTest={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>

      <mesh position={[0, -11, 0]} scale={[1.3, 1.3, 1.3]} renderOrder={125}>
        <sphereGeometry args={[1.4, 32, 32]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.9}
          depthWrite={false}
          depthTest={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

export default ReplayScene;
