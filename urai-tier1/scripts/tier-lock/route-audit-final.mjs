import fs from 'node:fs'
import path from 'node:path'
import {
  legacySceneImports,
  requiredServerFiles,
  requiredTierOneDependencies,
  requiredTierOneDevDependencies,
  requiredTierOneFiles,
  sceneRouteFiles,
  serverApiRoutes,
  tierOneRoutes,
} from './tier-config.mjs'

const failures = []
const warnings = []
const visited = new Set()

const canonicalSceneOwners = new Map([
  ['/home', ['FinalHomeThreshold', 'HomeSpatialWorldFinal']],
  ['/ascent', ['RootModeExperience']],
  ['/life-map', ['RealLifeMapGalaxy']],
  ['/demo', ['TierOneExperience']],
  ['/demo/life-map', ['TierOneExperience', 'LifeMapAscentGate']],
  ['/focus', ['FinalFocusChamber']],
  ['/replay', ['FinalReplayFilm']],
])

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

function parsePackageJson() {
  const text = read('package.json')
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch (error) {
    failures.push(`package.json is not valid JSON: ${error instanceof Error ? error.message : String(error)}`)
    return null
  }
}

for (const route of tierOneRoutes) {
  visited.clear()
  const text = collectRouteText(route.file)
  if (!text) continue

  if (route.kind === 'scene' && route.route !== '/') {
    const ownerTokens = canonicalSceneOwners.get(route.route) ?? []
    const usesCanonicalOwner = ownerTokens.length > 0 && ownerTokens.every((token) => text.includes(token))
    const usesTierShell = text.includes('TierOneExperience') || text.includes('HomeScene') || usesCanonicalOwner
    if (!usesTierShell) {
      const ownerHint = ownerTokens.length ? ` or canonical owner tokens ${ownerTokens.join(' + ')}` : ''
      failures.push(`${route.route} must use TierOneExperience, HomeScene${ownerHint}`)
    }
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

for (const route of serverApiRoutes) {
  visited.clear()
  const text = collectRouteText(route.file)
  if (!text) continue
  for (const token of route.mustInclude) {
    if (!text.includes(token)) failures.push(`${route.route} must include ${token}`)
  }
}

for (const file of requiredTierOneFiles) {
  if (!fs.existsSync(file)) failures.push(`missing Tier-1 component: ${file}`)
}

for (const file of requiredServerFiles) {
  if (!fs.existsSync(file)) failures.push(`missing Tier-1 server file: ${file}`)
}

const pkg = parsePackageJson()
if (pkg) {
  for (const dependency of requiredTierOneDependencies) {
    if (!pkg.dependencies?.[dependency]) failures.push(`missing Tier-1 dependency: ${dependency}`)
  }
  for (const dependency of requiredTierOneDevDependencies) {
    if (!pkg.devDependencies?.[dependency]) failures.push(`missing Tier-1 devDependency: ${dependency}`)
  }
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
