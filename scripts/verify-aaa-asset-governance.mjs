import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()
const readJson = (path) => JSON.parse(readFileSync(resolve(root, path), 'utf8'))
const failures = []
const requireCondition = (condition, message) => { if (!condition) failures.push(message) }

const launch = readJson('operations/assets/launch-critical-assets.json')
const contract = readJson('operations/assets/aaa-visual-technical-contract-v1.json')
const ledger = readJson('operations/assets/aaa-asset-production-ledger-2026-07-17.json')
const haptics = readJson('urai-tier1/public/assets/urai/generated/haptics/semantic-haptic-patterns-v1.json')
const audio = readJson('operations/assets/spatial-audio-cue-manifest-v1.json')

requireCondition(contract.authority.baseSha === ledger.baseSha, 'contract and ledger base SHA must match')
requireCondition(contract.authority.canonicalManifest === 'operations/assets/launch-critical-assets.json', 'contract must reference the canonical launch manifest')
requireCondition(contract.requiredVariants.includes('no-webgl-static'), 'contract must require no-WebGL static variants')
requireCondition(ledger.paidProviderCalls === 0, 'this lane must record zero paid provider calls')
requireCondition(ledger.productionDeployments === 0, 'this lane must record zero production deployments')
requireCondition(ledger.assetPromotions === 0, 'this lane must record zero asset promotions')

const ids = new Set()
const paths = new Set()
for (const asset of launch.assets) {
  requireCondition(!ids.has(asset.id), `duplicate launch asset id: ${asset.id}`)
  requireCondition(!paths.has(asset.fixedPath), `duplicate launch asset path: ${asset.fixedPath}`)
  requireCondition(Boolean(asset.fallback), `launch asset ${asset.id} must retain a fallback`)
  requireCondition(Boolean(asset.license) && !/unknown/i.test(asset.license), `launch asset ${asset.id} must have a known license`)
  requireCondition(asset.releaseState !== 'ready', `launch asset ${asset.id} may not be marked ready by the preparation lane`)
  ids.add(asset.id)
  paths.add(asset.fixedPath)
}

for (const pattern of haptics.patterns) {
  requireCondition(Array.isArray(pattern.vibrationMs) && pattern.vibrationMs.length > 0, `haptic ${pattern.id} vibrationMs must be a non-empty array`)
  requireCondition(Array.isArray(pattern.intensity) && pattern.intensity.length === pattern.vibrationMs.length, `haptic ${pattern.id} intensity and vibrationMs must have matching lengths`)
  const total = pattern.vibrationMs.reduce((sum, value) => sum + value, 0)
  const pulseCount = Math.ceil(pattern.vibrationMs.length / 2)
  requireCondition(total <= haptics.policy.maxPatternDurationMs, `haptic ${pattern.id} exceeds total duration cap`)
  requireCondition(pulseCount <= haptics.policy.maxPulseCount, `haptic ${pattern.id} exceeds pulse count cap`)
  requireCondition(pattern.vibrationMs.every((value, index) => index % 2 === 1 || value <= haptics.policy.maxPulseDurationMs), `haptic ${pattern.id} exceeds pulse duration cap`)
  requireCondition(pattern.intensity.every((value) => value >= 0 && value <= 1), `haptic ${pattern.id} intensity is outside 0..1`)
}

const audioIds = new Set()
const audioPaths = new Set()
for (const cue of audio.cues) {
  requireCondition(!audioIds.has(cue.id), `duplicate audio cue id: ${cue.id}`)
  requireCondition(!audioPaths.has(cue.candidatePath), `duplicate audio cue path: ${cue.candidatePath}`)
  requireCondition(Boolean(cue.caption), `audio cue ${cue.id} requires caption metadata`)
  requireCondition(cue.fallback === 'silence' || cue.fallback === 'none', `audio cue ${cue.id} has an unsupported fallback`)
  requireCondition(cue.maxBytes > 0, `audio cue ${cue.id} requires a positive byte budget`)
  audioIds.add(cue.id)
  audioPaths.add(cue.candidatePath)
}

for (const path of [
  'urai-tier1/public/assets/urai/generated/fallbacks/home-sanctuary-static-v1.svg',
  'urai-tier1/public/assets/urai/generated/fallbacks/ground-world-static-v1.svg',
  'urai-tier1/public/assets/urai/generated/fallbacks/life-map-static-v1.svg'
]) {
  requireCondition(existsSync(resolve(root, path)), `required accessible fallback missing: ${path}`)
}

if (failures.length > 0) {
  console.error('AAA_ASSET_GOVERNANCE=RED')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('AAA_ASSET_GOVERNANCE=GREEN')
console.log(`LAUNCH_ASSETS_CHECKED=${launch.assets.length}`)
console.log(`HAPTIC_PATTERNS_CHECKED=${haptics.patterns.length}`)
console.log(`AUDIO_CUES_CHECKED=${audio.cues.length}`)
console.log('STATIC_FALLBACKS_CHECKED=3')
