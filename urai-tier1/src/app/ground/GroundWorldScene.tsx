'use client'

import { PerspectiveCamera, Stars } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { DESTINATIONS, type GroundDestination } from './GroundWorldModel'
import { WorldEnvelope } from './GroundWorldEnvironment'
import { Corridor, DestinationArchitecture } from './GroundWorldStructures'

function CameraRig({ active }: { active: GroundDestination | null }) {
  const { camera, size } = useThree()
  const target = useMemo(() => new THREE.Vector3(), [])
  const look = useMemo(() => new THREE.Vector3(), [])

  useFrame((_, delta) => {
    target.set(...(active?.camera ?? (size.width < 700 ? [0, 2.2, 7.4] : [0, 2.4, 8.6])))
    look.set(...(active?.lookAt ?? [0, 1.45, -10.5]))
    camera.position.x = THREE.MathUtils.damp(camera.position.x, target.x, 4.2, delta)
    camera.position.y = THREE.MathUtils.damp(camera.position.y, target.y, 4.2, delta)
    camera.position.z = THREE.MathUtils.damp(camera.position.z, target.z, 4.2, delta)
    camera.lookAt(look)
  })

  return <PerspectiveCamera makeDefault position={[0, 2.4, 8.6]} fov={size.width < 700 ? 63 : 52} near={0.08} far={140} />
}

function WorkforcePresence({ destination, index }: { destination: GroundDestination; index: number }) {
  const group = useRef<THREE.Group>(null)
  const prefersReducedMotion = useRef(false)
  const color = useMemo(() => new THREE.Color(destination.color), [destination.color])
  const opacity = destination.workforceState === 'revoked' ? 0.18 : destination.workforceState === 'blocked' ? 0.38 : 0.78

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => { prefersReducedMotion.current = query.matches }
    update()
    if (typeof query.addEventListener === 'function') query.addEventListener('change', update)
    else query.addListener(update)
    return () => {
      if (typeof query.removeEventListener === 'function') query.removeEventListener('change', update)
      else query.removeListener(update)
    }
  }, [])

  useFrame(({ clock }) => {
    if (!group.current || prefersReducedMotion.current) return
    const time = clock.elapsedTime * 0.18 + index * 0.8
    group.current.position.x = destination.position[0] * 0.8 + Math.sin(time) * 0.3
    group.current.position.z = destination.position[2] + 1.4 + Math.cos(time) * 0.22
    group.current.rotation.y = -time + Math.PI * 0.5
  })

  return (
    <group ref={group} position={[destination.position[0] * 0.8, 0, destination.position[2] + 1.4]} userData={{ workforceState: destination.workforceState, serviceAvailability: destination.availability }}>
      <mesh position={[0, 1.62, 0]} castShadow>
        <sphereGeometry args={[0.15, 24, 24]} />
        <meshStandardMaterial color="#eefcff" emissive={color} emissiveIntensity={0.45} transparent opacity={opacity} />
      </mesh>
      <mesh position={[0, 1.03, 0]} castShadow>
        <capsuleGeometry args={[0.19, 0.76, 10, 20]} />
        <meshPhysicalMaterial color="#111c26" emissive={color} emissiveIntensity={0.22} roughness={0.3} metalness={0.48} clearcoat={0.5} transparent opacity={opacity} />
      </mesh>
      <mesh position={[-0.24, 1.15, 0]} rotation={[0, 0, -0.16]} castShadow>
        <capsuleGeometry args={[0.055, 0.42, 6, 12]} />
        <meshStandardMaterial color="#172531" emissive={color} emissiveIntensity={0.14} transparent opacity={opacity} />
      </mesh>
      <mesh position={[0.24, 1.15, 0]} rotation={[0, 0, 0.16]} castShadow>
        <capsuleGeometry args={[0.055, 0.42, 6, 12]} />
        <meshStandardMaterial color="#172531" emissive={color} emissiveIntensity={0.14} transparent opacity={opacity} />
      </mesh>
      <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.25, 0.33, 48]} />
        <meshBasicMaterial color={color} transparent opacity={opacity * 0.65} toneMapped={false} />
      </mesh>
    </group>
  )
}

export function GroundScene({ active, onSelect }: { active: GroundDestination | null; onSelect: (destination: GroundDestination) => void }) {
  return (
    <>
      <color attach="background" args={['#010712']} />
      <fog attach="fog" args={['#061520', 11, 52]} />
      <CameraRig active={active} />
      <ambientLight intensity={0.42} color="#dbeafe" />
      <hemisphereLight args={['#cfeeff', '#020408', 1.15]} />
      <directionalLight position={[-8, 13, 8]} intensity={2.2} color="#e7f7ff" castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
      <directionalLight position={[9, 8, -12]} intensity={0.65} color="#c4b5fd" />
      <pointLight position={[0, 6, -9]} intensity={8} color="#67e8f9" distance={30} decay={2} />
      <pointLight position={[-10, 4, -18]} intensity={5} color="#a78bfa" distance={24} decay={2} />
      <pointLight position={[10, 4, -18]} intensity={5} color="#86efac" distance={24} decay={2} />
      <Stars radius={85} depth={55} count={1500} factor={2.6} saturation={0.3} fade speed={0.035} />
      <WorldEnvelope />
      {DESTINATIONS.map((destination) => <Corridor key={`path-${destination.id}`} destination={destination} />)}
      {DESTINATIONS.map((destination, index) => <DestinationArchitecture key={destination.id} destination={destination} variant={index} active={active?.id === destination.id} onSelect={() => onSelect(destination)} />)}
      {DESTINATIONS.slice(0, 8).map((destination, index) => <WorkforcePresence key={`worker-${destination.id}`} destination={destination} index={index} />)}
      <EffectComposer>
        <Bloom intensity={0.72} luminanceThreshold={0.16} luminanceSmoothing={0.36} />
        <Vignette eskil={false} offset={0.16} darkness={0.42} />
      </EffectComposer>
    </>
  )
}
