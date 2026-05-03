"use client";

import * as THREE from "three";

export function FocusVisualEngine({ visible }: { visible: boolean }) {
  if (!visible) return null;

  return (
    <group name="URAI_FOCUS_ARRIVAL_COMPOSITION_LOCK">
      {/* rear spatial halo: gives arrival context without becoming another orb */}
      <mesh position={[0, 0.04, -5.25]} rotation={[0, 0, 0]}>
        <ringGeometry args={[1.72, 1.78, 160]} />
        <meshBasicMaterial
          color={new THREE.Color("#9fd7ff")}
          transparent
          opacity={0.18}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* outer atmospheric shell: reads as place, not zoom */}
      <mesh position={[0, 0.03, -5.36]}>
        <sphereGeometry args={[2.65, 96, 96]} />
        <meshBasicMaterial
          color={new THREE.Color("#31476a")}
          transparent
          opacity={0.055}
          depthWrite={false}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* lower grounding arc */}
      <mesh position={[0, -1.08, -5.05]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.95, 2.04, 160]} />
        <meshBasicMaterial
          color={new THREE.Color("#8bc6ff")}
          transparent
          opacity={0.105}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* side depth anchors */}
      <mesh position={[-1.95, 0.18, -5.7]}>
        <sphereGeometry args={[0.035, 24, 24]} />
        <meshBasicMaterial color={new THREE.Color("#dff4ff")} transparent opacity={0.55} depthWrite={false} />
      </mesh>
      <mesh position={[1.9, -0.12, -5.85]}>
        <sphereGeometry args={[0.026, 24, 24]} />
        <meshBasicMaterial color={new THREE.Color("#dff4ff")} transparent opacity={0.42} depthWrite={false} />
      </mesh>
      <mesh position={[0.72, 1.12, -6.1]}>
        <sphereGeometry args={[0.022, 24, 24]} />
        <meshBasicMaterial color={new THREE.Color("#dff4ff")} transparent opacity={0.35} depthWrite={false} />
      </mesh>
    </group>
  );
}
