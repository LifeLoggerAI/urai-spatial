
import { useRef, useMemo } from 'react'
import * as THREE from 'three'
import { generateStructuredStars } from '../../engine/entities/star-data'
import { useIdentityStore } from '../../engine/state/identity-store'
import {
  registerStarPosition,
  clearStarRegistry,
} from '../../engine/state/star-registry'
import { Line } from '@react-three/drei'

export default function ConstellationLayer() {
  const stars = useMemo(() => generateStructuredStars(200), [])
  const meshRef = useRef<THREE.InstancedMesh>(null!)

  const activeNodeId = useIdentityStore((s) => s.activeNodeId)
  const setActiveNode = useIdentityStore((s) => s.setActiveNode)
  const transitionState = useIdentityStore((s) => s.transitionState)

  clearStarRegistry()

  useMemo(() => {
    stars.forEach((star) => {
      registerStarPosition(star.id, star.position)
    })
  }, [stars])

  useMemo(() => {
    if (!meshRef.current) return

    const temp = new THREE.Object3D()

    stars.forEach((star, i) => {
      const isActive = activeNodeId === star.id

      const scale = 0.1 + star.weight * 0.3
      const finalScale = isActive ? scale * 1.5 : scale

      temp.position.set(...star.position)
      temp.scale.set(finalScale, finalScale, finalScale)
      temp.updateMatrix()

      meshRef.current.setMatrixAt(i, temp.matrix)
    })

    meshRef.current.instanceMatrix.needsUpdate = true
  }, [stars, activeNodeId])

  return (
    <>
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, stars.length]}
        onClick={(e) => {
          if (transitionState === 'transitioning') return
          const id = stars[e.instanceId!].id
          setActiveNode(id)
        }}
      >
        <sphereGeometry args={[1, 16, 16]} />
        <meshStandardMaterial emissive="#ffffff" emissiveIntensity={2} />
      </instancedMesh>

      {stars.slice(0, stars.length - 1).map((star, i) => (
        <Line
          key={i}
          points={[star.position, stars[i + 1].position]}
          color="#5555ff"
          lineWidth={1}
        />
      ))}
    </>
  )
}
