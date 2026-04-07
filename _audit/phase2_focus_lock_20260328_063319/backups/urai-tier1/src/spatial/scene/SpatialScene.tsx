'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

type Phase = 'HOME' | 'LIFEMAP';

type StarNode = {
  id: string;
  position: [number, number, number];
  intensity: number;
};

const HOME_CAMERA_POS = new THREE.Vector3(0, 1.6, 6);
const HOME_LOOK_TARGET = new THREE.Vector3(0, 1.2, 0);

const LIFEMAP_CAMERA_POS = new THREE.Vector3(0, 0.8, 16);
const LIFEMAP_LOOK_TARGET = new THREE.Vector3(0, 0.2, -20);

function CameraAuthority({ phase }: { phase: Phase }) {
  const { camera } = useThree();
  const lookRef = useRef(new THREE.Vector3());

  useFrame((_, dt) => {
    const alpha = 1 - Math.exp(-dt * 2.4);

    if (phase === 'HOME') {
      camera.position.lerp(HOME_CAMERA_POS, alpha);
      lookRef.current.lerp(HOME_LOOK_TARGET, alpha);
    } else {
      camera.position.lerp(LIFEMAP_CAMERA_POS, alpha);
      lookRef.current.lerp(LIFEMAP_LOOK_TARGET, alpha);
    }

    camera.lookAt(lookRef.current);
    camera.updateProjectionMatrix();
  });

  return null;
}

function HomeEnvironment() {
  return (
    <>
      <color attach="background" args={['#02060b']} />
      <fog attach="fog" args={['#02060b', 18, 70]} />

      <ambientLight intensity={0.22} />
      <hemisphereLight intensity={0.32} groundColor="#020305" color="#102238" />
      <directionalLight position={[0, 8, 6]} intensity={0.25} />
      <pointLight position={[0, 1.8, 0.8]} intensity={0.65} distance={18} color="#9dbdff" />

      <mesh position={[0, -0.72, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[4.15, 96]} />
        <meshStandardMaterial color="#04090f" roughness={1} metalness={0} />
      </mesh>

      <mesh position={[0, -0.69, -1.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[4.1, 11.8, 96]} />
        <meshBasicMaterial color="#08111d" transparent opacity={0.45} side={THREE.DoubleSide} />
      </mesh>

      <mesh position={[0, -0.67, -12]}>
        <boxGeometry args={[34, 8, 2]} />
        <meshBasicMaterial color="#07111c" transparent opacity={0.35} />
      </mesh>
    </>
  );
}

function Orb({ onEnterLifeMap }: { onEnterLifeMap: () => void }) {
  const group = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.getElapsedTime();
    group.current.position.y = 1.15 + Math.sin(t * 0.35) * 0.015;
  });

  return (
    <group ref={group} position={[0, 1.15, 0]}>
      <mesh onClick={(e) => { e.stopPropagation(); onEnterLifeMap(); }}>
        <sphereGeometry args={[0.34, 64, 64]} />
        <meshStandardMaterial
          color="#bfd3ff"
          emissive="#8fb6ff"
          emissiveIntensity={0.9}
          roughness={0.18}
          metalness={0.02}
        />
      </mesh>

      <mesh scale={[1.9, 1.9, 1.9]}>
        <sphereGeometry args={[0.34, 48, 48]} />
        <meshBasicMaterial color="#4f84ff" transparent opacity={0.07} depthWrite={false} />
      </mesh>

      <mesh position={[0, -1.18, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.34, 48]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.26} depthWrite={false} />
      </mesh>
    </group>
  );
}

function LifeMapStars() {
  const stars = useMemo<StarNode[]>(
    () => [
      { id: 's1', position: [-2.8, -1.4, -18], intensity: 0.60 },
      { id: 's2', position: [-0.3, -1.8, -15], intensity: 0.92 },
      { id: 's3', position: [2.4, -1.5, -20], intensity: 0.42 },
      { id: 's4', position: [0.8, 1.4, -24], intensity: 0.36 },
      { id: 's5', position: [-4.0, 0.5, -30], intensity: 0.25 },
      { id: 's6', position: [3.9, 0.2, -33], intensity: 0.20 },
      { id: 's7', position: [0.0, 0.8, -28], intensity: 0.18 },
      { id: 's8', position: [-1.7, 1.6, -26], intensity: 0.22 },
    ],
    []
  );

  return (
    <group>
      {stars.map((star) => (
        <group key={star.id} position={star.position}>
          <mesh>
            <sphereGeometry args={[0.18 + star.intensity * 0.06, 24, 24]} />
            <meshBasicMaterial
              color="#d9e6ff"
              transparent
              opacity={0.72 + star.intensity * 0.25}
              depthWrite={false}
            />
          </mesh>
          <mesh scale={[2.4, 2.4, 2.4]}>
            <sphereGeometry args={[0.18 + star.intensity * 0.06, 18, 18]} />
            <meshBasicMaterial
              color="#7fa8ff"
              transparent
              opacity={0.08 + star.intensity * 0.06}
              depthWrite={false}
            />
          </mesh>
          {star.intensity > 0.5 ? (
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.22, 0.34, 36]} />
              <meshBasicMaterial color="#8fb2ff" transparent opacity={0.12} depthWrite={false} side={THREE.DoubleSide} />
            </mesh>
          ) : null}
        </group>
      ))}
    </group>
  );
}

function SceneRoot() {
  const [phase, setPhase] = useState<Phase>('HOME');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPhase((prev) => (prev === 'LIFEMAP' ? 'HOME' : prev));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <CameraAuthority phase={phase} />
      <HomeEnvironment />
      {phase === 'HOME' ? <Orb onEnterLifeMap={() => setPhase('LIFEMAP')} /> : null}
      {phase === 'LIFEMAP' ? <LifeMapStars /> : null}
      <mesh
        position={[0, 0, -40]}
        onClick={() => {
          if (phase === 'HOME') setPhase('LIFEMAP');
        }}
      >
        <planeGeometry args={[400, 220]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </>
  );
}

export default function SpatialScene() {
  return (
    <div style={{ position: 'fixed', inset: 0, width: '100vw', height: '100dvh', background: '#02060b' }}>
      <Canvas
        gl={{ antialias: true, alpha: false }}
        camera={{ fov: 50, near: 0.1, far: 2000, position: [0, 1.6, 6] }}
        dpr={[1, 1.5]}
      >
        <SceneRoot />
      </Canvas>
    </div>
  );
}
