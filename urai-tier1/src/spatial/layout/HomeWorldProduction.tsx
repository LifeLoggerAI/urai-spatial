"use client";

import Link from "next/link";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float, Sparkles, Stars } from "@react-three/drei";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import styles from "./HomeWorldProduction.module.css";

const routes = [
  ["Ground", "/ground"],
  ["Life Map", "/life-map"],
  ["Mirror", "/mirror"],
  ["Passport", "/passport"],
] as const;

function CameraBreath() {
  const { camera, pointer } = useThree();
  const target = useMemo(() => new THREE.Vector3(0, 1.4, -7.5), []);
  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    const x = pointer.x * 0.7 + Math.sin(t * 0.08) * 0.18;
    const y = 3.4 + pointer.y * 0.26 + Math.sin(t * 0.11) * 0.08;
    camera.position.x = THREE.MathUtils.damp(camera.position.x, x, 2.2, delta);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, y, 2.2, delta);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, 11.5, 2.2, delta);
    camera.lookAt(target);
  });
  return null;
}

function LivingGround() {
  const ground = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ground.current) return;
    ground.current.rotation.y = Math.sin(clock.elapsedTime * 0.035) * 0.025;
  });

  const stones = useMemo(() => Array.from({ length: 34 }, (_, index) => {
    const angle = (index / 34) * Math.PI * 2;
    const radius = 4.8 + (index % 5) * 0.7;
    return {
      position: [Math.cos(angle) * radius, -0.72 + (index % 3) * 0.03, -8 + Math.sin(angle) * radius * 0.58] as [number, number, number],
      scale: 0.34 + (index % 4) * 0.08,
    };
  }), []);

  return (
    <group ref={ground}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.9, -8]} receiveShadow>
        <circleGeometry args={[18, 160]} />
        <meshStandardMaterial color="#07120f" roughness={0.92} metalness={0.06} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.86, -7.8]}>
        <ringGeometry args={[2.4, 8.8, 180]} />
        <meshStandardMaterial color="#20372c" roughness={0.78} metalness={0.12} transparent opacity={0.58} />
      </mesh>
      {[2.9, 4.5, 6.4, 8.4].map((radius) => (
        <mesh key={radius} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.82, -8]}>
          <ringGeometry args={[radius, radius + 0.035, 220]} />
          <meshBasicMaterial color={radius < 5 ? "#b9f6ff" : "#d5c28f"} transparent opacity={radius < 5 ? 0.32 : 0.15} toneMapped={false} />
        </mesh>
      ))}
      {stones.map((stone, index) => (
        <mesh key={index} position={stone.position} scale={stone.scale} castShadow receiveShadow>
          <dodecahedronGeometry args={[1, 1]} />
          <meshStandardMaterial color={index % 3 === 0 ? "#303b34" : "#1b2823"} roughness={0.98} />
        </mesh>
      ))}
    </group>
  );
}

function MemoryField() {
  const anchors = useMemo(() => [
    [-5.4, 0.1, -10.5, 0.85], [-3.3, 1.1, -13.4, 1.18], [3.9, 0.35, -11.8, 0.94],
    [5.7, 1.25, -14.6, 1.32], [-1.6, 2.6, -17.4, 0.72], [1.8, 3.2, -18.8, 0.64],
  ] as const, []);
  return (
    <group>
      {anchors.map(([x, y, z, scale], index) => (
        <Float key={index} speed={0.35 + index * 0.03} rotationIntensity={0.08} floatIntensity={0.35}>
          <group position={[x, y, z]} scale={scale}>
            <mesh castShadow>
              <icosahedronGeometry args={[0.52, 3]} />
              <meshPhysicalMaterial color={index % 2 ? "#b6d9ff" : "#f6d8a8"} emissive={index % 2 ? "#315b88" : "#8b5a2b"} emissiveIntensity={1.1} roughness={0.18} metalness={0.22} clearcoat={0.8} />
            </mesh>
            <pointLight color={index % 2 ? "#9ad8ff" : "#ffd39a"} intensity={2.6} distance={6} decay={2} />
          </group>
        </Float>
      ))}
    </group>
  );
}

