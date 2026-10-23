'use client'
// Actual R3F scene evidence, only mounted in the development-only Home CC0 review.
// This does NOT imply real-pixel, founder, or production acceptance.
import { useFrame, useThree } from '@react-three/fiber'
import { useRef, type MutableRefObject } from 'react'
import { auditHomeCC0Scene } from './HomeCC0SceneAudit.mjs'

export function HomeCC0RuntimeEvidence({ yaw, pitch }: {
  yaw: MutableRefObject<number>
  pitch: MutableRefObject<number>
}) {
  const { scene, gl } = useThree()
  const frames = useRef(0)
  const bound = useRef(false)
  useFrame(() => {
    frames.current += 1
    if (frames.current % 15 !== 0 && frames.current !== 4) return
    const owner = gl.domElement.closest<HTMLElement>('[data-home-primary-owner="asset-driven"]')
    if (!owner) return
    owner.dataset.homeCc0ActualYaw = Number.isFinite(yaw.current) ? yaw.current.toFixed(6) : 'INVALID'
    owner.dataset.homeCc0ActualPitch = Number.isFinite(pitch.current) ? pitch.current.toFixed(6) : 'INVALID'
    owner.dataset.homeCc0SampledFrames = String(frames.current)
    if (bound.current) return
    const evidence = auditHomeCC0Scene(scene)
    owner.dataset.homeCc0PhotoGroundMeshes = String(evidence.groundMeshes)
    owner.dataset.homeCc0PhotoPathMeshes = String(evidence.pathMeshes)
    owner.dataset.homeCc0PhotoShrubMeshes = String(evidence.shrubMeshes)
    owner.dataset.homeCc0SceneBinding = evidence.sceneBound ? 'scene-bound-candidate' : 'incomplete'
    owner.dataset.homeCc0SceneReasons = evidence.reasons.join(',')
    if (evidence.sceneBound) bound.current = true
  })
  return null
}
