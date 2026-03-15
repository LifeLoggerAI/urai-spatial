"use client"

import { useEffect, useMemo, useRef } from "react"
import { useFrame, useLoader, useThree } from "@react-three/fiber"
import * as THREE from "three"

const STREAK_COUNT = 700
const FIELD_SIZE = 900
const HALF_FIELD = FIELD_SIZE * 0.5

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export default function HyperspaceStreaks() {
  const { camera } = useThree()

  const meshRef = useRef<THREE.InstancedMesh>(null!)
  const prevCameraPos = useRef(new THREE.Vector3())
  const initialized = useRef(false)

  const texture = useLoader(THREE.TextureLoader, "/star-sprite.png")

  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(0.6, 6)
    geo.translate(0, 3, 0)
    return geo
  }, [])

  const material = useMemo(() => {
    const tex = texture.clone()
    tex.wrapS = THREE.ClampToEdgeWrapping
    tex.wrapT = THREE.ClampToEdgeWrapping
    tex.colorSpace = THREE.SRGBColorSpace
    tex.needsUpdate = true

    return new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      toneMapped: false,
    })
  }, [texture])

  const offsets = useMemo(() => {
    const rng = mulberry32(9091)
    const list: THREE.Vector3[] = []

    for (let i = 0; i < STREAK_COUNT; i++) {
      list.push(
        new THREE.Vector3(
          (rng() - 0.5) * FIELD_SIZE,
          (rng() - 0.5) * FIELD_SIZE,
          (rng() - 0.5) * FIELD_SIZE
        )
      )
    }

    return list
  }, [])

  const dummy = useMemo(() => new THREE.Object3D(), [])
  const moveDir = useMemo(() => new THREE.Vector3(0, 1, 0), [])
  const worldPos = useMemo(() => new THREE.Vector3(), [])
  const tmpCam = useMemo(() => new THREE.Vector3(), [])

  useEffect(() => {
    prevCameraPos.current.copy(camera.position)
    initialized.current = true
  }, [camera])

  useEffect(() => {
    return () => {
      geometry.dispose()
      material.dispose()
      material.map?.dispose()
    }
  }, [geometry, material])

  useFrame((_, delta) => {
    const mesh = meshRef.current
    if (!mesh || !initialized.current) return

    const frameDelta = Math.max(delta, 1 / 240)

    const dx = camera.position.x - prevCameraPos.current.x
    const dy = camera.position.y - prevCameraPos.current.y
    const dz = camera.position.z - prevCameraPos.current.z

    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz)
    const speedPerSecond = distance / frameDelta
    const speed = THREE.MathUtils.clamp(speedPerSecond * 0.025, 0, 14)

    if (distance > 0.000001) {
      moveDir.set(dx, dy, dz).normalize()
    }

    mesh.visible = speed > 0.03

    tmpCam.copy(camera.position)

    for (let i = 0; i < offsets.length; i++) {
      const p = offsets[i]

      worldPos.set(
        p.x + tmpCam.x,
        p.y + tmpCam.y,
        p.z + tmpCam.z
      )

      if (p.x > HALF_FIELD) p.x -= FIELD_SIZE
      else if (p.x < -HALF_FIELD) p.x += FIELD_SIZE

      if (p.y > HALF_FIELD) p.y -= FIELD_SIZE
      else if (p.y < -HALF_FIELD) p.y += FIELD_SIZE

      if (p.z > HALF_FIELD) p.z -= FIELD_SIZE
      else if (p.z < -HALF_FIELD) p.z += FIELD_SIZE

      if (speed > 0.03) {
        p.addScaledVector(moveDir, -(0.6 + speed * 1.8))
      }

      if (p.x > HALF_FIELD) p.x -= FIELD_SIZE
      else if (p.x < -HALF_FIELD) p.x += FIELD_SIZE

      if (p.y > HALF_FIELD) p.y -= FIELD_SIZE
      else if (p.y < -HALF_FIELD) p.y += FIELD_SIZE

      if (p.z > HALF_FIELD) p.z -= FIELD_SIZE
      else if (p.z < -HALF_FIELD) p.z += FIELD_SIZE

      dummy.position.copy(worldPos)

      dummy.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        distance > 0.000001 ? moveDir : new THREE.Vector3(0, 1, 0)
      )

      const length = 1.2 + speed * 7.5
      const width = 0.12 + Math.min(speed * 0.025, 0.28)

      dummy.scale.set(width, length, 1)
      dummy.updateMatrix()

      mesh.setMatrixAt(i, dummy.matrix)
    }

    mesh.instanceMatrix.needsUpdate = true
    prevCameraPos.current.copy(camera.position)
  })

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, STREAK_COUNT]}
      frustumCulled={false}
    />
  )
}