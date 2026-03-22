"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useSceneStore } from "../state/sceneStore";

type MeshRef = THREE.Mesh | null;

function setCursor(cursor: string) {
  if (typeof document !== "undefined") document.body.style.cursor = cursor;
}

function goLifeMap() {
  const api: any = useSceneStore as any;
  const s: any = api?.getState ? api.getState() : {};
  if (typeof s.setMode === "function") s.setMode("lifemap");
  if (typeof s.setSceneMode === "function") s.setSceneMode("lifemap");
  if (typeof s.enterLifeMap === "function") s.enterLifeMap();
  if (typeof api?.setState === "function") {
    api.setState({
      mode: "lifemap",
      sceneMode: "lifemap",
      selectedStar: null,
      selectedStarId: null,
      homeIntent: "orb",
      transitionSource: "home-orb",
    } as any);
  }
}

export default function HomeWorld() {
  const orbRef = useRef<MeshRef>(null);
  const shellRef = useRef<MeshRef>(null);
  const haloRef = useRef<MeshRef>(null);
  const floorGlowRef = useRef<MeshRef>(null);
  const ringRef = useRef<MeshRef>(null);

  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  useEffect(() => {
    setCursor(hovered ? "pointer" : "default");
    return () => setCursor("default");
  }, [hovered]);

  const pillars = useMemo(
    () => [
      { x: -4.8, h: 4.8, z: -2.6, w: 0.9 },
      { x: -2.4, h: 6.6, z: -3.4, w: 1.0 },
      { x:  2.8, h: 4.0, z: -2.1, w: 0.8 },
      { x:  5.2, h: 5.6, z: -3.0, w: 1.0 },
    ],
    []
  );

  useFrame(({ clock, camera }) => {
    const t = clock.getElapsedTime();
    const pulse = 1 + Math.sin(t * 1.55) * 0.028 + (hovered ? 0.03 : 0) + (pressed ? 0.02 : 0);
    const haloPulse = 1 + Math.sin(t * 1.15) * 0.08 + (hovered ? 0.08 : 0);
    const ringPulse = 1 + Math.sin(t * 1.55) * 0.035 + (hovered ? 0.04 : 0);

    if (orbRef.current) {
      orbRef.current.scale.setScalar(pulse);
      const mat = orbRef.current.material as THREE.MeshStandardMaterial;
      if (mat) {
        mat.emissive = new THREE.Color("#a8d7ff");
        mat.emissiveIntensity = hovered ? 1.35 : 0.95;
      }
    }

    if (shellRef.current) {
      shellRef.current.scale.setScalar(haloPulse);
      const mat = shellRef.current.material as THREE.MeshBasicMaterial;
      if (mat) mat.opacity = hovered ? 0.16 : 0.10;
    }

    if (haloRef.current) {
      haloRef.current.scale.setScalar(haloPulse * 1.18);
      const mat = haloRef.current.material as THREE.MeshBasicMaterial;
      if (mat) mat.opacity = hovered ? 0.09 : 0.05;
    }

    if (floorGlowRef.current) {
      floorGlowRef.current.scale.set(1.65 * ringPulse, 1.0, 1.15 * ringPulse);
      const mat = floorGlowRef.current.material as THREE.MeshBasicMaterial;
      if (mat) mat.opacity = hovered ? 0.28 : 0.19;
    }

    if (ringRef.current) {
      ringRef.current.rotation.z = t * 0.18;
      const mat = ringRef.current.material as THREE.MeshBasicMaterial;
      if (mat) mat.opacity = hovered ? 0.34 : 0.22;
    }

    camera.position.x += (0 - camera.position.x) * 0.025;
    camera.position.y += (0.95 - camera.position.y) * 0.025;
    camera.position.z += (8.2 - camera.position.z) * 0.025;
    camera.lookAt(0, 0.45, 0);
  });

  return (
    <group position={[0, -0.3, 0]}>
      <fog attach="fog" args={["#02031d", 8, 18]} />

      <ambientLight intensity={0.65} />
      <directionalLight position={[0, 3.5, 4]} intensity={1.6} color={"#dbefff"} />
      <pointLight position={[0, 0.9, 1.1]} intensity={2.25} distance={12} color={"#8fc5ff"} />
      <pointLight position={[0, 1.6, -2.5]} intensity={0.75} distance={18} color={"#2d49ff"} />

      <mesh position={[0, 0.7, -7.6]}>
        <planeGeometry args={[26, 11]} />
        <meshBasicMaterial color={"#070b58"} />
      </mesh>

      <mesh position={[0, 0.2, -7.5]}>
        <planeGeometry args={[26, 3.2]} />
        <meshBasicMaterial color={"#0c18ff"} />
      </mesh>

      <mesh position={[0, -0.95, -7.4]}>
        <planeGeometry args={[26, 6.2]} />
        <meshBasicMaterial color={"#03062d"} />
      </mesh>

      {pillars.map((p, i) => (
        <mesh key={i} position={[p.x, p.h * 0.5 - 1.0, p.z]}>
          <boxGeometry args={[p.w, p.h, 0.22]} />
          <meshStandardMaterial color={"#04061c"} roughness={1} metalness={0} />
        </mesh>
      ))}

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.05, 0]}>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color={"#020425"} roughness={1} metalness={0} />
      </mesh>

      <mesh ref={floorGlowRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.985, 0]}>
        <ringGeometry args={[1.15, 2.35, 96]} />
        <meshBasicMaterial color={"#214cff"} transparent opacity={0.19} />
      </mesh>

      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.97, 0]}>
        <ringGeometry args={[1.55, 1.7, 96]} />
        <meshBasicMaterial color={"#96c7ff"} transparent opacity={0.22} />
      </mesh>

      <group position={[0, 0.35, 0]}>
        <mesh
          ref={haloRef}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => {
            setHovered(false);
            setPressed(false);
          }}
          onPointerDown={() => setPressed(true)}
          onPointerUp={() => setPressed(false)}
          onClick={() => goLifeMap()}
        >
          <sphereGeometry args={[2.55, 64, 64]} />
          <meshBasicMaterial color={"#4c7bff"} transparent opacity={0.05} depthWrite={false} />
        </mesh>

        <mesh ref={shellRef}>
          <sphereGeometry args={[1.66, 64, 64]} />
          <meshBasicMaterial color={"#6ea5ff"} transparent opacity={0.10} depthWrite={false} />
        </mesh>

        <mesh
          ref={orbRef}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => {
            setHovered(false);
            setPressed(false);
          }}
          onPointerDown={() => setPressed(true)}
          onPointerUp={() => setPressed(false)}
          onClick={() => goLifeMap()}
        >
          <sphereGeometry args={[1.12, 64, 64]} />
          <meshStandardMaterial
            color={"#cfe6ff"}
            emissive={"#9fd3ff"}
            emissiveIntensity={1.0}
            roughness={0.16}
            metalness={0.05}
          />
        </mesh>

        <mesh position={[0.22, 0.18, 0.96]}>
          <sphereGeometry args={[0.09, 24, 24]} />
          <meshBasicMaterial color={"#ffffff"} transparent opacity={0.9} />
        </mesh>

        <mesh position={[-0.1, 0.34, 0.96]}>
          <sphereGeometry args={[0.06, 24, 24]} />
          <meshBasicMaterial color={"#ffffff"} transparent opacity={0.85} />
        </mesh>

        <mesh position={[0.5, 0.55, 0.86]} rotation={[0.25, 0.45, -0.2]}>
          <torusGeometry args={[0.36, 0.03, 16, 100, Math.PI * 0.9]} />
          <meshBasicMaterial color={"#ffffff"} transparent opacity={0.35} />
        </mesh>
      </group>
    </group>
  );
}
