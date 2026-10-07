"use client"

import { Canvas } from "@react-three/fiber"
import { Float, OrbitControls, RoundedBox } from "@react-three/drei"
import { useAdaptiveSpatialQuality } from "@/spatial/performance/useAdaptiveSpatialQuality"
import { VaultAmbientFrames } from "./VaultAmbientFrames"
import { ZONES } from "./passportZones"

export default function VaultWorld({ selected, keyState, onSelect, reducedMotion }: { selected: string; keyState: string; onSelect: (zone: string) => void; reducedMotion: boolean }) {
  const quality = useAdaptiveSpatialQuality()
  const keyColor = keyState === 'authorized' ? '#ffe0a3' : keyState === 'failed' ? '#ff8f78' : '#8edce5'
  return (
    <Canvas camera={{ position: [0, 5.2, 12], fov: 47 }} frameloop={quality.documentVisible ? "demand" : "never"} dpr={[1, Math.min(1.5, quality.pixelRatioMax)]} gl={{ antialias: quality.antialias, alpha: true }}>
      <VaultAmbientFrames enabled={quality.documentVisible && !reducedMotion} framesPerSecond={quality.tier === "low" ? 20 : 30} />
      <fog attach="fog" args={['#020409', 10, 28]} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[5, 8, 4]} intensity={1.2} color="#fff4d4" />
      <pointLight position={[0, 1.8, 0]} intensity={18} distance={10} color={keyColor} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.2, 0]} receiveShadow>
        <circleGeometry args={[10, 72]} />
        <meshStandardMaterial color="#090d14" metalness={0.3} roughness={0.72} />
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
              <meshStandardMaterial color={active ? '#d6b66f' : '#101823'} emissive={active ? '#d8b463' : '#17313b'} emissiveIntensity={active ? 0.62 : 0.12} metalness={0.48} roughness={0.36} />
            </RoundedBox>
            <mesh position={[0, index === 0 ? 0.1 : 0, index === 0 ? 0.58 : 0.36]}>
              <planeGeometry args={[active ? 1.42 : 1.12, 0.08]} />
              <meshBasicMaterial color={active ? '#fff8e8' : '#8edce5'} />
            </mesh>
          </group>
        )
      })}
      <group position={[0, 1.35, 0]}>
        <Float speed={reducedMotion ? 0 : 0.8} rotationIntensity={reducedMotion ? 0 : 0.22} floatIntensity={reducedMotion ? 0 : 0.28}>
          <mesh rotation={[0, 0, Math.PI / 4]}>
            <torusGeometry args={[0.72, 0.16, 20, 64]} />
            <meshStandardMaterial color={keyColor} emissive={keyColor} emissiveIntensity={1.3} metalness={0.75} roughness={0.2} />
          </mesh>
          <mesh position={[0.92, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <boxGeometry args={[0.18, 1.4, 0.18]} />
            <meshStandardMaterial color={keyColor} emissive={keyColor} emissiveIntensity={0.9} metalness={0.8} roughness={0.2} />
          </mesh>
        </Float>
      </group>
      <OrbitControls enablePan enableZoom minDistance={6.8} maxDistance={18} maxPolarAngle={Math.PI * 0.5} minPolarAngle={Math.PI * 0.18} enableDamping={!reducedMotion} />
    </Canvas>
  )
}

