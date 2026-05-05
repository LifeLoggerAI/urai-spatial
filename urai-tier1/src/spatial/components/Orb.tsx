"use client";

import type { ThreeEvent } from "@react-three/fiber";

type OrbProps = {
  interactive?: boolean;
  active?: boolean;
  busy?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
  onClick?: (source: "pointer" | "keyboard" | "overlay") => void;
  onFocus?: () => void;
};

export default function Orb({
  interactive = false,
  active = true,
  busy = false,
  disabled = false,
  onClick,
  onFocus,
}: OrbProps) {
  const canInteract = interactive && active && !busy && !disabled;

  const handlePointerDown = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    onFocus?.();

    if (!canInteract) return;
    onClick?.("pointer");
  };

  const cursor = canInteract ? "pointer" : "default";
  const coreOpacity = disabled ? 0.42 : busy ? 0.68 : 0.94;
  const haloOpacity = disabled ? 0.06 : active ? 0.16 : 0.1;
  const scale = busy ? 1.04 : active ? 1 : 0.96;

  return (
    <group position={[0, 0.68, -0.22]} scale={[scale, scale, scale]}>
      <mesh
        scale={[0.92, 0.92, 0.92]}
        onPointerDown={handlePointerDown}
        onPointerOver={(event) => {
          event.stopPropagation();
          onFocus?.();
          if (typeof document !== "undefined") document.body.style.cursor = cursor;
        }}
        onPointerOut={(event) => {
          event.stopPropagation();
          if (typeof document !== "undefined") document.body.style.cursor = "";
        }}
      >
        <sphereGeometry args={[0.55, 48, 48]} />
        <meshBasicMaterial color="#dbe7f4" transparent opacity={coreOpacity} />
      </mesh>

      <mesh scale={[1.18, 1.18, 1.18]} onPointerDown={handlePointerDown}>
        <sphereGeometry args={[0.55, 48, 48]} />
        <meshBasicMaterial color="#bfcdf6" transparent opacity={haloOpacity} depthWrite={false} />
      </mesh>

      <mesh position={[0, -0.6, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[0.92, 0.92, 0.92]}>
        <circleGeometry args={[0.62, 64]} />
        <meshBasicMaterial color="#dbe7f4" transparent opacity={disabled ? 0.08 : 0.15} />
      </mesh>
    </group>
  );
}
