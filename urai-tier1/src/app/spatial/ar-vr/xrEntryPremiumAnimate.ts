import * as THREE from 'three'
import { animateLivingOrb } from './xrEntryLivingOrb'
import type { PremiumEnvironment } from './xrEntryPremiumTypes'

export function animatePremiumEnvironment(environment: PremiumEnvironment, time: number, delta: number, mobile: boolean, reducedMotion: boolean) {
  const motion = reducedMotion ? 0.22 : 1
  const skyMaterial = environment.sky.material as THREE.ShaderMaterial
  skyMaterial.uniforms.uTime.value = time / 1000
  animateLivingOrb(environment, time, delta, reducedMotion)
  environment.glowRings.forEach((ring, index) => {
    const material = ring.material as THREE.MeshStandardMaterial
    material.emissiveIntensity = 0.9 + Math.sin(time * 0.0012 + index * 0.9) * 0.22 * motion
  })
  environment.accentLights.forEach((light, index) => {
    light.intensity = (mobile ? 2.2 : 3.8) + Math.sin(time * 0.0008 + index) * 0.34 * motion
  })
  environment.motes.rotation.y += delta * 0.025 * motion
  environment.stars.rotation.y += delta * 0.0025 * motion
}
