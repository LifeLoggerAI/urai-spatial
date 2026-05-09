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

function requireHomeSceneGuard(description, passes) {
  if (!passes) failures.push(`Tier-1 home scene is missing required silent-home guard: ${description}`)
}

const homeSceneText = fs.existsSync('urai-tier1/src/scene/HomeScene.tsx') ? fs.readFileSync('urai-tier1/src/scene/HomeScene.tsx', 'utf8') : ''
if (homeSceneText) {
  requireHomeSceneGuard(
    "ModeGuidance returns null for mode === 'home'",
    /if \(mode === 'home'\) return null/.test(homeSceneText),
  )

  const showOrbDeclaration = homeSceneText.match(/const showOrb\s*=\s*([^\n;]+)/)?.[1] ?? ''
  requireHomeSceneGuard(
    'showOrb exists and does not include home mode',
    Boolean(showOrbDeclaration) && !/isHomeMode|sceneMode\s*===\s*['"]home['"]/.test(showOrbDeclaration),
  )

  requireHomeSceneGuard(
    'NarratorVoice is guarded away from home mode',
    /!isHomeMode\s*\?\s*<NarratorVoice[\s\S]{0,220}:\s*null/.test(homeSceneText),
  )

  requireHomeSceneGuard(
    'CameraResetButton is guarded away from home mode',
    /!isHomeMode\s*\?\s*<CameraResetButton[\s\S]{0,220}:\s*null/.test(homeSceneText),
  )

  requireHomeSceneGuard(
    'ModeGuidance is guarded away from home mode',
    /!isHomeMode\s*\?\s*(?:\([\s\S]{0,120})?<ModeGuidance[\s\S]{0,520}:\s*null/.test(homeSceneText) ||
      (/const showLifeMapHud\s*=\s*!isHomeMode/.test(homeSceneText) && /showLifeMapHud\s*&&[\s\S]{0,520}<ModeGuidance/.test(homeSceneText)),
  )

  requireHomeSceneGuard(
    'NarratorHud or equivalent narrator HUD is guarded away from home mode',
    /!isHomeMode\s*\?\s*<NarratorHud[\s\S]{0,160}\/>\s*:\s*null/.test(homeSceneText) ||
      (/const showLifeMapHud\s*=\s*!isHomeMode/.test(homeSceneText) && /(showLifeMapHud|!isHomeMode)[\s\S]{0,700}(NarratorHud|urai-narrator-hud)/.test(homeSceneText)),
  )

  requireHomeSceneGuard(
    'keyboard recenter shortcut is disabled on home mode',
    /event\.key\.toLowerCase\(\) === 'r' && !isHomeMode/.test(homeSceneText),
  )

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
