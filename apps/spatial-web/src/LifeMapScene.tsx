"use client"

import { Canvas } from "@react-three/fiber"
import { EffectComposer, Bloom } from "@react-three/postprocessing"
import Starfield from "../components/lifemap/Starfield";
import { useLifeMapData } from "../lib/lifemap/useLifeMapData";
import { Stats } from '@react-three/drei';

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

export default function LifeMapScene() {
  const { memories, loading, error } = useLifeMapData();
  const isDev = process.env.NODE_ENV === 'development';

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error loading data.</div>;
  }
  
  return (
    <Canvas camera={{ position: [0, 0, 8], fov: 60 }}>
      <color attach="background" args={["#030712"]} />
      <Starfield stars={memories} />
      <Orb />
      <EffectComposer>
        <Bloom 
          intensity={0.6}
          luminanceThreshold={0.1}
          luminanceSmoothing={0.9}
          mipmapBlur={true}
        />
      </EffectComposer>
      {isDev && <Stats />}
    </Canvas>
  )
}
