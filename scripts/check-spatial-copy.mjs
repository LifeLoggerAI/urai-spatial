#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const scannedRoots = ['README.md', 'ENVIRONMENT.md', 'docs', 'urai-tier1/src']
const claimMatrixRoots = [
  'docs/media-kit',
  'urai-tier1/src/app/page.tsx',
  'urai-tier1/src/app/launch/page.tsx',
  'urai-tier1/src/app/early-access/page.tsx',
  'urai-tier1/src/app/terms/page.tsx',
  'urai-tier1/src/app/status/page.tsx',
]
const ignoredFragments = [
  'node_modules',
  '.next',
  'docs/SPATIAL_LAUNCH_CONTRACT.md',
  'docs/system/',
  'docs/release/',
  'docs/audits/',
  'scripts/check-spatial-copy.mjs',
  'urai-tier1/src/app/UraiAAAARoutePolish.tsx',
  'urai-tier1/src/app/UraiFinalAssetSpineBridge.tsx',
  'urai-tier1/src/app/api/body-biometric/route.ts',
  'urai-tier1/src/brand/UraiSymbol.tsx',
  'urai-tier1/src/brand/urai-brand.registry.ts',
  'urai-tier1/src/lib/spatial-launch-boundaries.ts',
  'urai-tier1/src/lib/spatial-system-contract.ts',
]
const textExtensions = new Set(['.md', '.mdx', '.ts', '.tsx', '.js', '.jsx', '.json'])

const riskyClaims = [
  { id: 'live-immersive-runtime', pattern: /\b(live AR|live WebXR|live XR|production XR|AR session|WebXR session|immersive provider)\b/i, allowedNearby: /not live|not claimed|separate gate|future|deferred|fallback|provider is connected|do not claim|seam|preview|scaffold|contract|private beta|gated|disabled/i, reason: 'AR/WebXR must be framed as deferred, fallback, preview, or provider-gated.' },
  { id: 'sensitive-provider', pattern: /\b(biometric provider|camera provider|body biometric|face tracking|voiceprint|wearable provider|wearable sync)\b/i, allowedNearby: /fallback|mock|not live|not claimed|separate gate|future|deferred|privacy-safe|provider is connected|consent|scaffold|contract|private beta|gated|disabled/i, reason: 'Biometric, camera, and wearable language must stay privacy-safe, fallback, deferred, or consent-gated.' },
  { id: 'memory-grounded-provider', pattern: /\b(memory-grounded|memory grounded|live memory|cross-repo memory|user memory sync)\b/i, allowedNearby: /not live|not claimed|separate gate|future|deferred|fallback|provider is connected|consent|scaffold|contract|private beta|gated|disabled/i, reason: 'Memory-grounded and cross-repo sync language must be deferred unless provider wiring and consent exist.' },
  { id: 'asset-factory-provider', pattern: /\b(asset-factory|asset factory|spatial asset jobs|media pipeline|studio export)\b/i, allowedNearby: /not live|not claimed|separate gate|provenance|future|deferred|fallback|provider is connected|scaffold|contract|private beta|gated|disabled/i, reason: 'Asset-factory/studio export language must remain deferred unless job integration is live.' },
]

const claimMatrixRisks = [
  { id: 'legacy-public-brand', pattern: /\bURAI Genesis\b/i, allowedNearby: /historical|legacy|deprecated|do not use|replace|avoid/i, reason: 'Current public media and selected public routes must use URAI or URAI Spatial, not the legacy URAI Genesis name.' },
  { id: 'production-certification', pattern: /\b(production[- ]ready|production[- ]certification|production[- ]certified|provider[- ]active|active providers?|device[- ]certified|physical[- ]device certification|fully live|launch[- ]ready)\b/i, allowedNearby: /not|not yet|pending|gated|requires?|without|cannot|do not|does not|evidence|receipt|certification-pending|separately|matrix|status|boundary/i, reason: 'Production, provider, and device status require an immediate evidence, pending, matrix, or boundary qualifier.' },
  { id: 'medical-or-therapy', pattern: /\b(diagnos(?:e|es|is|tic)|therapy replacement|medical device|treat(?:s|ment)?|clinical outcome)\b/i, allowedNearby: /not|non-diagnostic|do not|does not|avoid|without|never|prohibited|reflection/i, reason: 'Medical, diagnosis, treatment, and therapy language must be explicitly disclaimed.' },
  { id: 'surveillance-or-certainty', pattern: /\b(lie detection|mind reading|emotional certainty|psychological truth|always-on monitoring|surveillance)\b/i, allowedNearby: /not|do not|does not|avoid|without|never|prohibited|disabled|consent/i, reason: 'Surveillance and certainty claims must be explicitly prohibited or disclaimed.' },
  { id: 'autonomous-action', pattern: /\b(autonomous(?: real-world)? actions?|acts autonomously|takes action for you|executes actions for you)\b/i, allowedNearby: /not|does not|do not|human-approved|approval|consent|disabled|future|gated/i, reason: 'Autonomous-action language must remain human-approved, disabled, future, or explicitly disclaimed.' },
  { id: 'persistent-memory', pattern: /\b(remembers your life|what (?:URAI|the system) can remember|persistent personal memory|persistent private memory|user-owned memory)\b/i, allowedNearby: /designed|not proven|not live|pending|gated|sample|demo|user-controlled|permission|future|without|does not/i, reason: 'Persistent personal-memory language requires an immediate design, sample, or evidence-gated qualifier.' },
]

