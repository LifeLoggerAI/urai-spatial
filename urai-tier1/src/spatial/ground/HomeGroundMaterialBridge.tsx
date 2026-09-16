'use client'

import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { useEffect, useMemo, useRef, type MutableRefObject } from 'react'
import * as THREE from 'three'
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js'
import { requestHapticCue } from '@/spatial/haptics/HapticRuntime'
import type { GroundDescentPhase } from './groundTransitionTimeline'

type TargetRef = MutableRefObject<{ point: THREE.Vector3; normal?: THREE.Vector3 } | null>

const ROCK_01 = '/assets/urai/home-production/cc0/polyhaven-v48/rock_face_01/asset.gltf'
const ROCK_02 = '/assets/urai/home-production/cc0/polyhaven-v48/rock_face_02/asset.gltf'
const HOME_BG = new THREE.Color('#10272a')
const HOME_FOG = new THREE.Color('#294946')
const SOIL_ATMOSPHERE = new THREE.Color('#51483d')
const FOLD_ATMOSPHERE = new THREE.Color('#66766e')
const GROUND_ATMOSPHERE = new THREE.Color('#7d9388')

function cloneNormalizedRock(source: THREE.Object3D) {
  const copy = cloneSkeleton(source)
  copy.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(copy)
  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())
  const normalization = 1 / Math.max(size.x, size.y, size.z, 0.001)
  copy.scale.setScalar(normalization)
  copy.position.set(-center.x * normalization, -box.min.y * normalization, -center.z * normalization)
  copy.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    object.material = Array.isArray(object.material)
      ? object.material.map((material) => material.clone())
      : object.material.clone()
    object.castShadow = true
    object.receiveShadow = true
  })
  return copy
}

function disposeRock(root: THREE.Object3D) {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    const materials = Array.isArray(object.material) ? object.material : [object.material]
    materials.forEach((material) => material.dispose())
  })
}

function rootGeometry(points: readonly [number, number, number][], radius: number) {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)), false, 'centripetal', .42)
  return new THREE.TubeGeometry(curve, 48, radius, 8, false)
}

function isMaterialPhase(phase: GroundDescentPhase | null) {
  return phase === 'ground-surface-crossing'
    || phase === 'ground-spatial-fold'
    || phase === 'ground-world-reveal'
    || phase === 'ground-arrival-handoff'
}

function atmosphereForPhase(phase: GroundDescentPhase | null) {
  if (phase === 'ground-surface-crossing') return { color: SOIL_ATMOSPHERE, density: .072 }
  if (phase === 'ground-spatial-fold') return { color: FOLD_ATMOSPHERE, density: .038 }
  if (phase === 'ground-world-reveal' || phase === 'ground-arrival-handoff') return { color: GROUND_ATMOSPHERE, density: .018 }
  return { color: HOME_BG, density: .0145 }
}

