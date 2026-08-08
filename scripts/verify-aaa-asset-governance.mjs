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
requireCondition(ledger.paidProviderCalls === 0, 'the preparation ledger must record zero paid provider calls')
requireCondition(ledger.productionDeployments === 0, 'the preparation ledger must record zero production deployments')
requireCondition(ledger.assetPromotions === 0, 'the preparation ledger must record zero asset promotions')

const ids = new Set()
const paths = new Set()
for (const asset of launch.assets) {
  requireCondition(!ids.has(asset.id), `duplicate launch asset id: ${asset.id}`)
  requireCondition(!paths.has(asset.fixedPath), `duplicate launch asset path: ${asset.fixedPath}`)
  requireCondition(Boolean(asset.fallback), `launch asset ${asset.id} must retain a fallback`)
  requireCondition(Boolean(asset.license) && !/unknown/i.test(asset.license), `launch asset ${asset.id} must have a known license`)

  if (asset.releaseState === 'ready' || asset.releaseState === 'production-ready') {
    const decisionPath = `operations/assets/promotion-decisions/${asset.id}.json`
    requireCondition(existsSync(resolve(root, decisionPath)), `production launch asset ${asset.id} requires a governed promotion decision`)
    if (existsSync(resolve(root, decisionPath))) {
      const decision = readJson(decisionPath)
      requireCondition(decision.mode === 'promotion', `production launch asset ${asset.id} decision must use promotion mode`)
      requireCondition(decision.assetId === asset.id, `production launch asset ${asset.id} decision id must match`)
      requireCondition(decision.canonicalPath === asset.fixedPath, `production launch asset ${asset.id} decision path must match`)
      requireCondition(decision.source === asset.source, `production launch asset ${asset.id} decision source must match`)
      requireCondition(decision.license === asset.license, `production launch asset ${asset.id} decision license must match`)
      requireCondition(decision.fallback === asset.fallback, `production launch asset ${asset.id} decision fallback must match`)
      requireCondition(decision.promote === true, `production launch asset ${asset.id} decision must explicitly promote`)
      requireCondition(decision.humanReviewApproved === true, `production launch asset ${asset.id} requires human review approval`)
      requireCondition(decision.visualProofVerified === true, `production launch asset ${asset.id} requires visual proof`)
      requireCondition(decision.optimizationVerified === true, `production launch asset ${asset.id} requires optimization proof`)
      requireCondition(decision.fallbackVerified === true, `production launch asset ${asset.id} requires fallback proof`)
      requireCondition(decision.routeConsumptionVerified === true, `production launch asset ${asset.id} requires route-consumption proof`)
      requireCondition(decision.licenseApproved === true, `production launch asset ${asset.id} requires license approval`)
      requireCondition(Boolean(decision.receiptPath), `production launch asset ${asset.id} requires a production receipt`)
      if (decision.receiptPath && existsSync(resolve(root, decision.receiptPath))) {
        const receipt = readJson(decision.receiptPath)
        requireCondition(receipt.fixedPath === asset.fixedPath, `production launch asset ${asset.id} receipt path must match`)
        requireCondition(receipt.sha256 === decision.sha256, `production launch asset ${asset.id} receipt hash must match decision`)
        requireCondition(receipt.bytes === decision.bytes, `production launch asset ${asset.id} receipt bytes must match decision`)
        requireCondition(receipt.releaseState === 'production-ready', `production launch asset ${asset.id} receipt must be production-ready`)
      } else {
        requireCondition(false, `production launch asset ${asset.id} production receipt is missing`)
      }
    }
  }

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
  const audioPath = cue.path ?? cue.candidatePath
  const supportedFallback = cue.fallback === 'silence' || cue.fallback === 'none' || (cue.fallback === 'visible-status-text' && cue.role === 'ui')
  requireCondition(!audioIds.has(cue.id), `duplicate audio cue id: ${cue.id}`)
  requireCondition(Boolean(audioPath), `audio cue ${cue.id} requires a path`)
  if (audioPath) requireCondition(!audioPaths.has(audioPath), `duplicate audio cue path: ${audioPath}`)
  requireCondition(Boolean(cue.caption), `audio cue ${cue.id} requires caption metadata`)
  requireCondition(supportedFallback, `audio cue ${cue.id} has an unsupported fallback`)
  requireCondition(cue.maxBytes > 0, `audio cue ${cue.id} requires a positive byte budget`)
  audioIds.add(cue.id)
  if (audioPath) audioPaths.add(audioPath)
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
