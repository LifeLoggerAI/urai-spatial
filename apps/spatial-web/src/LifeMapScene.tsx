"use client"

import { Canvas, useFrame } from "@react-three/fiber"
import { EffectComposer, Bloom } from "@react-three/postprocessing"
import * as THREE from "three"
import { useMemo } from "react"
import { mockMemoryNodes } from '../lib/mock-data';

function Orb() {
  return (
    <>
      {/* The main orb */}
      <mesh>
        <sphereGeometry args={[1.5, 128, 128]} />
        <meshStandardMaterial 
          color="#9fe7ff"
          emissive="#9fe7ff"
          emissiveIntensity={1.2}
          toneMapped={false}
        />
      </mesh>
      {/* The purple halo */}
      <mesh>
        <sphereGeometry args={[1.8, 128, 128]} />
        <meshStandardMaterial 
          color="#b58cff"
          emissive="#b58cff"
          emissiveIntensity={0.5}
          transparent={true}
          opacity={0.3}
          toneMapped={false}
        />
      </mesh>
    </>
  )
}

function MemoryStars() {
  const [positions, colors] = useMemo(() => {
    const pos = new Float32Array(mockMemoryNodes.length * 3);
    const col = new Float32Array(mockMemoryNodes.length * 3);
    const tempColor = new THREE.Color();

    mockMemoryNodes.forEach((node, i) => {
      pos[i * 3] = node.position[0];
      pos[i * 3 + 1] = node.position[1];
      pos[i * 3 + 2] = node.position[2];
      tempColor.set(node.color);
      col[i * 3] = tempColor.r;
      col[i * 3 + 1] = tempColor.g;
      col[i * 3 + 2] = tempColor.b;
    });

    return [pos, col];
  }, []);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={positions} count={positions.length / 3} itemSize={3} />
        <bufferAttribute attach="attributes-color" array={colors} count={colors.length / 3} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.5} vertexColors={true} />
    </points>
  );
}


export default function LifeMapScene() {
  return (
    <Canvas camera={{ position: [0, 0, 8], fov: 60 }}>
      <color attach="background" args={["#030712"]} />
      <MemoryStars />
      <Orb />
      <EffectComposer>
        <Bloom 
          intensity={0.6}
          luminanceThreshold={0.1}
          luminanceSmoothing={0.9}
          mipmapBlur={true}
        />
      </EffectComposer>
    </Canvas>
  )
}
