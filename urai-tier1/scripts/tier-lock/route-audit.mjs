import fs from 'node:fs'
import path from 'node:path'
import { legacySceneImports, requiredTierOneFiles, sceneRouteFiles, tierOneRoutes } from './tier-config.mjs'

const failures = []
const warnings = []
const visited = new Set()

function read(file) {
  if (!fs.existsSync(file)) {
    failures.push(`missing file: ${file}`)
    return ''
  }
  return fs.readFileSync(file, 'utf8')
}

function resolveRelativeImport(fromFile, specifier) {
  if (!specifier.startsWith('.')) return null
  const base = path.dirname(fromFile)
  const raw = path.normalize(path.join(base, specifier))
  const candidates = [raw, `${raw}.tsx`, `${raw}.ts`, path.join(raw, 'page.tsx'), path.join(raw, 'index.tsx')]
  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null
}

function collectRouteText(file) {
  if (visited.has(file)) return ''
  visited.add(file)
  const text = read(file)
  if (!text) return ''

  const imports = [...text.matchAll(/import\s+(?:[\w{}*,\s]+\s+from\s+)?["']([^"']+)["']/g)]
    .map((match) => match[1])
    .filter((specifier) => specifier.startsWith('.'))
    .map((specifier) => resolveRelativeImport(file, specifier))
    .filter(Boolean)

  return [text, ...imports.map((importFile) => collectRouteText(importFile))].join('\n')
}

for (const route of tierOneRoutes) {
  visited.clear()
  const text = collectRouteText(route.file)
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
  visited.clear()
  const text = collectRouteText(file)
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
