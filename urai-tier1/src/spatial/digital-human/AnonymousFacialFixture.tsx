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
  face: { cx: number; cy: number; rx: number; ry: number; visible: boolean; source: 'head_morphable-geometry-bounds' }
}
// All face-region measurements are derived from the actual GLB's named head mesh.
// Never use enlarged arbitrary probe radii that include unrelated moving Council background.
export default function AnonymousFacialFixture({media, muted, reducedMotion, freezeMorphs = false, onFrame}: {
  media: HTMLAudioElement | null
  muted: boolean
  reducedMotion: boolean
  freezeMorphs?: boolean
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
  const measuredHead = useMemo(() => {
    const candidate = instance.getObjectByName('head_morphable')
    if (!(candidate instanceof THREE.Mesh) || !(candidate.geometry instanceof THREE.BufferGeometry)) {
      throw new Error('anonymous-head-geometry-not-found')
    }
    candidate.geometry.computeBoundingBox()
    const bounds = candidate.geometry.boundingBox?.clone()
    if (!bounds || bounds.isEmpty()) throw new Error('anonymous-head-bounds-not-valid')
    return {mesh: candidate, bounds}
  }, [instance])
  const root = useRef<THREE.Group>(null)
  const lastReport = useRef(-1)
  const center = useMemo(() => new THREE.Vector3(), [])
  const left = useMemo(() => new THREE.Vector3(), [])
  const right = useMemo(() => new THREE.Vector3(), [])
  const top = useMemo(() => new THREE.Vector3(), [])
  const bottom = useMemo(() => new THREE.Vector3(), [])
  useEffect(() => () => { clearMorphs(instance) }, [instance])
  useFrame(({clock, camera, size}) => {
    const playing = !!media && !media.paused && !media.ended && !media.muted && !muted
    const time = media?.currentTime ?? 0
    const pose = calibrationPose(time, playing && !freezeMorphs, reducedMotion, muted, 'capture')
    const result = writeMorphs(instance, pose)
    if (!root.current || clock.elapsedTime - lastReport.current < .06) return
    root.current.updateWorldMatrix(true, true)
    const {min, max} = measuredHead.bounds
    const cx = (min.x + max.x) / 2
    const cy = (min.y + max.y) / 2
    const cz = (min.z + max.z) / 2
    const matrix = measuredHead.mesh.matrixWorld
    center.set(cx,cy,cz).applyMatrix4(matrix).project(camera)
    left.set(min.x,cy,cz).applyMatrix4(matrix).project(camera)
    right.set(max.x,cy,cz).applyMatrix4(matrix).project(camera)
    top.set(cx,max.y,cz).applyMatrix4(matrix).project(camera)
    bottom.set(cx,min.y,cz).applyMatrix4(matrix).project(camera)
    // The GLB generator defines head_morphable as an ellipsoid with actual
    // radii 0.235 x 0.294 x 0.211 m (in asset-local units). Its projected
    // vertex bounds are the principled face ROI, with NO arbitrary expansion.
    const rx = Math.abs(right.x - left.x) * size.width / 4
    const ry = Math.abs(top.y - bottom.y) * size.height / 4
    const face = {
      cx: (center.x + 1) * size.width / 2,
      cy: (1 - center.y) * size.height / 2,
      rx, ry,
      visible: center.z > -1 && center.z < 1 && Math.abs(center.x) < 1 && Math.abs(center.y) < 1 && rx >= 16 && ry >= 22,
      source: 'head_morphable-geometry-bounds' as const,
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