const passingFixtures = [
  'AR session support is deferred and disabled until provider is connected.',
  'Body biometric panels are privacy-safe fallback previews, not live providers.',
  'Memory-grounded narration is private beta and gated behind consent.',
  'Asset Factory jobs are scaffold contracts and not live in this public demo.',
  'Asset Factory provenance is recorded, but live integration is not claimed.',
]

const failingFixtures = [
  'URAI Spatial includes live WebXR for public users.',
  'The biometric provider enables face tracking today.',
  'Live memory sync powers the companion.',
  'The media pipeline supports studio export now.',
]

const claimMatrixPassingFixtures = [
  'Production certification remains pending until exact receipts exist.',
  'This page is a production-certification matrix.',
  'Active providers remain separately gated.',
  'Physical-device certification requires exact evidence.',
  'Mirror is reflection, not diagnosis or treatment.',
  'URAI must not be described as surveillance or always-on monitoring.',
  'Autonomous actions remain disabled and require human approval.',
  'The demo does not prove persistent personal memory.',
]

const claimMatrixFailingFixtures = [
  'URAI Genesis is the current public product.',
  'URAI is production ready.',
  'URAI has active providers.',
  'URAI is device certified.',
  'Mirror diagnoses your emotional state.',
  'URAI provides lie detection and emotional certainty.',
  'URAI takes autonomous actions for you.',
  'Passport controls what URAI can remember.',
  'URAI remembers your life with persistent personal memory.',
]

const internalEvidenceRequirements = [
  {
    path: 'docs/system/PROVIDER_STATUS.md',
    required: [
      /does not prove that a provider is live/i,
      /Paid generation not initiated/i,
      /Do not claim live narration provider/i,
    ],
  },
  {
    path: 'docs/release/PRODUCTION_EVIDENCE.md',
    required: [
      /NOT YET PRODUCTION CERTIFIED/i,
      /No production deployment was initiated/i,
      /Physical Quest verification/i,
    ],
  },
  {
    path: 'docs/founder-readiness/CLAIMS_AND_LEGAL.md',
    required: [
      /## Green claims/i,
      /## Yellow claims/i,
      /## Red claims/i,
      /This demo uses sample data/i,
      /not a medical device/i,
      /guaranteed investment return/i,
    ],
  },
  {
    path: 'docs/media-kit/press-media-kit.md',
    required: [
      /^URAI$/m,
      /This demo uses sample data/i,
      /production-certification pending/i,
      /authenticated persistence/i,
    ],
  },
  {
    path: 'urai-tier1/src/app/launch/page.tsx',
    required: [
      />URAI</,
      /This demo uses sample data/i,
      /production-certification pending/i,
      /does not diagnose/i,
      /does not prove persistent personal memory/i,
    ],
  },
]

function shouldIgnore(relativePath) {
  return ignoredFragments.some((fragment) => relativePath === fragment || relativePath.startsWith(fragment) || relativePath.includes(fragment))
}

function listFiles(entry) {
  const absolute = path.join(root, entry)
  if (!fs.existsSync(absolute)) return []
  const stat = fs.statSync(absolute)
  if (stat.isFile()) return [absolute]
  if (!stat.isDirectory()) return []
  return fs.readdirSync(absolute).flatMap((child) => listFiles(path.join(entry, child)))
}

