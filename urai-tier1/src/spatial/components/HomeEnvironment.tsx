"use client";

import * as THREE from "three";
import HomeGround from "./HomeGround";
import { Sparkles } from "@react-three/drei";
import { useMemo } from "react";

export type HomeEnvironmentProps = {
  active?: boolean;
  phase?: unknown;
  ascentProgress?: number;
  cinematicClean?: boolean;
};

function SkyDome() {
  const uniforms = useMemo(
    () => ({
      topColor: { value: new THREE.Color("#01020c") },
      midColor: { value: new THREE.Color("#070d22") },
      horizonColor: { value: new THREE.Color("#172347") },
      glowColor: { value: new THREE.Color("#4f5fd1") },
    }),
    []
  );

  return (
    <mesh renderOrder={-100}>
      <sphereGeometry args={[125, 128, 64]} />
      <shaderMaterial
        side={THREE.BackSide}
        depthWrite={false}
        uniforms={uniforms}
        vertexShader={`
          varying vec3 vDir;
          void main() {
            vec4 wp = modelMatrix * vec4(position, 1.0);
            vDir = normalize(wp.xyz);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform vec3 topColor;
          uniform vec3 midColor;
          uniform vec3 horizonColor;
          uniform vec3 glowColor;
          varying vec3 vDir;

          void main() {
            float h = clamp(vDir.y * 0.5 + 0.5, 0.0, 1.0);
            vec3 c = mix(horizonColor, midColor, smoothstep(0.18, 0.55, h));
            c = mix(c, topColor, smoothstep(0.62, 1.0, h));
            float horizon = exp(-pow((h - 0.34) * 5.6, 2.0));
            c += glowColor * horizon * 0.16;
            gl_FragColor = vec4(c, 1.0);
          }
        `}
      />
    </mesh>
  );
}

function HorizonFog() {
  return (
    <group position={[0, -0.35, -24]}>
      <HomeGround phase="HOME" ascentProgress={0} emotionalState={null} />
      <mesh renderOrder={1}>
        <planeGeometry args={[140, 18]} />
        <meshBasicMaterial color="#1a264c" transparent opacity={0.155} depthWrite={false} />
      </mesh>
      <mesh position={[0, 3.2, -8]} renderOrder={2}>
        <planeGeometry args={[150, 26]} />
        <meshBasicMaterial color="#070b20" transparent opacity={0.135} depthWrite={false} />
      </mesh>
      <mesh position={[0, -1.8, 8]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={3}>
        <ringGeometry args={[22, 70, 224]} />
        <meshBasicMaterial color="#1f2b56" transparent opacity={0.11} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}

function Ground() {
  return (
    <group position={[0, -1.2, 0]}>
  <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
    <circleGeometry args={[140, 128]} />
    <meshStandardMaterial
      color={"#080c18"}
      roughness={0.95}
      metalness={0.03}
    />
  </mesh>

  <mesh rotation={[-Math.PI / 2, 0, 0]}>
    <circleGeometry args={[180, 128]} />
    <meshStandardMaterial
      color={"#0b1020"}
      roughness={1}
      metalness={0}
      transparent
      opacity={0.25}
    />
  </mesh>

  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
    <circleGeometry args={[2.25, 128]} />
    <meshBasicMaterial
      color={"#000"}
      transparent
      opacity={0.26}
    />
  </mesh>

  <mesh rotation={[-Math.PI / 2, 0, 0]}>
    <circleGeometry args={[220, 192]} />
    <meshBasicMaterial
      color={"#000"}
      transparent
      opacity={0.08}
    />
  </mesh>

  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
    <circleGeometry args={[140, 64]} />
    <meshBasicMaterial
      color={"#0a0f1f"}
      transparent
      opacity={0.055}
    />
  </mesh>
</group>
  );
}

function Orb() {
  return (
    <group position={[0, 0.67, 0]}>
      <pointLight color="#b7c2ff" intensity={3.25} distance={8.5} decay={2.35} />
      <pointLight color="#6f67ff" intensity={0.78} distance={5.0} decay={2.5} position={[0, -0.78, 0]} />

              {/* URAI_ORB_LOOK_REFINEMENT_LOCK */}
        <mesh scale={[1.22, 1.22, 1.22]} renderOrder={8}>
          <sphereGeometry args={[1.0, 48, 48]} />
          <meshBasicMaterial
            color="#b8c4ff"
            transparent
            opacity={0.08}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>

        <mesh scale={[0.96, 0.96, 0.96]} castShadow receiveShadow>
        <sphereGeometry args={[1, 128, 128]} />
        <meshPhysicalMaterial
          color="#b6bfeb"
          roughness={0.54}
          metalness={0.055}
          clearcoat={0.22}
          clearcoatRoughness={0.7}
          emissive="#374195"
          emissiveIntensity={0.035}
          reflectivity={0.28}
        />
      </mesh>

      <mesh scale={[1.105, 1.105, 1.105]} renderOrder={18}>
        <sphereGeometry args={[1, 128, 128]} />
        <meshBasicMaterial color="#d7dcff" transparent opacity={0.016} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>

      <mesh scale={[1.48, 1.48, 1.48]} renderOrder={9}>
        <sphereGeometry args={[1, 96, 96]} />
        <meshBasicMaterial color="#6871ff" transparent opacity={0.011} depthWrite={false} side={THREE.BackSide} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}

export default function HomeEnvironment(_props: HomeEnvironmentProps) {
  return (
    <group>
      <fog attach="fog" args={["#070b1d", 26, 150]} />

      <ambientLight intensity={0.34} color="#747fa8" />
      <directionalLight position={[-4.8, 7.6, 5.8]} intensity={1.65} color="#dce2ff" castShadow />
      <directionalLight position={[5.8, 2.7, -5.5]} intensity={0.26} color="#48518f" />

      <SkyDome />
      <HorizonFog />
      <Ground />

      <Sparkles
        count={72}
        scale={[48, 24, 36]}
        size={0.45}
        speed={0.035}
        opacity={0.055}
        color="#99a4ff"
        position={[0, 8, -18]}
      />

      <Orb />
    </group>
  );
}


/*
URAI_HOME_ASCENT_READY

HOME must remain visually valid during ASCENT:
- Ground falls away beneath camera.
- Orb recedes without scale snap.
- Sky has enough vertical depth.
- Fog blends horizon during travel.
*/
