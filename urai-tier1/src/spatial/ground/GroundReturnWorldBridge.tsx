'use client'

import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js'
import { GROUND_EYE_HEIGHT_M, GROUND_LANDSCAPE_FOV_DEG } from './groundCanon'
import {
  GROUND_REDUCED_RETURN_ROUTE_HANDOFF_MS,
  GROUND_RETURN_ROUTE_HANDOFF_MS,
  groundReturnPhaseAt,
  type GroundReturnPhase,
} from './groundTransitionTimeline'
import { URAI_WORLD_RETURN_EVENT } from '@/spatial/world/worldEvents'

const ROCK_01 = '/assets/urai/home-production/cc0/polyhaven-v48/rock_face_01/asset.gltf'
const ROCK_02 = '/assets/urai/home-production/cc0/polyhaven-v48/rock_face_02/asset.gltf'
const RETURN_X = 0
const RETURN_Z = 6

function cloneRock(source: THREE.Object3D) {
  const copy = cloneSkeleton(source)
  copy.updateMatrixWorld(true)
  const bounds = new THREE.Box3().setFromObject(copy)
  const size = bounds.getSize(new THREE.Vector3())
  const center = bounds.getCenter(new THREE.Vector3())
  const scale = 1 / Math.max(size.x, size.y, size.z, .001)
  copy.scale.setScalar(scale)
  copy.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale)
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

function phaseProgress(elapsed: number, start: number, end: number) {
  if (elapsed <= start) return 0
  if (elapsed >= end) return 1
  return THREE.MathUtils.smoothstep((elapsed - start) / (end - start), 0, 1)
}

