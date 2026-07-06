import * as THREE from 'three'
import {
  DAIS_Z,
  premiumMaterial,
} from './xrEntrySkyAndParticles'

export type OrbParts = {
  orb: THREE.Group
  orbCore: THREE.Mesh
  orbShell: THREE.Mesh
  orbRings: THREE.Mesh[]
}

export function createLivingOrb(
  scene: THREE.Scene,
  mobile: boolean,
): OrbParts {
  const orb = new THREE.Group()
  orb.position.set(0, 2.55, DAIS_Z)
  orb.userData.baseY = orb.position.y

  const orbCore = new THREE.Mesh(
    new THREE.IcosahedronGeometry(
      0.67,
      mobile ? 3 : 5,
    ),
    premiumMaterial(
      0xddfbff,
      0x5ce7ff,
      2.9,
      0.1,
      0.06,
    ),
  )
  orbCore.castShadow = true

  const orbShell = new THREE.Mesh(
    new THREE.SphereGeometry(
      0.84,
      mobile ? 24 : 36,
      20,
    ),
    new THREE.MeshBasicMaterial({
      color: 0xbef8ff,
      transparent: true,
      opacity: 0.14,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  )

  orb.add(orbCore, orbShell)

  const ringMaterial =
    new THREE.MeshBasicMaterial({
      color: 0x9cf5ff,
      transparent: true,
      opacity: 0.74,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })

  const orbRings: THREE.Mesh[] = []
  const ringSpecs = [
    [1.08, Math.PI / 2.65, 1],
    [1.29, Math.PI / 2.25, 0.72],
    [0.95, Math.PI / 1.85, 1.18],
  ] as const

  ringSpecs.forEach(
    ([radius, tilt, scaleY], index) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(
          radius,
          index === 1 ? 0.018 : 0.027,
          8,
          mobile ? 64 : 96,
        ),
        ringMaterial.clone(),
      )
      ring.rotation.x = tilt
      ring.scale.y = scaleY
      orbRings.push(ring)
      orb.add(ring)
    },
  )

  scene.add(orb)
  return {
    orb,
    orbCore,
    orbShell,
    orbRings,
  }
}

export function animateLivingOrb(
  parts: OrbParts,
  time: number,
  delta: number,
  reducedMotion: boolean,
) {
  const motion = reducedMotion ? 0.22 : 1

  parts.orb.position.y =
    (parts.orb.userData.baseY as number) +
    Math.sin(time * 0.00135) *
      0.12 *
      motion

  parts.orbCore.rotation.y +=
    delta * 0.34 * motion
  parts.orbCore.rotation.x +=
    delta * 0.08 * motion

  parts.orbShell.scale.setScalar(
    1 +
      Math.sin(time * 0.0017) *
        0.035 *
        motion,
  )

  parts.orbRings.forEach(
    (ring, index) => {
      ring.rotation.z +=
        delta *
        (0.12 + index * 0.07) *
        motion
      ring.rotation.y +=
        delta *
        (index % 2 === 0
          ? 0.08
          : -0.06) *
        motion
    },
  )
}
