#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'urai-tier1/src/spatial/layout/HomeWorldProductionFinal.tsx'
TEST = ROOT / 'urai-tier1/tests/home-relic-machine-realism-contract.test.mjs'

source = SOURCE.read_text()

# V48 deliberately ends the V40-V47 primitive sanctuary lineage. The reviewed/generated
# sanctuary GLB becomes the visible world owner; fallback proof geometry remains available
# elsewhere but is not exposed as the production Home composition.
source = re.sub(
    r"const SANCTUARY_REQUIRED_OBJECTS = \[.*?\] as const",
    """const SANCTUARY_REQUIRED_OBJECTS = [
  'home-authored-terrain', 'home-authored-embodied-self', 'home-orb-sanctuary',
  'home-ground-environmental-threshold', 'home-life-map-sky-lookout', 'home-life-map-physical-portal',
] as const""",
    source,
    count=1,
    flags=re.S,
)

source = source.replace("root.visible = false\n  root.userData.retainedForGovernedCompatibilityOnly = true\n  root.userData.visibleWorldOwner = 'home-built-sanctuary-envelope-v29'\n  root.userData.treatment = 'v29-compatibility-glb-provenance-only-no-visible-fantasy-shell'",
"root.visible = true\n  root.userData.governedProductionAsset = true\n  root.userData.visibleWorldOwner = 'home-entry-chamber-v1.glb'\n  root.userData.treatment = 'v48-governed-selected-sanctuary-visible-primary-world-owner'")

orb_replacement = r'''function cloneOrbModel(source: THREE.Object3D) {
  const root = cloneModel(source)
  root.visible = true
  root.traverse((object) => {
    const retiredDisplay = object.name === 'orb-aura' || object.name.startsWith('orb-orbit-') || object.name.startsWith('orb-petal-')
    if (retiredDisplay) {
      object.visible = false
      object.userData.uraiRetiredVisualRole = 'v48-retire-crystalline-petal-orbit-display-only'
      return
    }
    if (object.name === 'orb-core') {
      object.visible = true
      object.scale.multiplyScalar(0.86)
      object.userData.uraiIntegratedVisualRole = 'v48-governed-core-primary-engine-heart'
    }
    if (object.name === 'orb-heart') {
      object.visible = true
      object.scale.multiplyScalar(0.62)
      object.userData.uraiIntegratedVisualRole = 'v48-governed-heart-inside-core'
    }
    if (object.name.startsWith('orb-filament-')) {
      object.visible = true
      object.scale.multiplyScalar(0.32)
      object.userData.uraiIntegratedVisualRole = 'v48-governed-filament-contained-in-core'
    }
    if (!(object instanceof THREE.Mesh)) return
    const materials = Array.isArray(object.material) ? object.material : [object.material]
    for (const material of materials) {
      if (!(material instanceof THREE.MeshStandardMaterial)) continue
      material.color.lerp(new THREE.Color('#29413b'), 0.28)
      material.emissive.lerp(new THREE.Color('#74b9ad'), 0.22)
      material.emissiveIntensity = Math.min(Math.max(material.emissiveIntensity, 0.045), 0.24)
      material.roughness = Math.max(material.roughness, 0.48)
      material.metalness = Math.min(Math.max(material.metalness, 0.28), 0.68)
      material.envMapIntensity = Math.min(Math.max(material.envMapIntensity, 0.62), 0.9)
      material.needsUpdate = true
    }
  })
  root.userData.uraiTreatment = 'v48-governed-orb-core-heart-restored-no-crystalline-display'
  return root
}

function PouredStone'''
source, n = re.subn(r"function cloneOrbModel\(source: THREE\.Object3D\) \{.*?\n\}\n\nfunction PouredStone", orb_replacement, source, count=1, flags=re.S)
if n != 1:
    raise SystemExit('failed to replace cloneOrbModel')

# Remove the visible primitive court slab/plane. Keep the invisible navigation surface.
source, n = re.subn(
    r"(<primitive object=\{compatibilityModel\} />)\s*<mesh position=\{\[0,-0\.3,-1\.45\]\}.*?</mesh>\s*<mesh name=\"home-obsidian-walkable-terrain\".*?</mesh>\s*(<mesh name=\"home-walkable-navigation-surface\")",
    r"\1\n    \2",
    source,
    count=1,
    flags=re.S,
)
if n != 1:
    raise SystemExit('failed to remove visible primitive court')

# Make the selected Orb itself visible at meaningful scale. Remove the procedural plate assembly.
source = source.replace(
    "userData={{orbState:state,animation:sensory.animation,modelClip:ORB_CLIPS[state],runtimeAsset:ORB_MODEL,treatment:'v47-governed-authored-heart-filament-trace-captured-deep-in-machine-bay'}}>",
    "userData={{orbState:state,animation:sensory.animation,modelClip:ORB_CLIPS[state],runtimeAsset:ORB_MODEL,treatment:'v48-governed-orb-core-heart-visible-primary-reliquary-content'}}>",
)
source = source.replace(
    '<group scale={0.38} position={[0,.02,-2.7]} rotation={[0,.18,0]} name="home-orb-authored-core" userData={{treatment:\'v47-authored-heart-filament-trace-deep-behind-machined-aperture-no-crystal-display\'}}><primitive object={authoredOrb}/></group><MachineCoreAssembly/>',
    '<group scale={1.12} position={[0,-.12,0]} rotation={[0,.18,0]} name="home-orb-authored-core" userData={{treatment:\'v48-governed-orb-core-heart-restored-at-reliquary-scale\'}}><primitive object={authoredOrb}/></group>',
)
source = source.replace(
    "<group name=\"home-orb-engineered-body\" userData={{treatment:'v47-engineered-body-is-deep-architectural-machine-capture-no-display-object'}} />",
    "<group name=\"home-orb-engineered-body\" userData={{treatment:'v48-engineered-body-owned-by-governed-sanctuary-and-orb-assets'}} />",
)

