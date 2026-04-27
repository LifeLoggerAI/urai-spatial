"use client";

import * as React from "react";
import * as THREE from "three";
import { useLoader } from "@react-three/fiber";

export default function AssetFactoryBackdrop({ mode }: { mode: string }) {
  const pick = (m: string) => {
    m = (m || "HOME").toUpperCase();
    if (m.includes("REPLAY")) return "/urai/replay/replay.svg";
    if (m.includes("FOCUS")) return "/urai/focus/focus.svg";
    if (m.includes("LIFEMAP")) return "/urai/lifemap/lifemap.svg";
    if (m.includes("ASCENT")) return "/urai/sky/sky.svg";
    return "/urai/home/home.svg";
  };

  const tex = useLoader(THREE.TextureLoader, pick(mode));

  React.useMemo(() => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
  }, [tex]);

  const m = String(mode ?? "HOME").toUpperCase();
  const replay = m.includes("REPLAY");
  const focus = m.includes("FOCUS");
  const lifemap = m.includes("LIFEMAP");
  const ascent = m.includes("ASCENT");

  const farZ = replay ? -42 : focus ? -38 : lifemap ? -44 : ascent ? -48 : -42;
  const midZ = replay ? -28 : focus ? -25 : lifemap ? -30 : ascent ? -34 : -28;

  const farOpacity = replay ? 0.32 : focus ? 0.30 : lifemap ? 0.28 : ascent ? 0.24 : 0.28;
  const mistOpacity = replay ? 0.035 : focus ? 0.030 : lifemap ? 0.026 : 0.022;
  const floorOpacity = replay ? 0.032 : focus ? 0.028 : lifemap ? 0.024 : 0.020;
  const sideOpacity = replay ? 0.026 : focus ? 0.022 : 0.018;

  return (
    <group renderOrder={-10}>
      {/* far atmosphere: intentionally oversized, offset, and non-square to avoid card read */}
      <mesh position={[-3.6, 1.2, farZ]} rotation={[0.02, -0.04, -0.018]}>
        <planeGeometry args={[170, 96]} />
        <meshBasicMaterial
          map={tex}
          transparent
          opacity={farOpacity}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* second far layer, offset opposite direction for irregular falloff */}
      <mesh position={[5.8, -0.8, farZ + 5]} rotation={[-0.018, 0.055, 0.021]}>
        <planeGeometry args={[150, 82]} />
        <meshBasicMaterial
          map={tex}
          transparent
          opacity={farOpacity * 0.16}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* left atmospheric mass */}
      <mesh position={[-28, 3.2, midZ - 2]} rotation={[0.04, 0.38, -0.06]}>
        <planeGeometry args={[60, 70]} />
        <meshBasicMaterial
          color={replay ? "#07101a" : "#0a1322"}
          transparent
          opacity={sideOpacity}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* right atmospheric mass */}
      <mesh position={[31, -1.5, midZ - 4]} rotation={[-0.03, -0.34, 0.04]}>
        <planeGeometry args={[54, 64]} />
        <meshBasicMaterial
          color={replay ? "#08111d" : "#0a1424"}
          transparent
          opacity={sideOpacity * 0.82}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* top irregular cap */}
      <mesh position={[-4, 17, midZ - 5]} rotation={[0.55, -0.05, 0.035]}>
        <planeGeometry args={[145, 52]} />
        <meshBasicMaterial
          color={replay ? "#060a12" : "#09111f"}
          transparent
          opacity={mistOpacity}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* low floor haze, wide and off-axis */}
      <mesh position={[3.5, -12.5, midZ - 3]} rotation={[-Math.PI / 2.42, 0.06, -0.025]}>
        <planeGeometry args={[150, 52]} />
        <meshBasicMaterial
          color={replay ? "#060a12" : "#09111f"}
          transparent
          opacity={floorOpacity}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* faint non-centered mist wash */}
      <mesh position={[-9, 0.6, midZ - 8]} rotation={[0.01, 0.08, -0.04]}>
        <planeGeometry args={[132, 74]} />
        <meshBasicMaterial
          color={replay ? "#0a1424" : "#0b1628"}
          transparent
          opacity={mistOpacity * 0.72}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
