'use client'

// Deliberately separate from shipped Replay. This developer-only view uses
// original source-controlled GLB bytes inside the REAL disclosed demo scene;
// it can never authenticate/authorize a user's remembered environment.
import { useEffect, useMemo, useState } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

export const REPLAY_CANDIDATE_ASSET_ID = 'replay-memory-environment-v1' as const
export const REPLAY_CANDIDATE_ASSET_URL = '/assets/urai/generated/models/replay-memory-environment-v1.glb'

export const CAN_PREVIEW_REPLAY_CANDIDATE =
  process.env.NODE_ENV === 'development' &&
  process.env.NEXT_PUBLIC_URAI_PREVIEW_MODE === 'true' &&
  process.env.NEXT_PUBLIC_URAI_CANDIDATE_WORLD_REVIEW === 'true'

export function useReplayDevelopmentCandidate(): boolean {
  const [requested, setRequested] = useState(false)
  useEffect(() => {
    if (!CAN_PREVIEW_REPLAY_CANDIDATE) return
    setRequested(new URLSearchParams(window.location.search).get('candidateWorld') === 'replay')
  }, [])
  return CAN_PREVIEW_REPLAY_CANDIDATE && requested
}

// The review camera is at z=7.25. Bring the source model into a useful
// world-scale view without modifying the GLB or granting collision authority.
export const REPLAY_REVIEW_WORLD_Z = -11
export default function DevReplayCandidateWorld({ groundHeight }: {
  groundHeight: (x: number, z: number) => number
}) {
  const gltf = useGLTF(REPLAY_CANDIDATE_ASSET_URL)
  const details = useMemo(() => {
    const scene = gltf.scene.clone(true)
    scene.updateMatrixWorld(true)
    const bounds = new THREE.Box3().setFromObject(scene)
    if (bounds.isEmpty()) throw new Error('Replay preview GLB has no physical model geometry')
    const center = bounds.getCenter(new THREE.Vector3())
    const size = bounds.getSize(new THREE.Vector3())
    const span = Math.max(size.x, size.y, size.z)
    if (!Number.isFinite(span) || span <= 0) throw new Error('Replay preview GLB has invalid dimensions')
    let meshCount = 0, triangleCount = 0
    scene.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) return
      meshCount += 1
      const geom = node.geometry
      const index = geom.getIndex(), positions = geom.getAttribute('position')
      triangleCount += Math.floor((index?.count ?? positions?.count ?? 0) / 3)
      node.castShadow = true
      node.receiveShadow = true
      // Preview collision/interactivity is disabled: governed Demo Replay
      // navigation, UI and return controls must retain ownership.
      node.raycast = () => {}
    })
    if (!meshCount || !triangleCount) throw new Error('Replay preview GLB has no measurable triangles')
    const scale = Math.min(4, Math.max(0.01, 26 / span))
    const cameraClearance = 7.25 - (REPLAY_REVIEW_WORLD_Z + size.z * scale * 0.5)
    if (!Number.isFinite(cameraClearance) || cameraClearance < 2.5) {
      throw new Error('Replay candidate review would intersect the camera')
    }
    return { scene, center, groundY: bounds.min.y, scale, meshCount, triangleCount,
      bounds: size.toArray(), cameraClearance, projectedDepth: size.z * scale / (7.25 - REPLAY_REVIEW_WORLD_Z) }
  }, [gltf.scene])
  const physicalGround = groundHeight(0, REPLAY_REVIEW_WORLD_Z)
  useEffect(() => {
    const main = document.querySelector<HTMLElement>('main.replayWorld[data-memory-status="demo"]')
    if (!main) return
    main.dataset.replayCandidateModel = REPLAY_CANDIDATE_ASSET_ID
    main.dataset.replayCandidateTriangleCount = String(details.triangleCount)
    main.dataset.replayCandidateMeshCount = String(details.meshCount)
    main.dataset.replayCandidateAdmission = 'unadmitted-development-only'
    main.dataset.replayCandidateCameraClearance = String(details.cameraClearance)
    main.dataset.replayCandidateProjectedDepth = String(details.projectedDepth)
    main.dataset.replayCandidateGroundY = String(physicalGround)
    main.dataset.replayCandidateScale = String(details.scale)
    return () => {
      delete main.dataset.replayCandidateModel
      delete main.dataset.replayCandidateTriangleCount
      delete main.dataset.replayCandidateMeshCount
      delete main.dataset.replayCandidateAdmission
      delete main.dataset.replayCandidateCameraClearance
      delete main.dataset.replayCandidateProjectedDepth
      delete main.dataset.replayCandidateGroundY
      delete main.dataset.replayCandidateScale
    }
  }, [details, physicalGround])
  return <group name="replay-unadmitted-development-candidate"
    userData={{ source: REPLAY_CANDIDATE_ASSET_ID, admission: false,
      privateReconstruction: false, collisionAuthority: false, previewOnly: true }}
    position={[0, physicalGround, REPLAY_REVIEW_WORLD_Z]} scale={details.scale}>
    <pointLight position={[0, 4.8, 5]} intensity={5.2} distance={25} color="#f4ead9" />
    <primitive object={details.scene}
      position={[-details.center.x, -details.groundY, -details.center.z]} />
  </group>
}
