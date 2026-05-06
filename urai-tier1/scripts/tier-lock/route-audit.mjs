import fs from 'node:fs'
import { legacySceneImports, requiredTierOneFiles, sceneRouteFiles, tierOneRoutes } from './tier-config.mjs'

const failures = []
const warnings = []

function read(file) {
  if (!fs.existsSync(file)) {
    failures.push(`missing file: ${file}`)
    return ''
  }
  return fs.readFileSync(file, 'utf8')
}

for (const route of tierOneRoutes) {
  const text = read(route.file)
  if (!text) continue

  if (route.kind === 'scene' && route.route !== '/') {
    const usesTierShell = text.includes('TierOneExperience') || text.includes('HomeScene')
    if (!usesTierShell) failures.push(`${route.route} must use TierOneExperience or HomeScene`)
  }

  if (route.kind === 'access') {
    if (!text.includes('saveEarlyAccessSignup') && !text.includes('acceptInvite')) {
      warnings.push(`${route.route} does not reference invite or signup utility`)
    }
  }

  if (route.kind === 'admin' && !text.includes('createAdminInvite')) {
    warnings.push(`${route.route} does not reference admin invite utility`)
  }
}

for (const file of requiredTierOneFiles) {
  if (!fs.existsSync(file)) failures.push(`missing Tier-1 component: ${file}`)
}

for (const file of sceneRouteFiles) {
  const text = read(file)
  for (const legacyImport of legacySceneImports) {
    if (text.includes(legacyImport)) failures.push(`${file} still imports legacy scene path ${legacyImport}`)
  }
}

const root = read('src/app/page.tsx')
if (root.includes('sourceBadge=')) failures.push('root home route still passes sourceBadge')

const homeScene = read('src/scene/HomeScene.tsx')
if (homeScene.includes("context === 'explore'") && homeScene.includes("return 'ritual'")) {
  failures.push('HomeScene still maps explore/constellation directly to ritual orb halo')
}

if (failures.length) {
  console.error('[tier-route-audit] failed')
  for (const failure of failures) console.error(` - ${failure}`)
  if (warnings.length) {
    console.warn('[tier-route-audit] warnings')
    for (const warning of warnings) console.warn(` - ${warning}`)
  }
  process.exit(1)
}

console.log('[tier-route-audit] passed')
if (warnings.length) {
  console.warn('[tier-route-audit] warnings')
  for (const warning of warnings) console.warn(` - ${warning}`)
}
