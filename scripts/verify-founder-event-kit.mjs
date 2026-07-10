#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const failures = []
const read = (relative) => {
  const absolute = path.join(root, relative)
  if (!fs.existsSync(absolute)) {
    failures.push(`${relative} is missing`)
    return ''
  }
  return fs.readFileSync(absolute, 'utf8')
}
const requireTokens = (relative, tokens) => {
  const text = read(relative)
  for (const token of tokens) if (!text.includes(token)) failures.push(`${relative} is missing: ${token}`)
  return text
}

const eventPage = requireTokens('urai-tier1/src/app/event/page.tsx', [
  'data-demo-data="synthetic-sample-only"',
  'Sample-data demonstration',
  'Production certification and exact deployed-SHA proof remain pending',
  'https://urai.app/event',
  'href="/life-map"',
  'href="/status"',
  'href="/privacy-controls"',
])
for (const forbidden of ['/admin', '/internal', 'console.firebase.google.com', 'process.env', 'customer record example']) {
  if (eventPage.includes(forbidden)) failures.push(`event page contains forbidden surface or runtime dependency: ${forbidden}`)
}

const target = read('urai-tier1/public/media/event/QR_TARGET.txt').split(/\r?\n/)[0].trim()
if (target !== 'https://urai.app/event') failures.push(`QR target is ${target || 'missing'}; expected https://urai.app/event`)
requireTokens('urai-tier1/public/media/event/urai-event-qr.svg', [
  'URAI founder event QR code',
  'QR code for https://urai.app/event',
])
requireTokens('urai-tier1/public/media/event/offline-demo.html', [
  'Synthetic sample data only',
  'Substantial demo. Certification pending.',
  'No customer, account, credential, admin, console, environment, or production data is shown.',
])
requireTokens('urai-tier1/public/media/event/offline-video.html', [
  'Synthetic sample content only',
  'Event, Home, Life Map, Focus, Replay, Mirror, Passport, and Status',
  'video/chunk-00.js',
  'video/chunk-01.js',
  'video/chunk-02.js',
  'founder-event-storyboard.svg',
])
requireTokens('urai-tier1/public/media/event/video/README.md', [
  'Duration: 72 seconds',
  'Decoded size: 22,263 bytes',
  '1280a31745e5cfc98eea64f733468daa064ce1d799026f98090485bedb1f8c6c',
])
requireTokens('scripts/verify-embedded-event-video.mjs', [
  'base64Length: 29684',
  'byteLength: 22263',
  "sha256: '1280a31745e5cfc98eea64f733468daa064ce1d799026f98090485bedb1f8c6c'",
  "ebmlMagic: '1a45dfa3'",
])
requireTokens('scripts/capture-founder-event-kit.mjs', [
  "route: '/event'",
  "route: '/life-map'",
  "route: '/focus?memoryId=quiet-reset'",
  "route: '/replay?memoryId=quiet-reset&manifestId=replay-recovery-thread'",
  "route: '/mirror'",
  "route: '/passport'",
  "route: '/status'",
  'recordVideo',
  'piiPatterns',
  'unsafeLinks',
  "schemaVersion: 'urai-founder-event-kit-1'",
  'sourceSha,',
  'sampleDataOnly: true',
  'URAI_EVENT_SOURCE_SHA must be the exact 40-character source commit in CI',
])
requireTokens('.github/workflows/founder-event-demo-kit.yml', [
  "TARGET_SHA: ${{ github.event_name == 'pull_request' && github.event.pull_request.head.sha || github.sha }}",
  'ref: ${{ env.TARGET_SHA }}',
  'test "$(git rev-parse HEAD)" = "$TARGET_SHA"',
  'NEXT_PUBLIC_URAI_BUILD_SHA: ${{ env.TARGET_SHA }}',
  'URAI_EVENT_SOURCE_SHA: ${{ env.TARGET_SHA }}',
  'node scripts/verify-embedded-event-video.mjs',
  'name: urai-founder-event-kit-${{ env.TARGET_SHA }}',
])

const demoData = requireTokens('urai-tier1/src/spatial/v1/lifeMapDemoData.ts', [
  "freshness: 'demo'",
  'Public-safe symbolic demo only; no raw private signal is shown.',
])
const piiPatterns = [
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  /\b\d{3}-\d{2}-\d{4}\b/,
  /\b(?:api[_ -]?key|client[_ -]?secret|password|bearer token)\s*[:=]/i,
]
for (const pattern of piiPatterns) if (pattern.test(demoData)) failures.push(`lifeMapDemoData.ts matches potential sensitive-data pattern: ${pattern}`)

requireTokens('urai-tier1/src/data/launchTruth.ts', [
  "path: '/event'",
  "label: 'Founder event destination'",
  'Synthetic sample-data event route; publication remains gated by exact deployment proof.',
])
requireTokens('urai-tier1/src/app/status/page.tsx', [
  "['/event', 'pending proof', 'Founder event destination']",
])
requireTokens('docs/founder-readiness/FOUNDER_EVENT_DEMO_KIT.md', [
  '## Event operator: 60-second run',
  '## Offline fallback',
  '## QR publication gate',
  '## Ownership',
  'offline-video.html',
])

if (failures.length) {
  console.error('Founder event kit verification failed:')
  failures.forEach((failure) => console.error(`- ${failure}`))
  process.exit(1)
}

console.log('Founder event kit verification passed')
