#!/usr/bin/env node
import fs from 'node:fs'

const requiredHomeFiles = [
  'urai-tier1/src/app/page.tsx',
  'urai-tier1/src/app/home/page.tsx',
  'urai-tier1/src/spatial/layout/TierOneExperience.tsx',
  'urai-tier1/src/scene/HomeScene.tsx',
]

const optionalHomeFiles = [
  'src/app/page.tsx',
]

const homeFiles = [
  ...requiredHomeFiles,
  ...optionalHomeFiles.filter((file) => fs.existsSync(file)),
]

const failures = []

for (const file of requiredHomeFiles) {
  if (!fs.existsSync(file)) failures.push(`missing canonical home invariant file: ${file}`)
}

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

const homeSceneText = fs.existsSync('urai-tier1/src/scene/HomeScene.tsx') ? fs.readFileSync('urai-tier1/src/scene/HomeScene.tsx', 'utf8') : ''
if (homeSceneText) {
  const requiredHomeSilencePatterns = [
    /if \(mode === 'home'\) return null/,
    /const showOrb = sceneMode === 'focus' \|\| sceneMode === 'replay' \|\| sceneMode === 'mirror'/,
    /!isHomeMode \? <NarratorVoice[\s\S]{0,160}: null/,
    /!isHomeMode \? <NarratorHud \/> : null/,
    /!isHomeMode \? <CameraResetButton[\s\S]{0,160}: null/,
    /!isHomeMode \? <ModeGuidance[\s\S]{0,180}: null/,
    /event\.key\.toLowerCase\(\) === 'r' && !isHomeMode/,
  ]

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

if (failures.length > 0) {
  console.error('Tier-1 home invariant failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`Tier-1 home invariant passed for ${homeFiles.join(', ')}`)