function isImplementationLine(line) {
  const trimmed = line.trim()
  if (!trimmed) return true
  if (/^import\s/.test(trimmed)) return true
  if (/^export\s+(type|interface|const|function)/.test(trimmed)) return true
  if (/^type\s|^interface\s/.test(trimmed)) return true
  if (/^\/\//.test(trimmed)) return true
  if (/^(?:void\s+)?fetch\(/.test(trimmed)) return true
  if (/^(className|data-[A-Za-z-]+|href|asset|src)\s*[:=]/.test(trimmed)) return true
  return false
}

function publicTextFromLine(line) {
  const fragments = []
  for (const match of line.matchAll(/>([^<>{}][^<>]*)</g)) fragments.push(match[1])
  for (const match of line.matchAll(/(?:aria-label|title|description|content|placeholder|alt)=["']([^"']+)["']/g)) fragments.push(match[1])
  for (const match of line.matchAll(/(?:title|description|summary|body|label|eyebrow|placeholder|alt|ariaLabel)\s*:\s*["'`]([^"'`]+)["'`]/g)) fragments.push(match[1])
  return fragments.length > 0 ? fragments.join(' ') : line
}

function findRisk(risks, text) {
  return risks.find((claim) => claim.pattern.test(text) && !claim.allowedNearby.test(text))
}

for (const fixture of passingFixtures) {
  const risk = findRisk(riskyClaims, fixture)
  if (risk) {
    console.error(`spatial-copy: passing fixture failed (${risk.id}): ${fixture}`)
    process.exit(1)
  }
}

for (const fixture of failingFixtures) {
  const risk = findRisk(riskyClaims, fixture)
  if (!risk) {
    console.error(`spatial-copy: failing fixture passed unexpectedly: ${fixture}`)
    process.exit(1)
  }
}

for (const fixture of claimMatrixPassingFixtures) {
  const risk = findRisk(claimMatrixRisks, fixture)
  if (risk) {
    console.error(`spatial-copy: claim-matrix passing fixture failed (${risk.id}): ${fixture}`)
    process.exit(1)
  }
}

for (const fixture of claimMatrixFailingFixtures) {
  const risk = findRisk(claimMatrixRisks, fixture)
  if (!risk) {
    console.error(`spatial-copy: claim-matrix failing fixture passed unexpectedly: ${fixture}`)
    process.exit(1)
  }
}

for (const requirement of internalEvidenceRequirements) {
  const absolute = path.join(root, requirement.path)
  if (!fs.existsSync(absolute)) {
    console.error(`spatial-copy: required evidence file missing: ${requirement.path}`)
    process.exit(1)
  }
  const text = fs.readFileSync(absolute, 'utf8')
  for (const pattern of requirement.required) {
    if (!pattern.test(text)) {
      console.error(`spatial-copy: internal evidence boundary missing in ${requirement.path}: ${pattern}`)
      process.exit(1)
    }
  }
}

function scan(files, risks, label) {
  let failed = false
  for (const filePath of files) {
    const relativePath = path.relative(root, filePath).replace(/\\/g, '/')
    const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/)
    lines.forEach((line, index) => {
      if (isImplementationLine(line)) return
      const publicText = publicTextFromLine(line)
      const risk = findRisk(risks, publicText)
      if (!risk) return
      const context = [lines[index - 1] ?? '', line, lines[index + 1] ?? ''].join(' ')
      if (risk.allowedNearby.test(context)) return
      console.error(`spatial-copy: risky ${label} claim in ${relativePath}:${index + 1}`)
      console.error(`  policy: ${risk.id}`)
      console.error(`  ${risk.reason}`)
      console.error(`  ${line.trim()}`)
      failed = true
    })
  }
  return failed
}

const providerFiles = scannedRoots
  .flatMap(listFiles)
  .filter((filePath) => textExtensions.has(path.extname(filePath)))
  .filter((filePath) => !shouldIgnore(path.relative(root, filePath).replace(/\\/g, '/')))

const claimMatrixFiles = claimMatrixRoots
  .flatMap(listFiles)
  .filter((filePath) => textExtensions.has(path.extname(filePath)))
  .filter((filePath) => !shouldIgnore(path.relative(root, filePath).replace(/\\/g, '/')))

const providerFailed = scan(providerFiles, riskyClaims, 'spatial provider')
const claimMatrixFailed = scan(claimMatrixFiles, claimMatrixRisks, 'public claims matrix')

if (providerFailed || claimMatrixFailed) process.exit(1)
console.log('spatial-copy: provider boundaries and public claims matrix passed')
