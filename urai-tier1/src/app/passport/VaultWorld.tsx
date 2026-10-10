"use client"

import { Canvas } from "@react-three/fiber"
import { Environment, Float, Lightformer, OrbitControls, RoundedBox } from "@react-three/drei"
import { useAdaptiveSpatialQuality } from "@/spatial/performance/useAdaptiveSpatialQuality"
import { VaultAmbientFrames } from "./VaultAmbientFrames"
import { ZONES } from "./passportZones"

export default function VaultWorld({ selected, keyState, onSelect, reducedMotion }: { selected: string; keyState: string; onSelect: (zone: string) => void; reducedMotion: boolean }) {
  const quality = useAdaptiveSpatialQuality()
  const keyColor = keyState === 'authorized' ? '#ffe0a3' : keyState === 'failed' ? '#ff8f78' : '#8edce5'
  return (
    <Canvas camera={{ position: [0, 5.2, 12], fov: 47 }} frameloop={quality.documentVisible ? "demand" : "never"} dpr={[1, Math.min(1.5, quality.pixelRatioMax)]} gl={{ antialias: quality.antialias, alpha: false }}>
      <color attach="background" args={['#101a25']} />
      <VaultAmbientFrames enabled={quality.documentVisible && !reducedMotion} framesPerSecond={quality.tier === "low" ? 20 : 30} />
      <fog attach="fog" args={['#020409', 10, 28]} />
      <ambientLight intensity={0.6} />
      <hemisphereLight intensity={0.8} color="#d6e5ed" groundColor="#253135" />
      <directionalLight position={[5, 8, 4]} intensity={1.2} color="#fff4d4" />
      <pointLight position={[0, 1.8, 0]} intensity={5} distance={10} color={keyColor} />
      <Environment resolution={64} frames={1}>
        <Lightformer position={[-5, 6, 3]} rotation={[0, Math.PI / 4, 0]} scale={[6, 5, 1]} intensity={2} color="#fff2d5" />
        <Lightformer position={[5, 4, -3]} rotation={[0, -Math.PI / 4, 0]} scale={[4, 5, 1]} intensity={1.2} color="#b4daed" />
      </Environment>
      <mesh position={[0, 3, -9]} receiveShadow><boxGeometry args={[22, 9, .4]} /><meshStandardMaterial color="#273540" roughness={.86} metalness={.12} /></mesh>
      {[-8, -6, -4, -2, 0, 2, 4, 6, 8].map((x) => <mesh key={x} position={[x, 3, -8.72]}><boxGeometry args={[.055, 8, .12]} /><meshStandardMaterial color="#8c836d" roughness={.5} metalness={.6} /></mesh>)}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.2, 0]} receiveShadow>
        <circleGeometry args={[10, 72]} />
        <meshStandardMaterial color="#263641" metalness={0.22} roughness={0.64} />
      </mesh>
      {ZONES.map(([id], index) => {
        const angle = ((index - 1) / ZONES.length) * Math.PI * 2
        const radius = index === 0 ? 0 : 6.2
        const x = index === 0 ? 0 : Math.cos(angle) * radius
        const z = index === 0 ? -2.4 : Math.sin(angle) * radius
        const active = id === selected
        return (
          <group key={id} position={[x, index === 0 ? 1.3 : 0, z]} rotation={[0, -angle + Math.PI / 2, 0]}>
            <RoundedBox args={index === 0 ? [2.3, 3.7, 1.1] : [2.2, 2.2, 0.65]} radius={0.16} smoothness={4} onClick={(event) => { event.stopPropagation(); onSelect(id) }}>
              <meshStandardMaterial color={active ? '#687978' : '#263943'} emissive={active ? '#baa36a' : '#17313b'} emissiveIntensity={active ? 0.08 : 0.025} metalness={0.42} roughness={0.4} />
            </RoundedBox>
            <mesh position={[0, index === 0 ? 0.1 : 0, index === 0 ? 0.58 : 0.36]}>
              <planeGeometry args={[active ? 1.42 : 1.12, 0.08]} />
              <meshBasicMaterial color={active ? '#fff8e8' : '#8edce5'} />
            </mesh>
          </group>
        )
      })}
      <group position={[0, 1.35, 0]} rotation={[0, -.35, 0]} scale={.8}>
        <Float speed={reducedMotion ? 0 : 0.8} rotationIntensity={reducedMotion ? 0 : 0.22} floatIntensity={reducedMotion ? 0 : 0.28}>
          <mesh rotation={[0, 0, Math.PI / 4]}>
            <torusGeometry args={[0.72, 0.16, 20, 64]} />
            <meshStandardMaterial color={keyColor} emissive={keyColor} emissiveIntensity={0.1} metalness={0.75} roughness={0.26} />
          </mesh>
          <mesh position={[0.92, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <boxGeometry args={[0.18, 1.4, 0.18]} />
            <meshStandardMaterial color={keyColor} emissive={keyColor} emissiveIntensity={0.06} metalness={0.8} roughness={0.26} />
          </mesh>
        </Float>
      </group>
      <OrbitControls enablePan enableZoom minDistance={6.8} maxDistance={18} maxPolarAngle={Math.PI * 0.5} minPolarAngle={Math.PI * 0.18} enableDamping={!reducedMotion} />
    </Canvas>
  )
}

