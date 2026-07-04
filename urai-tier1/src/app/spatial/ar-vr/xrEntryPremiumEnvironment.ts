import * as THREE from 'three'
import {
  createAtmosphere,
  createFloor,
  createSky,
} from './xrEntrySkyAndParticles'
import {
  addArrivalDais,
  addLighting,
  addSanctuaryArchitecture,
} from './xrEntrySanctuaryGeometry'
import {
  animateLivingOrb,
  createLivingOrb,
  type OrbParts,
} from './xrEntryLivingOrb'

export type PremiumEnvironment = OrbParts & {
  floor: THREE.Mesh
  sky: THREE.Mesh
  stars: THREE.Points
  motes: THREE.Points
  glowRings: THREE.Mesh[]
  accentLights: THREE.PointLight[]
}

export function buildPremiumEnvironment(
  scene: THREE.Scene,
  mobile: boolean,
): PremiumEnvironment {
  scene.background = new THREE.Color(0x071325)
  scene.fog = new THREE.Fog(0x10243a, 20, 92)

  const sky = createSky(mobile)
  const floor = createFloor(mobile)
  const atmosphere = createAtmosphere(mobile)

  scene.add(sky, floor, atmosphere.stars, atmosphere.motes)
  addLighting(scene, mobile)

  const glowRings = addArrivalDais(scene, mobile)
  const accentLights = addSanctuaryArchitecture(scene, mobile)
  const orbParts = createLivingOrb(scene, mobile)

  return {
    floor,
    sky,
    glowRings,
    accentLights,
    ...atmosphere,
    ...orbParts,
  }
}

export function animatePremiumEnvironment(
  environment: PremiumEnvironment,
  time: number,
  delta: number,
  mobile: boolean,
  reducedMotion: boolean,
) {
  const motion = reducedMotion ? 0.22 : 1
  const skyMaterial = environment.sky.material as THREE.ShaderMaterial
  skyMaterial.uniforms.uTime.value = time / 1000

  animateLivingOrb(environment, time, delta, reducedMotion)

  environment.glowRings.forEach((ring, index) => {
    const material = ring.material as THREE.MeshStandardMaterial
    material.emissiveIntensity =
      0.9 + Math.sin(time * 0.0012 + index * 0.9) * 0.22 * motion
  })

  environment.accentLights.forEach((light, index) => {
    light.intensity =
      (mobile ? 2.2 : 3.8) +
      Math.sin(time * 0.0008 + index) * 0.34 * motion
  })

  environment.motes.rotation.y += delta * 0.025 * motion
  environment.stars.rotation.y += delta * 0.0025 * motion
}
