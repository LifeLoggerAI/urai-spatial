
'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ARButton, XR, Controllers, Hands } from '@react-three/xr';
import { CameraController } from '@/components/CameraController';
import Starfield from 'apps/spatial-web/src/Starfield';
import { useLifeMapData } from '@/hooks/useLifeMapData';
import { XRSceneManager } from '@/components/XRSceneManager';
import { Suspense, useRef, useEffect, useState } from 'react';
import Orb from 'apps/spatial-web/src/Orb';
import { Box, Text, Stats } from '@react-three/drei';
import * as THREE from 'three';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import ErrorBoundary from '@/components/ErrorBoundary';

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
  const { scene } = useThree();
  const { memories, loading } = useLifeMapData();
  const orbRef = useRef<THREE.Group>(null!);
  const skyRef = useRef<THREE.Group>(null!);

  useEffect(() => {
    scene.fog = new THREE.Fog('#070b17', 8, 22);
  }, [scene]);

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
    camera.lookAt(0, 1.1, 0);
  });

  if (loading) {
    return <Text position={[0, 1.5, 0]}>Loading memories...</Text>;
  }

  if (memories.length === 0) {
    return <Text position={[0, 1.5, 0]}>No memories found.</Text>;
  }

  return (
    <Suspense fallback={null}>
        <group ref={skyRef}>
            <Starfield memories={memories} />
        </group>
        <CameraController />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
            <planeGeometry args={[50, 50]} />
            <meshStandardMaterial color="#0d1326" roughness={0.9} />
        </mesh>
        <Box args={[3.2, 0.8, 3.2]} position={[0, -0.6, 0]}>
            <meshStandardMaterial color="#0f172a" roughness={0.85} metalness={0.05} />
        </Box>
        <group ref={orbRef} position={[0, 1.25, 0]} scale={[1.2, 1.2, 1.2]}>
            <Orb />
        </group>
        <ambientLight intensity={0.15} />
        <directionalLight
            position={[-6, 8, 4]}
            intensity={1.2}
            color="#b9c6ff"
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
        />
        <directionalLight
            position={[0, 6, -6]}
            intensity={0.8}
            color="#9d6bff"
        />
        <Avatar />
        <EffectComposer>
            <Bloom
                intensity={0.6}
                luminanceThreshold={0.3}
                luminanceSmoothing={0.9}
            />
        </EffectComposer>
    </Suspense>
  );
}

export default function SpatialWebPage() {
  const [showStats, setShowStats] = useState(false);

  useEffect(() => {
    // Check for a query parameter to show stats, e.g., ?stats=true
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('stats') === 'true') {
      setShowStats(true);
    }
  }, []);

  return (
    <main className="w-full h-screen bg-black">
      <ARButton />
      <ErrorBoundary fallback={<div className="w-full h-full flex items-center justify-center"><p>Something went wrong.</p></div>}>
        <Canvas
          shadows
          camera={{ position: [0, 2.2, 6], fov: 45 }}
          gl={{ antialias: true }}
        >
          <color attach="background" args={['#070b17']} />
          <XR>
            <XRSceneManager />
            <Controllers />
            <Hands />
            <Scene />
          </XR>
          {showStats && <Stats />}
        </Canvas>
      </ErrorBoundary>
    </main>
  );
}
