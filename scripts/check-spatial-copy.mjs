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
  { pattern: /\b(live AR|live WebXR|AR session|WebXR session|immersive provider)\b/i, allowedNearby: /not live|future|deferred|fallback|provider is connected|do not claim|seam|preview|scaffold|contract/i, reason: 'AR/WebXR must be framed as deferred, fallback, preview, or provider-gated.' },
  { pattern: /\b(biometric provider|camera provider|body biometric|face tracking|voiceprint|wearable provider|wearable sync)\b/i, allowedNearby: /fallback|mock|not live|future|deferred|privacy-safe|provider is connected|consent|scaffold|contract/i, reason: 'Biometric, camera, and wearable language must stay privacy-safe, fallback, deferred, or consent-gated.' },
  { pattern: /\b(memory-grounded|memory grounded|live memory|cross-repo memory|user memory sync)\b/i, allowedNearby: /not live|future|deferred|fallback|provider is connected|consent|scaffold|contract/i, reason: 'Memory-grounded and cross-repo sync language must be deferred unless provider wiring and consent exist.' },
  { pattern: /\b(asset-factory|spatial asset jobs|media pipeline|studio export)\b/i, allowedNearby: /not live|future|deferred|fallback|provider is connected|scaffold|contract/i, reason: 'Asset-factory/studio export language must remain deferred unless job integration is live.' },
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

const files = scannedRoots
  .flatMap(listFiles)
  .filter((filePath) => textExtensions.has(path.extname(filePath)))
  .filter((filePath) => !shouldIgnore(path.relative(root, filePath).replace(/\\/g, '/')))

let failed = false
for (const filePath of files) {
  const relativePath = path.relative(root, filePath).replace(/\\/g, '/')
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/)
  lines.forEach((line, index) => {
    for (const claim of riskyClaims) {
      if (!claim.pattern.test(line)) continue
      if (claim.allowedNearby.test(line)) continue
      const context = [lines[index - 1] ?? '', line, lines[index + 1] ?? ''].join(' ')
      if (claim.allowedNearby.test(context)) continue
      console.error(`spatial-copy: risky spatial provider claim in ${relativePath}:${index + 1}`)
      console.error(`  ${claim.reason}`)
      console.error(`  ${line.trim()}`)
      failed = true
    }
  })
}

if (failed) process.exit(1)
console.log('spatial-copy: provider boundary checks passed')
