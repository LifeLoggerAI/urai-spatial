
import { useThree, useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useIdentityStore } from '../state/identity-store'
import { getStarPosition } from '../state/star-registry'

const LERP_SPEED = 3.5

export default function CameraController() {
  const { camera } = useThree()
  const {
    cameraMode,
    transitionState,
    transitionProgress,
    setTransitionProgress,
    setScene,
    endTransition,
    activeNodeId,
  } = useIdentityStore()

  const targetPosition = useRef(new THREE.Vector3(0, 0, 8))
  const targetLookAt = useRef(new THREE.Vector3(0, 0, 0))
  const currentLookAt = useRef(new THREE.Vector3(0, 0, 0))
  const hasSwitchedRef = useRef(false)

  useEffect(() => {
    camera.position.set(0, 0, 8)
    camera.lookAt(0, 0, 0)
  }, [camera])

  useEffect(() => {
    switch (cameraMode) {
      case 'idle':
        targetPosition.current.set(0, 0, 8)
        targetLookAt.current.set(0, 0, 0)
        break

      case 'explore':
        targetPosition.current.set(0, 1, 25)
        targetLookAt.current.set(0, 0, 0)
        break

      case 'focus':
        const starPosFocus = getStarPosition(activeNodeId)
        if (starPosFocus) {
          const [x, y, z] = starPosFocus
          targetPosition.current.set(x, y, z + 2)
          targetLookAt.current.set(x, y, z)
        }
        break
    }
  }, [cameraMode, activeNodeId])

  useFrame((_, delta) => {
    if (transitionState === 'transitioning') {
      const speed = 0.8
      const newProgress = Math.min(transitionProgress + delta * speed, 1)

      setTransitionProgress(newProgress)

      const starPos = getStarPosition(activeNodeId)
      if (starPos) {
        const [x, y, z] = starPos
        const arcHeight = 2
        const progress = newProgress

        const midX = x * 0.5
        const midY = y * 0.5 + arcHeight
        const midZ = z * 0.5

        const targetX =
          (1 - progress) * camera.position.x +
          progress * (progress < 0.5 ? midX : x)

        const targetY =
          (1 - progress) * camera.position.y +
          progress * (progress < 0.5 ? midY : y)

        const targetZ =
          (1 - progress) * camera.position.z +
          progress * (progress < 0.5 ? midZ : z + 2)

        targetPosition.current.set(targetX, targetY, targetZ)
      }

      if (newProgress >= 0.5 && !hasSwitchedRef.current) {
        setScene('replay')
        hasSwitchedRef.current = true
      }

      if (newProgress >= 1) {
        endTransition()
        setTransitionProgress(0)
        hasSwitchedRef.current = false
      }
    }

    const lerpAlpha = 1 - Math.exp(-LERP_SPEED * delta)
    camera.position.lerp(targetPosition.current, lerpAlpha)
    currentLookAt.current.lerp(targetLookAt.current, lerpAlpha)
    camera.lookAt(currentLookAt.current)
  })

  return null
}
