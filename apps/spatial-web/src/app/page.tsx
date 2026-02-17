
'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { ARButton, XR, Controllers, Hands } from '@react-three/xr';
import { CameraController } from '@/components/CameraController';
import Starfield from 'apps/spatial-web/src/Starfield';
import { useLifeMapData } from '@/hooks/useLifeMapData';
import { XRSceneManager } from '@/components/XRSceneManager';
import { Suspense, useRef, useEffect } from 'react';
import Orb from 'apps/spatial-web/src/Orb';
import { Box } from '@react-three/drei';
import * as THREE from 'three';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';

const Avatar = () => {
  const avatarRef = useRef<THREE.Mesh>(null!);

  useFrame(({ clock }) => {
    if (avatarRef.current) {
      const t = clock.getElapsedTime();
      const breath = 1 + Math.sin(t * 0.8 + 1.2) * 0.01;
      avatarRef.current.scale.y = breath;
    }
  });

  return (
    <Box ref={avatarRef} args={[0.5, 1, 0.5]} position={[1.8, 0, 2.5]} scale={[0.9, 0.9, 0.9]} rotation-y={-0.6}>
      <meshStandardMaterial color="#ffffff" />
    </Box>
  );
};

function Scene() {
  const { memories } = useLifeMapData();
  const orbRef = useRef<THREE.Group>(null!);
  const skyRef = useRef<THREE.Group>(null!);
  const lightRef = useRef<THREE.PointLight>(null!);

  useFrame(({ clock, camera }) => {
    if (orbRef.current) {
      const t = clock.getElapsedTime();
      const breath = 1 + Math.sin(t * 0.8) * 0.03;
      const scale = 1.2 * breath;
      orbRef.current.scale.set(scale, scale, scale);
    }
    if (skyRef.current) {
        skyRef.current.rotation.y += 0.00005;
    }
    if (lightRef.current) {
        const t = clock.getElapsedTime();
        lightRef.current.intensity = 0.7 + Math.sin(t * 1.2) * 0.05;
    }
    camera.lookAt(0, 1.1, 0);
  });

  return (
    <Suspense fallback={null}>
        <group ref={skyRef}>
            <Starfield memories={memories} />
        </group>
        <CameraController />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
            <planeGeometry args={[40, 40]} />
            <meshStandardMaterial color="#0b1020" />
        </mesh>
        <fog attach="fog" args={['#0b1020', 15, 45]} />
        <Box args={[3.2, 0.8, 3.2]} position={[0, -0.6, 0]}>
            <meshStandardMaterial color="#0f172a" roughness={0.85} metalness={0.05} />
        </Box>
        <group ref={orbRef} position={[0, 1.25, 0]} scale={[1.2, 1.2, 1.2]}>
            <Orb />
        </group>
        <directionalLight position={[5, 10, 5]} />
        <ambientLight intensity={0.15} />
        <Avatar />
        <EffectComposer>
            <Bloom luminanceThreshold={0} luminanceSmoothing={0.9} height={300} />
            <Vignette eskil={false} offset={0.1} darkness={1.1} />
            <Noise opacity={0.02} />
        </EffectComposer>
    </Suspense>
  );
}

export default function SpatialWebPage() {
  return (
    <main className="w-full h-screen bg-black">
      <ARButton />
      <Canvas camera={{ position: [0, 1.4, 6], fov: 40, near: 0.1, far: 1000 }}>
        <XR>
          <XRSceneManager />
          <Controllers />
          <Hands />
          <Scene />
        </XR>
      </Canvas>
    </main>
  );
}