export function HomeGroundMaterialBridge({ phase, target, reducedMotion }: { phase: GroundDescentPhase | null; target: TargetRef; reducedMotion: boolean }) {
  const { scene } = useThree()
  const root = useRef<THREE.Group>(null)
  const shell = useRef<THREE.MeshPhysicalMaterial>(null)
  const lastPhase = useRef<GroundDescentPhase | null>(null)
  const rock01 = useGLTF(ROCK_01)
  const rock02 = useGLTF(ROCK_02)
  const leftRock = useMemo(() => cloneNormalizedRock(rock01.scene), [rock01.scene])
  const rightRock = useMemo(() => cloneNormalizedRock(rock02.scene), [rock02.scene])
  const roots = useMemo(() => [
    rootGeometry([[-1.35,.38,.82],[-.78,.18,.36],[-.18,.02,-.12],[.44,-.16,-.84],[.92,-.31,-1.55]], .045),
    rootGeometry([[1.2,.28,.55],[.72,.14,.28],[.25,-.02,-.22],[-.28,-.18,-.9],[-.78,-.34,-1.48]], .034),
    rootGeometry([[-.7,.52,-.3],[-.3,.22,-.46],[.02,.03,-.72],[.35,-.2,-1.15],[.62,-.38,-1.72]], .026),
  ], [])

  useEffect(() => {
    if (phase === lastPhase.current) return
    lastPhase.current = phase
    if (phase === 'ground-surface-crossing') requestHapticCue('ground-crossing', 'home-ground-material-bridge')
  }, [phase])

  useEffect(() => () => {
    disposeRock(leftRock)
    disposeRock(rightRock)
    roots.forEach((geometry) => geometry.dispose())
  }, [leftRock, rightRock, roots])

  useFrame((_, delta) => {
    const point = target.current?.point
    if (root.current && point) {
      root.current.position.copy(point)
      const active = isMaterialPhase(phase)
      root.current.visible = active
      const foldScale = phase === 'ground-spatial-fold' ? 1.32 : phase === 'ground-world-reveal' || phase === 'ground-arrival-handoff' ? 1.62 : 1
      const targetScale = reducedMotion ? 1 : foldScale
      root.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 1 - Math.pow(.002, delta))
    }

    const atmosphere = atmosphereForPhase(phase)
    const background = scene.background
    if (background instanceof THREE.Color) background.lerp(atmosphere.color, 1 - Math.pow(.0015, delta))
    if (scene.fog instanceof THREE.FogExp2) {
      const targetFog = phase == null ? HOME_FOG : atmosphere.color
      scene.fog.color.lerp(targetFog, 1 - Math.pow(.0015, delta))
      scene.fog.density = THREE.MathUtils.damp(scene.fog.density, atmosphere.density, 5, delta)
    }
    if (shell.current) {
      const opacity = phase === 'ground-surface-crossing' ? .26 : phase === 'ground-spatial-fold' ? .17 : .055
      shell.current.opacity = THREE.MathUtils.damp(shell.current.opacity, isMaterialPhase(phase) ? opacity : 0, 7, delta)
    }
  })

  return <group ref={root} visible={false} name="home-ground-physical-material-bridge" userData={{ semanticOwner: 'ground-material-crossing', visualLanguage: 'soil-root-mineral-scanned-rock-no-portal', hapticCue: 'ground-crossing' }}>
    <mesh position={[0,-.34,-.42]} scale={[1.3,.72,1.45]} raycast={() => null}>
      <sphereGeometry args={[1,32,20]} />
      <meshPhysicalMaterial ref={shell} side={THREE.BackSide} color="#5b4d3d" roughness={.98} metalness={0} transparent opacity={.18} depthWrite={false} envMapIntensity={.12} />
    </mesh>
    <group position={[-1.05,-.58,-.68]} rotation={[.22,.72,-.12]} scale={[1.55,.8,1.25]} raycast={() => null}><primitive object={leftRock} /></group>
    <group position={[.92,-.52,-1.0]} rotation={[-.1,-.52,.08]} scale={[1.28,.68,1.45]} raycast={() => null}><primitive object={rightRock} /></group>
    {roots.map((geometry, index) => <mesh key={index} geometry={geometry} raycast={() => null} castShadow receiveShadow>
      <meshStandardMaterial color={index === 0 ? '#4a382b' : index === 1 ? '#594536' : '#3f3228'} roughness={.96} metalness={0} />
    </mesh>)}
    <mesh position={[-.48,-.18,-.18]} rotation={[.24,.4,.1]} scale={[.26,.16,.32]} raycast={() => null}><dodecahedronGeometry args={[1,1]} /><meshStandardMaterial color="#6b5d4c" roughness={.99} /></mesh>
    <mesh position={[.36,-.24,-.5]} rotation={[-.18,.72,-.22]} scale={[.19,.12,.24]} raycast={() => null}><dodecahedronGeometry args={[1,1]} /><meshStandardMaterial color="#81705a" roughness={.98} /></mesh>
    <mesh position={[.08,-.37,-1.15]} rotation={[.42,-.18,.3]} scale={[.32,.18,.28]} raycast={() => null}><dodecahedronGeometry args={[1,1]} /><meshStandardMaterial color="#51483f" roughness={1} /></mesh>
    <pointLight position={[0,.24,-1.5]} color="#baa88c" intensity={phase === 'ground-world-reveal' || phase === 'ground-arrival-handoff' ? .55 : .16} distance={5} decay={2} />
  </group>
}

useGLTF.preload(ROCK_01)
useGLTF.preload(ROCK_02)
