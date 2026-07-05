#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const evidenceDir = path.join(root, 'audit', 'v7')
const registryPath = path.join(root, 'urai-tier1', 'src', 'spatial', 'scene', 'sceneRegistry.ts')
const contractPath = path.join(root, 'urai-tier1', 'src', 'spatial', 'scene', 'sceneIntelligenceContract.ts')

const requiredRoutes = [
  { routeId: 'home', path: 'urai-tier1/src/app/home/page.tsx' },
  { routeId: 'life-map', path: 'urai-tier1/src/app/life-map/page.tsx' },
  { routeId: 'focus', path: 'urai-tier1/src/app/focus/page.tsx' },
  { routeId: 'replay', path: 'urai-tier1/src/app/replay/page.tsx' },
  { routeId: 'unwind', path: 'urai-tier1/src/app/unwind/page.tsx' },
  { routeId: 'spatial-ar-vr', path: 'urai-tier1/src/app/spatial/ar-vr/page.tsx' },
]

const requiredContinuity = [
  ['home', 'life-map'],
  ['life-map', 'focus'],
  ['focus', 'replay'],
  ['replay', 'unwind'],
  ['unwind', 'life-map'],
]

function exists(p) {
  return fs.existsSync(path.join(root, p))
}

const missingRoutes = requiredRoutes.filter((route) => !exists(route.path))
const missingFiles = [registryPath, contractPath].filter((file) => !fs.existsSync(file))
const registry = fs.existsSync(registryPath) ? fs.readFileSync(registryPath, 'utf8') : ''
const contract = fs.existsSync(contractPath) ? fs.readFileSync(contractPath, 'utf8') : ''

const missingRegistryRoutes = requiredRoutes
  .map((route) => route.routeId)
  .filter((routeId) => !registry.includes(`routeId: '${routeId}'`))

const missingContinuity = requiredContinuity.filter(([from, to]) => {
  return !(registry.includes(`from: '${from}'`) && registry.includes(`to: '${to}'`))
})

const missingTypes = ['UraiSceneIntelligenceState', 'UraiSceneIntelligenceTransition', 'UraiSceneFallbackMode'].filter((name) => !contract.includes(name))

const ok = missingRoutes.length === 0 && missingFiles.length === 0 && missingRegistryRoutes.length === 0 && missingContinuity.length === 0 && missingTypes.length === 0
const report = {
  generatedAt: new Date().toISOString(),
  decision: ok ? 'V7_SCENE_INTELLIGENCE_READY' : 'V7_SCENE_INTELLIGENCE_INCOMPLETE',
  requiredRoutes,
  missingRoutes,
  registry: 'urai-tier1/src/spatial/scene/sceneRegistry.ts',
  contract: 'urai-tier1/src/spatial/scene/sceneIntelligenceContract.ts',
  missingFiles: missingFiles.map((file) => path.relative(root, file).replaceAll(path.sep, '/')),
  missingRegistryRoutes,
  requiredContinuity: requiredContinuity.map(([from, to]) => `${from}->${to}`),
  missingContinuity: missingContinuity.map(([from, to]) => `${from}->${to}`),
  missingTypes,
}

fs.mkdirSync(evidenceDir, { recursive: true })
fs.writeFileSync(path.join(evidenceDir, 'scene-continuity-report.json'), JSON.stringify(report, null, 2) + '\n')
console.log(JSON.stringify(report, null, 2))
process.exit(ok ? 0 : 1)
