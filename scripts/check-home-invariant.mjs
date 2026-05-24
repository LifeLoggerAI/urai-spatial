#!/usr/bin/env node
import fs from 'node:fs'

const requiredHomeFiles = [
  'urai-tier1/src/app/page.tsx',
  'urai-tier1/src/app/home/page.tsx',
  'urai-tier1/src/spatial/layout/TierOneExperience.tsx',
  'urai-tier1/src/scene/HomeScene.tsx',
  'urai-tier1/src/scene/SpatialVisualOverlayPremium.tsx',
]

const optionalHomeFiles = [
  'src/app/page.tsx',
]

const homeFiles = [
  ...requiredHomeFiles,
  ...optionalHomeFiles.filter((file) => fs.existsSync(file)),
]

const failures = []

function read(file) {
  if (!fs.existsSync(file)) {
    failures.push(`missing canonical home invariant file: ${file}`)
    return ''
  }
  return fs.readFileSync(file, 'utf8')
}

for (const file of requiredHomeFiles) read(file)

const rootRouteText = fs.existsSync('urai-tier1/src/app/page.tsx') ? fs.readFileSync('urai-tier1/src/app/page.tsx', 'utf8') : ''
if (rootRouteText && (!rootRouteText.includes('TierOneExperience') || !rootRouteText.includes('mode="home"'))) {
  failures.push('urai-tier1/src/app/page.tsx must route through TierOneExperience mode="home"')
}
if (rootRouteText.includes('SpatialHomeShell')) {
  failures.push('urai-tier1/src/app/page.tsx must not route through legacy SpatialHomeShell')
}

const forbiddenPatterns = [
  /FirstLightExperience/i,
  /SpatialHomeShell/i,
  /CompanionCard/i,
  /CanonicalTierLockHud/i,
  /loading\s+urai\s+spatial/i,
]

for (const file of homeFiles) {
  if (!fs.existsSync(file)) continue
  const text = fs.readFileSync(file, 'utf8')
  for (const pattern of forbiddenPatterns) {
    if (pattern.test(text)) {
      failures.push(`Tier-1 home invariant violation in ${file}: ${pattern}`)
    }
  }
}

function hasSilentOrbGuard(homeSceneText) {
  const match = homeSceneText.match(/const showOrb = ([^\n]+)/)
  if (!match) return false

  const expression = match[1]
  return ['focus', 'replay', 'unwind', 'mirror'].every((mode) => expression.includes(`sceneMode === '${mode}'`)) && !expression.includes('home')
}

const homeSceneText = read('urai-tier1/src/scene/HomeScene.tsx')
const overlayText = read('urai-tier1/src/scene/SpatialVisualOverlayPremium.tsx')

if (homeSceneText) {
  const requiredHomeSilencePatterns = [
    /if \(mode === 'home'\) return null/,
    /!isHomeMode \? <NarratorVoice[\s\S]{0,160}: null/,
    /!isHomeMode \? <NarratorHud \/> : null/,
    /!isHomeMode \? <CameraResetButton[\s\S]{0,160}: null/,
    /!isHomeMode \? <ModeGuidance[\s\S]{0,180}: null/,
    /event\.key\.toLowerCase\(\) === 'r' && !isHomeMode/,
  ]

  if (!hasSilentOrbGuard(homeSceneText)) {
    failures.push('Tier-1 home scene is missing required silent-home orb guard for focus/replay/unwind/mirror only')
  }

  for (const pattern of requiredHomeSilencePatterns) {
    if (!pattern.test(homeSceneText)) {
      failures.push(`Tier-1 home scene is missing required silent-home guard: ${pattern}`)
    }
  }

  const forbiddenHomeOverlayPatterns = [
    /if \(mode === 'home'\) \{[\s\S]{0,800}<div className="urai-spatial-guidance/i,
    /if \(sceneMode === 'home'\) \{[\s\S]{0,800}<div className="urai-spatial-guidance/i,
    /(?<!!)isHomeMode \? <ModeGuidance/i,
    /data-testid="urai-sky-click-target"/i,
    /const showOrb = isHomeMode/i,
  ]

  for (const pattern of forbiddenHomeOverlayPatterns) {
    if (pattern.test(homeSceneText)) {
      failures.push(`Tier-1 home scene still exposes visible or narrated home UI: ${pattern}`)
    }
  }
}

if (overlayText) {
  const requiredSilentHomeVisuals = [
    'function HomeOverlay()',
    'className="urai-starfield"',
    'className="urai-home-sky-layer"',
    'className="urai-home-atmosphere"',
    'className="urai-home-ground"',
    'className="urai-home-ground-reflection"',
    'className="urai-home-ground-vignette"',
    'data-testid="urai-home-orb"',
    'data-testid="urai-home-body-avatar"',
    'data-testid="urai-home-lifemap-preview"',
  ]

  for (const snippet of requiredSilentHomeVisuals) {
    if (!overlayText.includes(snippet)) failures.push(`Home overlay missing required silent visual layer: ${snippet}`)
  }

  const homeOverlayMatch = overlayText.match(/function HomeOverlay\(\) \{[\s\S]*?\n\}/)
  const homeOverlayBody = homeOverlayMatch?.[0] ?? ''
  if (!homeOverlayBody) failures.push('Home overlay function could not be found for invariant scan')

  const forbiddenVisibleHomeUi = [
    /<button\b/i,
    /<a\b/i,
    /<nav\b/i,
    /<strong\b/i,
    /<span\b/i,
    /<h[1-6]\b/i,
    /<p\b/i,
    /Inner Weather/i,
    /Home awake/i,
    /Begin the ascent/i,
    /Your companion is listening/i,
    /Spatial orientation/i,
    /SceneStatus/i,
    /CompassButton/i,
    /InnerWeatherCard/i,
  ]

  for (const pattern of forbiddenVisibleHomeUi) {
    if (pattern.test(homeOverlayBody)) failures.push(`Home overlay contains visible UI/text/button/nav: ${pattern}`)
  }
}

if (failures.length > 0) {
  console.error('Tier-1 home invariant failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`Tier-1 home invariant passed for ${homeFiles.join(', ')}`)
