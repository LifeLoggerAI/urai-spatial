'use client';

import { ReactNode, useState, useEffect } from 'react';
import { PerspectiveCamera, Stats, OrbitControls } from '@react-three/drei';
import { useRouter } from 'next/navigation';
import { Fog } from 'three';
import { WarpTunnel } from '../../../engine/scenes/WarpTunnel';
import Ground from '@/components/scene/Ground';
import SkyDome from '@/components/scene/SkyDome';
import Orb from '@/components/scene/Orb';
import AtmosphereStars from '@/components/scene/AtmosphereStars';

interface SceneManagerProps {
  children: ReactNode;
}

export default function SceneManager({ children }: SceneManagerProps) {
  const [isRouting, setIsRouting] = useState(false);
  const router = useRouter();
  const fog = new Fog('#020617', 35, 160);

  useEffect(() => {
    // Placeholder for route change detection.
    // In a real app, this would be implemented to set `isRouting`.
  }, [router]);

  return (
    <>
      <primitive object={fog} attach="fog" />
      <PerspectiveCamera makeDefault position={[0, 2.2, 6.5]} fov={45} />

      {/* Camera Controls */}
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        enablePan
        enableZoom
        enableRotate
      />

      <ambientLight intensity={0.25} />

      <directionalLight
        position={[5, 10, 5]}
        intensity={1.2}
        castShadow
      />

      <pointLight
        position={[0, 2, 2]}
        intensity={1}
        color="#0ea5e9"
      />

      <SkyDome />
      <AtmosphereStars />
      <Ground />
      <Orb />

      {isRouting ? <WarpTunnel /> : children}

      <Stats />
    </>
  );
}