export function GroundReturnWorldBridge({ groundHeight, reducedMotion }: { groundHeight: (x: number, z: number) => number; reducedMotion: boolean }) {
  const { camera, scene } = useThree()
  const group = useRef<THREE.Group>(null)
  const shell = useRef<THREE.MeshPhysicalMaterial>(null)
  const active = useRef(false)
  const elapsedMs = useRef(0)
  const start = useRef(new THREE.Vector3())
  const currentPhase = useRef<GroundReturnPhase>('home-idle-restored')
  const target = useRef(new THREE.Vector3())
  const look = useRef(new THREE.Vector3())
  const rock01 = useGLTF(ROCK_01)
  const rock02 = useGLTF(ROCK_02)
  const leftRock = useMemo(() => cloneRock(rock01.scene), [rock01.scene])
  const rightRock = useMemo(() => cloneRock(rock02.scene), [rock02.scene])

  useEffect(() => () => {
    disposeRock(leftRock)
    disposeRock(rightRock)
  }, [leftRock, rightRock])

  useEffect(() => {
    const onReturn = () => {
      active.current = true
      elapsedMs.current = 0
      start.current.copy(camera.position)
      currentPhase.current = 'ground-return-commit'
      const root = document.querySelector<HTMLElement>('[data-testid="urai-ground-lived-world"]')
      if (root) {
        root.dataset.groundReturnPhase = 'ground-return-commit'
        root.dataset.groundInputLocked = 'true'
      }
    }
    window.addEventListener(URAI_WORLD_RETURN_EVENT, onReturn)
    return () => window.removeEventListener(URAI_WORLD_RETURN_EVENT, onReturn)
  }, [camera])

  useFrame((_, delta) => {
    const root = document.querySelector<HTMLElement>('[data-testid="urai-ground-lived-world"]')
    if (!active.current) {
      if (group.current) group.current.visible = false
      return
    }

    const handoff = reducedMotion ? GROUND_REDUCED_RETURN_ROUTE_HANDOFF_MS : GROUND_RETURN_ROUTE_HANDOFF_MS
    elapsedMs.current = Math.min(handoff, elapsedMs.current + Math.min(delta, .08) * 1000)
    const phase = groundReturnPhaseAt(elapsedMs.current, reducedMotion)
    currentPhase.current = phase
    if (root) {
      root.dataset.groundReturnPhase = phase
      root.dataset.groundReturnProgress = Math.min(1, elapsedMs.current / handoff).toFixed(3)
      root.dataset.groundInputLocked = 'true'
    }

    const surfaceY = groundHeight(RETURN_X, RETURN_Z)
    const arrivalEye = new THREE.Vector3(RETURN_X, surfaceY + GROUND_EYE_HEIGHT_M, RETURN_Z)
    const geologicalApproach = new THREE.Vector3(RETURN_X, surfaceY + .7, RETURN_Z + .18)
    const surfaceCommit = new THREE.Vector3(RETURN_X, surfaceY + .18, RETURN_Z + .22)
    const compressionEnd = reducedMotion ? 155 : 720
    const geologyEnd = reducedMotion ? 255 : 1320

    if (elapsedMs.current <= compressionEnd) {
      camera.position.lerpVectors(start.current, arrivalEye, phaseProgress(elapsedMs.current, 0, compressionEnd))
    } else if (elapsedMs.current <= geologyEnd) {
      camera.position.lerpVectors(arrivalEye, geologicalApproach, phaseProgress(elapsedMs.current, compressionEnd, geologyEnd))
    } else {
      camera.position.lerpVectors(geologicalApproach, surfaceCommit, phaseProgress(elapsedMs.current, geologyEnd, handoff))
    }
    look.current.set(RETURN_X, surfaceY - .12, RETURN_Z - .65)
    camera.lookAt(look.current)
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = THREE.MathUtils.damp(camera.fov, GROUND_LANDSCAPE_FOV_DEG, 8, delta)
      camera.updateProjectionMatrix()
    }

    const materialActive = phase === 'ground-return-geology' || phase === 'ground-return-surface-crossing'
    if (group.current) {
      group.current.visible = materialActive
      group.current.position.set(RETURN_X, surfaceY, RETURN_Z)
      const scale = phase === 'ground-return-surface-crossing' ? 1.18 : .92
      group.current.scale.lerp(new THREE.Vector3(scale, scale, scale), 1 - Math.pow(.002, delta))
    }
    if (shell.current) {
      shell.current.opacity = THREE.MathUtils.damp(shell.current.opacity, phase === 'ground-return-surface-crossing' ? .28 : materialActive ? .16 : 0, 7, delta)
    }
    if (scene.fog instanceof THREE.FogExp2) {
      const color = materialActive ? new THREE.Color('#51483d') : new THREE.Color('#7d9388')
      scene.fog.color.lerp(color, 1 - Math.pow(.002, delta))
      scene.fog.density = THREE.MathUtils.damp(scene.fog.density, materialActive ? .062 : .018, 6, delta)
    }
  })

  return <group ref={group} visible={false} name="ground-return-physical-material-bridge" userData={{ semanticOwner: 'ground-return-material', routeHandoff: 'surface-crossing-to-home-avatar-eye' }}>
    <mesh position={[0,-.38,-.42]} scale={[1.22,.68,1.38]} raycast={() => null}>
      <sphereGeometry args={[1,28,18]} />
      <meshPhysicalMaterial ref={shell} side={THREE.BackSide} color="#594b3c" roughness={.99} transparent opacity={.16} depthWrite={false} />
    </mesh>
    <group position={[-.98,-.55,-.7]} rotation={[.18,.66,-.1]} scale={[1.45,.72,1.22]} raycast={() => null}><primitive object={leftRock} /></group>
    <group position={[.88,-.5,-.95]} rotation={[-.12,-.5,.12]} scale={[1.22,.66,1.38]} raycast={() => null}><primitive object={rightRock} /></group>
    <mesh position={[-.34,-.18,-.18]} rotation={[.18,.4,.12]} scale={[.22,.14,.29]} raycast={() => null}><dodecahedronGeometry args={[1,1]} /><meshStandardMaterial color="#6a5b49" roughness={1} /></mesh>
    <mesh position={[.38,-.24,-.52]} rotation={[-.2,.68,-.18]} scale={[.18,.12,.24]} raycast={() => null}><dodecahedronGeometry args={[1,1]} /><meshStandardMaterial color="#7c6d58" roughness={.99} /></mesh>
  </group>
}

useGLTF.preload(ROCK_01)
useGLTF.preload(ROCK_02)
