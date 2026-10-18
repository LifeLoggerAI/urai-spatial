'use client'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { calibrationPose, writeMorphs, clearMorphs } from './anonymousCalibration.mjs'

// Development fixture only: no personal reference inputs, speaker, likeness, or conversation provider.
export type AnonymousRenderFrame = {
  time: number
  max: number
  written: number
  playing: boolean
  geometryX: number
  modelReady: boolean
  face: { cx: number; cy: number; rx: number; ry: number; visible: boolean }
}
const ORIGIN = new THREE.Vector3(0, 1.63, 0)
const TOP = new THREE.Vector3(0, 2.03, 0)
const RIGHT = new THREE.Vector3(.36, 1.63, 0)
export default function AnonymousFacialFixture({media, muted, reducedMotion, onFrame}: {
  media: HTMLAudioElement | null
  muted: boolean
  reducedMotion: boolean
  onFrame: (frame: AnonymousRenderFrame) => void
}) {
  const gltf = useGLTF('/__digital-human-dev/anonymous-face-morph-v1.glb')
  // Original cached GLTF scene and cloned instance must never own the same morph arrays.
  const instance = useMemo(() => {
    const result = cloneSkeleton(gltf.scene)
    const originalBuffers = new Set<unknown>()
    gltf.scene.traverse((node) => {
      if (node instanceof THREE.Mesh && node.morphTargetInfluences?.length) {
        originalBuffers.add(node.morphTargetInfluences)
      }
    })
    let morphable = 0
    result.traverse((node) => {
      if (!(node instanceof THREE.Mesh) || !node.morphTargetInfluences?.length) return
      if (originalBuffers.has(node.morphTargetInfluences)) throw new Error('shared-facial-morph-buffer')
      morphable++
    })
    if (morphable < 6) throw new Error('anonymous-facial-asset-missing-morphs')
    return result
  }, [gltf.scene])
  const root = useRef<THREE.Group>(null)
  const lastReport = useRef(-1)
  const center = useMemo(() => new THREE.Vector3(), [])
  const right = useMemo(() => new THREE.Vector3(), [])
  const top = useMemo(() => new THREE.Vector3(), [])
  useEffect(() => () => { clearMorphs(instance) }, [instance])
  useFrame(({clock, camera, size}) => {
    const playing = !!media && !media.paused && !media.ended && !media.muted && !muted
    const time = media?.currentTime ?? 0
    const pose = calibrationPose(time, playing, reducedMotion, muted)
    const result = writeMorphs(instance, pose)
    if (!root.current || clock.elapsedTime - lastReport.current < .06) return
    root.current.updateWorldMatrix(true, true)
    center.copy(ORIGIN).applyMatrix4(root.current.matrixWorld).project(camera)
    top.copy(TOP).applyMatrix4(root.current.matrixWorld).project(camera)
    right.copy(RIGHT).applyMatrix4(root.current.matrixWorld).project(camera)
    const face = {
      cx: (center.x + 1) * size.width / 2,
      cy: (1 - center.y) * size.height / 2,
      rx: Math.max(16, Math.abs(right.x - center.x) * size.width / 2 * 1.15),
      ry: Math.max(22, Math.abs(top.y - center.y) * size.height / 2 * 1.22),
      visible: center.z > -1 && center.z < 1 && Math.abs(center.x) < 1 && Math.abs(center.y) < 1,
    }
    lastReport.current = clock.elapsedTime
    onFrame({time, max:result.max, written:result.written, playing, geometryX:pose.jawOpen, modelReady:true, face})
  })
  // A deliberately oversized lab bust is placed in view of the original Council camera.
  // The character is plainly labelled anonymous, remains outside all Council identities,
  // and is NEVER mounted except behind the two existing development gates.
  return <group ref={root} position={[.3,-.82,1.45]} scale={1.5}
    userData={{representation:'anonymous-technical-facial-fixture-not-founder',approvedIdentity:false}}>
    <primitive object={instance} />
  </group>
}
