'use client'

import { useAnimations, useGLTF } from '@react-three/drei'
import { type ThreeEvent, useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js'

export const HOME_AVATAR_MODEL = '/assets/urai/generated/human-makehuman-v4/home-human-makehuman-v4.glb'

export type HomeAvatarPresentationState = 'rest' | 'targeted' | 'embodying' | 'hidden-first-person' | 'returning'

type Props = {
  position?: readonly [number, number, number]
  rotationY?: number
  scale?: number
  state: HomeAvatarPresentationState
  reducedMotion: boolean
  onActivate: () => void
  onTargetChange?: (targeted: boolean) => void
}

function cloneAvatar(source: THREE.Object3D) {
  const root = cloneSkeleton(source)
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    object.castShadow = true
    object.receiveShadow = true
    const sourceIsArray = Array.isArray(object.material)
    const sourceMaterials = sourceIsArray ? object.material : [object.material]
    const clonedMaterials = sourceMaterials.map((material) => {
      const clone = material.clone()
      if (clone instanceof THREE.MeshStandardMaterial) {
        clone.roughness = Math.max(clone.roughness, 0.56)
        clone.metalness = Math.min(clone.metalness, 0.12)
        clone.envMapIntensity = THREE.MathUtils.clamp(clone.envMapIntensity || 0.6, 0.35, 0.9)
        clone.needsUpdate = true
      }
      return clone
    })
    object.material = sourceIsArray ? clonedMaterials : clonedMaterials[0]
  })
  root.name = 'urai-home-user-avatar-model'
  return root
}

export function HomeEmbodiedAvatar({
  position = [-1.85, 0.04, 0.15],
  rotationY = Math.PI - 0.14,
  scale = 0.72,
  state,
  reducedMotion,
  onActivate,
  onTargetChange,
}: Props) {
  const gltf = useGLTF(HOME_AVATAR_MODEL)
  const model = useMemo(() => cloneAvatar(gltf.scene), [gltf.scene])
  const { actions } = useAnimations(gltf.animations, model)
  const root = useRef<THREE.Group>(null)
  const targeted = state === 'targeted'
  const visible = state !== 'hidden-first-person' && state !== 'returning'

  useEffect(() => {
    const idle = actions.idle_breath
    if (!idle || reducedMotion || !visible) return
    idle.reset().setLoop(THREE.LoopRepeat, Infinity).fadeIn(.3).play()
    return () => { idle.fadeOut(.2); idle.stop() }
  }, [actions, reducedMotion, visible])

  useEffect(() => () => {
    Object.values(actions).forEach((action) => action?.stop())
    model.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return
      const materials = Array.isArray(object.material) ? object.material : [object.material]
      materials.forEach((material) => material.dispose())
    })
  }, [actions, model])

  useFrame(({ clock }, delta) => {
    const group = root.current
    if (!group || !visible) return
    const time = clock.elapsedTime
    const proceduralBreath = reducedMotion || actions.idle_breath ? 1 : 1 + Math.sin(time * 1.08) * 0.0045
    const attentionYaw = targeted ? -0.045 : 0
    const embodyScale = state === 'embodying' ? 1.006 : 1

    // Keep the Avatar physically present without turning the idle into NPC fidgeting.
    // Two slow, non-harmonic waves avoid an obvious short loop while staying below
    // perceptual "sway" levels. Reduced motion settles exactly onto the authored pose.
    const weightShift = reducedMotion
      ? 0
      : Math.sin(time * 0.31 + 0.42) * 0.0045 + Math.sin(time * 0.173 + 1.83) * 0.0025
    const microYaw = reducedMotion || targeted || state === 'embodying'
      ? 0
      : Math.sin(time * 0.227 + 0.77) * 0.0035
    const settleY = reducedMotion ? 0 : Math.sin(time * 0.19 + 2.1) * 0.0015

    group.position.x = THREE.MathUtils.damp(group.position.x, position[0] + weightShift, 4.2, delta)
    group.position.y = THREE.MathUtils.damp(group.position.y, position[1] + settleY, 4.2, delta)
    group.position.z = THREE.MathUtils.damp(group.position.z, position[2], 4.2, delta)
    group.scale.x = THREE.MathUtils.damp(group.scale.x, scale * embodyScale, 9, delta)
    group.scale.y = THREE.MathUtils.damp(group.scale.y, scale * proceduralBreath * embodyScale, 9, delta)
    group.scale.z = THREE.MathUtils.damp(group.scale.z, scale * embodyScale, 9, delta)
    group.rotation.y = THREE.MathUtils.damp(group.rotation.y, rotationY + attentionYaw + microYaw, 8, delta)
  })

  const activate = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    if (state === 'embodying' || state === 'returning' || state === 'hidden-first-person') return
    onActivate()
  }

  const enter = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    onTargetChange?.(true)
  }

  const leave = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    onTargetChange?.(false)
  }

  if (!visible) return null

  return (
    <group
      ref={root}
      name="urai-home-user-avatar"
      position={position as [number, number, number]}
      rotation={[0, rotationY, 0]}
      scale={scale}
      userData={{
        semanticOwner: 'avatar',
        embodiedAnchor: true,
        presentationState: state,
        runtimeAnimation: reducedMotion ? 'still-reduced-motion' : actions.idle_breath ? 'idle_breath-plus-restrained-micro-presence' : 'procedural-breath-plus-restrained-micro-presence',
        microPresence: reducedMotion ? 'settled' : 'non-harmonic-weight-shift',
        directDestination: false,
      }}
    >
      <primitive object={model} />
      <mesh
        name="urai-home-user-avatar-hit-volume"
        position={[0, 1.05, 0]}
        onClick={activate}
        onPointerEnter={enter}
        onPointerLeave={leave}
      >
        <capsuleGeometry args={[0.48, 1.55, 8, 16]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
      {targeted ? (
        <pointLight
          name="urai-home-avatar-target-response"
          position={[0, 1.45, 0.2]}
          intensity={0.1}
          distance={2.2}
          color="#d9e5df"
        />
      ) : null}
    </group>
  )
}

useGLTF.preload(HOME_AVATAR_MODEL)