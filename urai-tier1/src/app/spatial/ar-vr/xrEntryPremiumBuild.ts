import * as THREE from 'three'
import { createAtmosphere, createFloor, createSky } from './xrEntrySkyAndParticles'
import { addArrivalDais, addLighting, addSanctuaryArchitecture } from './xrEntrySanctuaryGeometry'
import { createLivingOrb } from './xrEntryLivingOrb'
import { isolateAnimatedMaterials } from './xrEntryRingMaterialIsolation'
import type { PremiumEnvironment } from './xrEntryPremiumTypes'

export function buildPremiumEnvironment(scene: THREE.Scene, mobile: boolean): PremiumEnvironment {
  scene.background = new THREE.Color(0x071325)
  scene.fog = new THREE.Fog(0x10243a, 20, 92)
  const sky = createSky(mobile)
  const floor = createFloor(mobile)
  const atmosphere = createAtmosphere(mobile)
  scene.add(sky, floor, atmosphere.stars, atmosphere.motes)
  addLighting(scene, mobile)
  const glowRings = addArrivalDais(scene, mobile)
  isolateAnimatedMaterials(glowRings)
  const accentLights = addSanctuaryArchitecture(scene, mobile)
  const orbParts = createLivingOrb(scene, mobile)
  return { floor, sky, glowRings, accentLights, ...atmosphere, ...orbParts }
}
