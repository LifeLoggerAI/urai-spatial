'use client';

import React, { useState, useRef } from 'react';
import { ARButton, XR, useXR, useHitTest, Controllers, Hands } from '@react-three/xr';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, Ring, useCursor } from '@react-three/drei';
import * as THREE from 'three';
import { useSpatialCamera } from './SpatialCameraController';

/**
 * An interactive node that, when placed and clicked, will initiate the transition
 * from the AR context back to the main spatial experience.
 */
function AnchorNode({ position }: { position: THREE.Vector3 }) {
  const [hovered, setHover] = useState(false);
  const { returnToStarfield } = useSpatialCamera();
  const { session } = useXR();
  useCursor(hovered);

  const handleClick = async () => {
    console.log('Anchor clicked. Returning to Starfield...');
    
    // 1. Start the cinematic camera movement back to the main scene.
    returnToStarfield();

    // 2. End the AR session, which will fade out the real-world view.
    if (session) {
      // Short delay to ensure the camera transition has started
      setTimeout(() => session.end(), 500);
    }
  };

  return (
    <group position={position}>
      <Sphere 
        args={[0.05]} 
        onClick={handleClick}
        onPointerOver={() => setHover(true)}
        onPointerOut={() => setHover(false)}
      >
        <meshStandardMaterial color={hovered ? '#ff6347' : '#007bff'} emissive={hovered ? '#ff6347' : '#007bff'} emissiveIntensity={0.8} />
      </Sphere>
    </group>
  );
}

/**
 * A reticle to show the user where they can place an anchor.
 */
function Reticle() {
  const reticleRef = useRef<THREE.Mesh>(null!);
  const hitTestRef = useRef<THREE.Matrix4 | null>(null);
  const { isPresenting } = useXR();

  useHitTest((hitMatrix) => {
    if(isPresenting) hitTestRef.current = hitMatrix;
  });

  useFrame(() => {
    if (reticleRef.current) {
        reticleRef.current.visible = isPresenting && !!hitTestRef.current;
    }
    if (isPresenting && hitTestRef.current && reticleRef.current) {
        reticleRef.current.matrix.fromArray(hitTestRef.current.toArray());
    }
  });

  return (
    <mesh ref={reticleRef} matrixAutoUpdate={false}>
      <Ring args={[0.05, 0.06, 32]} rotation={[-Math.PI / 2, 0, 0]} material-color="white" />
    </mesh>
  );
}

/**
 * Manages the AR session, including surface detection and anchor placement.
 */
export function ARManager() {
  const [anchors, setAnchors] = useState<{ position: THREE.Vector3 }[]>([]);
  const hitTestRef = useRef<THREE.Matrix4 | null>(null);

  useHitTest((hitMatrix) => {
    hitTestRef.current = hitMatrix;
  });

  const handleSelect = () => {
    if (hitTestRef.current) {
      const position = new THREE.Vector3().setFromMatrixPosition(hitTestRef.current);
      setAnchors([{ position }]);
      console.log('Anchor placed at:', position);
    }
  };

  return (
    <>
        <ARButton sessionInit={{ requiredFeatures: ['hit-test'] }} />
        <Canvas style={{position: 'absolute', top: 0, left: 0, zIndex: -1}}>
            <XR onSelect={handleSelect}>
                <Controllers />
                <Hands />

                <ambientLight intensity={0.5} />
                <pointLight position={[5, 5, 5]} intensity={1} />

                <Reticle />
                {anchors.map((anchor, i) => (
                    <AnchorNode key={i} position={anchor.position} />
                ))}
            </XR>
        </Canvas>
    </>  
  );
}