# Remove the entire visible V47 hand-built sanctuary/cabinet/ceiling/platform lineage from the
# production scene. Keep governed GLB, environment lighting, restrained vegetation, transitions,
# avatar/navigation and the selected Orb.
old_scene = '<SanctuaryCourt target={props.target} /><SanctuaryArchitecture /><SanctuaryCeiling /><SanctuaryGlazing /><FloorPanelJoints /><ReflectingChannel x={-4.72} /><ReflectingChannel x={4.72} /><PlantedEdges reducedMotion={props.reducedMotion} /><AtmosphericDepth /><OrbPlatform /><OrbCradle /><SacredOrb state={props.orbState} reducedMotion={props.reducedMotion} onOpen={props.onOrb} />'
new_scene = '<SanctuaryCourt target={props.target} /><PlantedEdges reducedMotion={props.reducedMotion} /><AtmosphericDepth /><SacredOrb state={props.orbState} reducedMotion={props.reducedMotion} onOpen={props.onOrb} />'
if old_scene not in source:
    raise SystemExit('failed to find V47 scene composition')
source = source.replace(old_scene, new_scene, 1)

source = source.replace("data-home-visual-grade=\"cinematic-pbr-v47-sanctuary-depth\"", "data-home-visual-grade=\"cinematic-pbr-v48-governed-selected-assets\"")
source = source.replace("data-home-final-art-revision=\"v47-sanctuary-depth-production-candidate\"", "data-home-final-art-revision=\"v48-governed-selected-assets-production-candidate\"")
source = source.replace("data-home-art-certification=\"v47-retained-pixel-candidate\"", "data-home-art-certification=\"v48-retained-pixel-candidate\"")
source = source.replace("data-home-animation-owner=\"built-physical-sanctuary-v20-plus-cc0-fern-plus-authored-living-orb\"", "data-home-animation-owner=\"governed-home-entry-chamber-v1-plus-governed-orb-v1\"")
source = source.replace("gl.toneMappingExposure=2.05", "gl.toneMappingExposure=1.72")

SOURCE.write_text(source)

TEST.write_text(r'''import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../src/spatial/layout/HomeWorldProductionFinal.tsx', import.meta.url), 'utf8')
const sceneStart = source.indexOf('function SacredFinalScene(')
const sceneEnd = source.indexOf('export function HomeWorldProductionFinal', sceneStart)
const sceneSource = source.slice(sceneStart, sceneEnd)
const orbStart = source.indexOf('function SacredOrb(')
const orbEnd = source.indexOf('function HumanPresence', orbStart)
const orbSource = source.slice(orbStart, orbEnd)

test('V48 restores the governed selected sanctuary as visible production world owner', () => {
  assert.match(source,/v48-governed-selected-assets-production-candidate/)
  assert.match(source,/root\.visible = true/)
  assert.match(source,/visibleWorldOwner = 'home-entry-chamber-v1\.glb'/)
  assert.match(source,/v48-governed-selected-sanctuary-visible-primary-world-owner/)
  assert.match(source,/home-entry-chamber-v1\.glb/)
  assert.doesNotMatch(sceneSource,/<SanctuaryArchitecture \/>|<SanctuaryCeiling \/>|<SanctuaryGlazing \/>/)
})

test('V48 removes the visible primitive court and V47 cabinet/slab machine lineage from production composition', () => {
  assert.doesNotMatch(source,/name="home-obsidian-walkable-terrain"/)
  assert.doesNotMatch(sceneSource,/<OrbPlatform \/>|<OrbCradle \/>|<FloorPanelJoints \/>|<ReflectingChannel/)
  assert.doesNotMatch(sceneSource,/<SanctuarySideGallery\/>|<MachineCavityLiner\/>|<ContinuousVaultSkin/)
  assert.match(source,/home-walkable-navigation-surface/)
})

test('V48 restores governed Orb core and heart while retiring crystalline display families', () => {
  assert.match(source,/object\.name === 'orb-core'/)
  assert.match(source,/object\.scale\.multiplyScalar\(0\.86\)/)
  assert.match(source,/object\.scale\.multiplyScalar\(0\.62\)/)
  assert.match(source,/object\.scale\.multiplyScalar\(0\.32\)/)
  assert.match(source,/v48-governed-orb-core-heart-restored-no-crystalline-display/)
  assert.match(orbSource,/scale=\{1\.12\}/)
  assert.match(orbSource,/v48-governed-orb-core-heart-restored-at-reliquary-scale/)
  assert.doesNotMatch(orbSource,/MachineCoreAssembly/)
})

test('V48 keeps real PBR/HDR environment and does not encode a visual PASS in source', () => {
  assert.match(source,/rock-tile-floor-diff-1k\.webp/)
  assert.match(source,/studio-small-08-1k\.hdr/)
  assert.match(source,/gl\.toneMappingExposure=1\.72/)
  assert.match(source,/desiredFov=portrait\?64:54/)
  assert.doesNotMatch(source,/PRODUCTION CERTIFIED|retained-pixel-pass|visual-pass/)
})

test('embodied presence remains privacy-preserving',()=>{
  assert.match(source,/function HumanPresence/)
  assert.match(source,/visible=\{false\}/)
})
''')
