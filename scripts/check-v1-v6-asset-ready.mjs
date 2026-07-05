#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const publicRoot = path.join(root, 'urai-tier1', 'public')
const registryPath = path.join(root, 'urai-tier1', 'src', 'spatial', 'assets', 'uraiAssets.ts')
const evidenceDir = path.join(root, 'audit', 'v1-v6')
const strict = process.argv.includes('--strict') || process.env.URAI_ASSET_READY_STRICT === 'true'

function read(file) {
  return fs.readFileSync(file, 'utf8')
}

function exists(file) {
  return fs.existsSync(file)
}

function rel(file) {
  return path.relative(root, file).replaceAll(path.sep, '/')
}

function unique(values) {
  return [...new Set(values)]
}

function classifyAsset(assetPath) {
  const p = assetPath.toLowerCase()
  if (p.includes('/home/')) return 'v1-home'
  if (p.includes('/ground/')) return 'v1-ground'
  if (p.includes('/life-map/')) return 'v2-life-map'
  if (p.includes('/focus/')) return 'v3-focus'
  if (p.includes('/replay/')) return 'v4-replay'
  if (p.includes('/mirror/')) return 'v5-mirror'
  if (p.includes('/passport/') || p.includes('/privacy-controls/') || p.includes('/location-map/') || p.includes('/status/') || p.includes('/avatars/') || p.includes('/ui/')) return 'v6-system'
  return 'unclassified'
}

if (!exists(registryPath)) {
  console.error('[v1-v6-asset-ready] missing asset registry:', rel(registryPath))
  process.exit(1)
}

const registry = read(registryPath)
const exportedContracts = ['routeAssets', 'avatarAssets', 'uiAssets']
const missingExports = exportedContracts.filter((name) => !registry.includes(`export const ${name}`))

const referencedPublicAssets = unique(
  [...registry.matchAll(/\b(?:webp|fallback)\("([^"\n]+)"\)/g)].map((m) => `/assets/urai${m[1]}`)
)

const finalCandidates = referencedPublicAssets.filter((assetPath) => /\.(webp|png|jpg|jpeg|glb|gltf|hdr)$/i.test(assetPath))
const fallbackCandidates = referencedPublicAssets.filter((assetPath) => /fallback|\.svg$/i.test(assetPath))

const missingAll = referencedPublicAssets.filter((assetPath) => !exists(path.join(publicRoot, assetPath.replace(/^\/+/, ''))))
const missingFinal = finalCandidates.filter((assetPath) => !exists(path.join(publicRoot, assetPath.replace(/^\/+/, ''))))
const missingFallback = fallbackCandidates.filter((assetPath) => !exists(path.join(publicRoot, assetPath.replace(/^\/+/, ''))))

const finalManifestPaths = [
  path.join(publicRoot, 'assets', 'urai', 'final', 'manifests', 'urai-final-assets.json'),
  path.join(publicRoot, 'assets', 'urai', 'final', 'manifests', 'asset-factory-spatial-handoff.json'),
]

const finalManifests = finalManifestPaths.map((file) => ({
  path: rel(file),
  present: exists(file),
}))

const byTier = {}
for (const assetPath of referencedPublicAssets) {
  const tier = classifyAsset(assetPath)
  byTier[tier] ||= { referenced: 0, missing: 0, missingFinal: 0, missingFallback: 0 }
  byTier[tier].referenced += 1
  if (missingAll.includes(assetPath)) byTier[tier].missing += 1
  if (missingFinal.includes(assetPath)) byTier[tier].missingFinal += 1
  if (missingFallback.includes(assetPath)) byTier[tier].missingFallback += 1
}

const readyForRuntimeActivation = missingExports.length === 0 && missingFallback.length === 0
const fullyActivated = readyForRuntimeActivation && missingFinal.length === 0 && finalManifests.every((m) => m.present)
const decision = fullyActivated
  ? 'V1_V6_ASSETS_ACTIVE'
  : readyForRuntimeActivation
    ? 'V1_V6_ASSET_SWITCH_READY_FINAL_ASSETS_PENDING'
    : 'V1_V6_ASSET_SWITCH_BLOCKED'

const report = {
  generatedAt: new Date().toISOString(),
  decision,
  strict,
  purpose: 'Keep V1-V6 code/routes/gates ready so final assets turn on by landing files at the registry paths.',
  registry: rel(registryPath),
  exportedContracts,
  missingExports,
  activationContract: {
    rule: 'The runtime already references final asset URLs first and fallback assets second. When final files are added at these paths, browser/runtime activation is automatic without route rewrites.',
    finalAssetPathsMustExistForFullActivation: true,
    fallbackAssetsMustExistForSafePreAssetMode: true,
  },
  counts: {
    referencedPublicAssets: referencedPublicAssets.length,
    finalCandidates: finalCandidates.length,
    fallbackCandidates: fallbackCandidates.length,
    missingAll: missingAll.length,
    missingFinal: missingFinal.length,
    missingFallback: missingFallback.length,
  },
  byTier,
  finalManifests,
  missingFinal,
  missingFallback,
  nextStep: fullyActivated
    ? 'Proceed to V7 branch planning.'
    : 'Drop generated V1-V6 assets into the listed paths, rerun node scripts/check-v1-v6-asset-ready.mjs --strict, then open V7.'
}

fs.mkdirSync(evidenceDir, { recursive: true })
fs.writeFileSync(path.join(evidenceDir, 'asset-ready-switch-report.json'), JSON.stringify(report, null, 2) + '\n')

console.log(JSON.stringify(report, null, 2))

if (missingExports.length > 0 || missingFallback.length > 0) process.exit(1)
if (strict && !fullyActivated) process.exit(1)
process.exit(0)