function ThresholdOrb() {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!group.current) return;
    group.current.rotation.y = clock.elapsedTime * 0.13;
    group.current.position.y = 1.35 + Math.sin(clock.elapsedTime * 0.75) * 0.12;
  });
  return (
    <group ref={group} position={[0, 1.35, -7.7]}>
      <mesh castShadow>
        <sphereGeometry args={[0.82, 96, 96]} />
        <meshPhysicalMaterial color="#d9f8ff" emissive="#69d8ff" emissiveIntensity={1.7} transmission={0.36} thickness={1.1} roughness={0.06} metalness={0.08} clearcoat={1} />
      </mesh>
      <mesh scale={1.34}>
        <sphereGeometry args={[0.82, 64, 64]} />
        <meshBasicMaterial color="#8fefff" transparent opacity={0.055} side={THREE.BackSide} toneMapped={false} />
      </mesh>
      <pointLight color="#8fefff" intensity={8} distance={16} decay={2} />
    </group>
  );
}

function Portal({ position, color, rotation = 0 }: { position: [number, number, number]; color: string; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh>
        <torusGeometry args={[1.45, 0.045, 20, 180]} />
        <meshBasicMaterial color={color} transparent opacity={0.74} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, -0.06]}>
        <circleGeometry args={[1.38, 96]} />
        <meshBasicMaterial color={color} transparent opacity={0.08} toneMapped={false} />
      </mesh>
      <pointLight color={color} intensity={4.4} distance={9} decay={2} />
    </group>
  );
}

function HomeScene() {
  return (
    <>
      <color attach="background" args={["#020506"]} />
      <fogExp2 attach="fog" args={["#07100f", 0.042]} />
      <ambientLight intensity={0.36} color="#cde8ff" />
      <directionalLight position={[4, 12, 5]} intensity={2.8} color="#f6dfbd" castShadow shadow-mapSize={[2048, 2048]} />
      <hemisphereLight args={["#8fc9ff", "#09120e", 1.3]} />
      <CameraBreath />
      <Stars radius={110} depth={72} count={1600} factor={2.2} saturation={0.1} fade speed={0.08} />
      <Sparkles count={180} scale={[22, 10, 26]} position={[0, 3, -12]} size={1.7} speed={0.16} opacity={0.34} color="#c9f6ff" />
      <LivingGround />
      <MemoryField />
      <ThresholdOrb />
      <Portal position={[-4.8, 1.15, -12.4]} color="#88e7ff" rotation={0.12} />
      <Portal position={[4.8, 1.15, -12.4]} color="#f2c78d" rotation={-0.12} />
      <EffectComposer multisampling={0}>
        <Bloom intensity={1.05} luminanceThreshold={0.72} luminanceSmoothing={0.22} mipmapBlur />
        <Vignette eskil={false} offset={0.2} darkness={0.72} />
      </EffectComposer>
    </>
  );
}

export function HomeWorldProduction() {
  return (
    <main className={styles.world} data-urai-home-production data-urai-true-3d="true">
      <Canvas className={styles.canvas} shadows dpr={[1, 1.75]} camera={{ position: [0, 3.4, 11.5], fov: 44, near: 0.1, far: 180 }} gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}>
        <HomeScene />
      </Canvas>

      <header className={styles.brand} aria-label="URAI">
        <strong>URAI</strong>
        <span>Your living world</span>
      </header>

      <section className={styles.hero} aria-label="URAI Home">
        <p>HOME</p>
        <h1>Step inside your life.</h1>
        <span>The ground remembers where you stand. The sky remembers where you have been.</span>
      </section>

      <Link className={`${styles.portalLink} ${styles.groundLink}`} href="/ground" aria-label="Enter Ground">
        <span>GROUND</span><strong>Enter your living world</strong>
      </Link>
      <Link className={`${styles.portalLink} ${styles.lifeMapLink}`} href="/life-map" aria-label="Enter Life Map">
        <span>LIFE MAP</span><strong>Ascend into memory</strong>
      </Link>

      <nav className={styles.routeRail} aria-label="URAI worlds">
        {routes.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}
      </nav>
    </main>
  );
}
