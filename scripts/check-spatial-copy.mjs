#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const scannedRoots = ['README.md', 'ENVIRONMENT.md', 'docs', 'urai-tier1/src']
const ignoredFragments = [
  'node_modules',
  '.next',
  'docs/SPATIAL_LAUNCH_CONTRACT.md',
  'scripts/check-spatial-copy.mjs',
  'urai-tier1/src/app/api/body-biometric/route.ts',
  'urai-tier1/src/brand/UraiSymbol.tsx',
  'urai-tier1/src/brand/urai-brand.registry.ts',
  'urai-tier1/src/lib/spatial-launch-boundaries.ts',
  'urai-tier1/src/lib/spatial-system-contract.ts',
]
const textExtensions = new Set(['.md', '.mdx', '.ts', '.tsx', '.js', '.jsx', '.json'])

const riskyClaims = [
  { id: 'live-immersive-runtime', pattern: /\b(live AR|live WebXR|live XR|production XR|AR session|WebXR session|immersive provider)\b/i, allowedNearby: /not live|future|deferred|fallback|provider is connected|do not claim|seam|preview|scaffold|contract|private beta|gated|disabled/i, reason: 'AR/WebXR must be framed as deferred, fallback, preview, or provider-gated.' },
  { id: 'sensitive-provider', pattern: /\b(biometric provider|camera provider|body biometric|face tracking|voiceprint|wearable provider|wearable sync)\b/i, allowedNearby: /fallback|mock|not live|future|deferred|privacy-safe|provider is connected|consent|scaffold|contract|private beta|gated|disabled/i, reason: 'Biometric, camera, and wearable language must stay privacy-safe, fallback, deferred, or consent-gated.' },
  { id: 'memory-grounded-provider', pattern: /\b(memory-grounded|memory grounded|live memory|cross-repo memory|user memory sync)\b/i, allowedNearby: /not live|future|deferred|fallback|provider is connected|consent|scaffold|contract|private beta|gated|disabled/i, reason: 'Memory-grounded and cross-repo sync language must be deferred unless provider wiring and consent exist.' },
  { id: 'asset-factory-provider', pattern: /\b(asset-factory|asset factory|spatial asset jobs|media pipeline|studio export)\b/i, allowedNearby: /not live|future|deferred|fallback|provider is connected|scaffold|contract|private beta|gated|disabled/i, reason: 'Asset-factory/studio export language must remain deferred unless job integration is live.' },
]

const passingFixtures = [
  'AR session support is deferred and disabled until provider is connected.',
  'Body biometric panels are privacy-safe fallback previews, not live providers.',
  'Memory-grounded narration is private beta and gated behind consent.',
  'Asset Factory jobs are scaffold contracts and not live in this public demo.'
]

const failingFixtures = [
  'URAI Spatial includes live WebXR for public users.',
  'The biometric provider enables face tracking today.',
  'Live memory sync powers the companion.',
  'The media pipeline supports studio export now.'
]

function shouldIgnore(relativePath) {
  return ignoredFragments.some((fragment) => relativePath === fragment || relativePath.startsWith(`${fragment}/`) || relativePath.includes(fragment))
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

function findRisk(text) {
  return riskyClaims.find((claim) => claim.pattern.test(text) && !claim.allowedNearby.test(text))
}

for (const fixture of passingFixtures) {
  const risk = findRisk(fixture)
  if (risk) {
    console.error(`spatial-copy: passing fixture failed (${risk.id}): ${fixture}`)
    process.exit(1)
  }
}

for (const fixture of failingFixtures) {
  const risk = findRisk(fixture)
  if (!risk) {
    console.error(`spatial-copy: failing fixture passed unexpectedly: ${fixture}`)
    process.exit(1)
  }
}

const files = scannedRoots
  .flatMap(listFiles)
  .filter((filePath) => textExtensions.has(path.extname(filePath)))
  .filter((filePath) => !shouldIgnore(path.relative(root, filePath).replace(/\\/g, '/')))

let failed = false
for (const filePath of files) {
  const relativePath = path.relative(root, filePath).replace(/\\/g, '/')
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/)
  lines.forEach((line, index) => {
    if (isImplementationLine(line)) return
    const publicText = publicTextFromLine(line)
    const risk = findRisk(publicText)
    if (!risk) return
    const context = [lines[index - 1] ?? '', line, lines[index + 1] ?? ''].join(' ')
    if (risk.allowedNearby.test(context)) return
    console.error(`spatial-copy: risky spatial provider claim in ${relativePath}:${index + 1}`)
    console.error(`  policy: ${risk.id}`)
    console.error(`  ${risk.reason}`)
    console.error(`  ${line.trim()}`)
    failed = true
  })
}

if (failed) process.exit(1)
console.log('spatial-copy: provider boundary checks passed')
