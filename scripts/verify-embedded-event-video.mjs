#!/usr/bin/env node
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const chunkPaths = [
  'urai-tier1/public/media/event/video/chunk-00.js',
  'urai-tier1/public/media/event/video/chunk-01.js',
  'urai-tier1/public/media/event/video/chunk-02.js',
]
const expected = {
  base64Length: 12804,
  byteLength: 9603,
  sha256: '7812d1f74db521288948ac8aebcd189065a9e7821d8f77cb8e506ea6141fa11c',
  ebmlMagic: '1a45dfa3',
  codec: 'vp8',
  width: 160,
  height: 90,
  durationSeconds: 72,
}

const failures = []
let encoded = ''
for (const relative of chunkPaths) {
  const absolute = path.join(root, relative)
  if (!fs.existsSync(absolute)) {
    failures.push(`${relative} is missing`)
    continue
  }
  const source = fs.readFileSync(absolute, 'utf8')
  const match = source.match(/\+'([A-Za-z0-9+/=]+)';?\s*$/)
  if (!match) {
    failures.push(`${relative} does not contain one terminal base64 append`)
    continue
  }
  encoded += match[1]
}

if (encoded.length !== expected.base64Length) failures.push(`base64 length ${encoded.length}; expected ${expected.base64Length}`)
if (!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) failures.push('payload contains non-base64 characters')

let bytes = Buffer.alloc(0)
try {
  bytes = Buffer.from(encoded, 'base64')
} catch (error) {
  failures.push(`payload failed to decode: ${error instanceof Error ? error.message : String(error)}`)
}

if (bytes.length !== expected.byteLength) failures.push(`decoded byte length ${bytes.length}; expected ${expected.byteLength}`)
const sha256 = createHash('sha256').update(bytes).digest('hex')
if (sha256 !== expected.sha256) failures.push(`sha256 ${sha256}; expected ${expected.sha256}`)
const magic = bytes.subarray(0, 4).toString('hex')
if (magic !== expected.ebmlMagic) failures.push(`EBML magic ${magic}; expected ${expected.ebmlMagic}`)

const playerPath = path.join(root, 'urai-tier1/public/media/event/offline-video.html')
if (!fs.existsSync(playerPath)) {
  failures.push('offline-video.html is missing')
} else {
  const player = fs.readFileSync(playerPath, 'utf8')
  for (const required of [
    'video/chunk-00.js',
    'video/chunk-01.js',
    'video/chunk-02.js',
    'Synthetic sample content only',
    'Event, Home, Life Map, Focus, Replay, Mirror, Passport, and Status',
    'founder-event-storyboard.svg',
    'duration < 70 || duration > 74',
  ]) {
    if (!player.includes(required)) failures.push(`offline-video.html is missing: ${required}`)
  }
  for (const forbidden of ['fetch(', 'XMLHttpRequest', 'WebSocket(', 'EventSource(']) {
    if (player.includes(forbidden)) failures.push(`offline-video.html contains network-capable call: ${forbidden}`)
  }
}

const evidencePath = path.join(root, 'urai-tier1/public/media/event/video/verification.json')
if (!fs.existsSync(evidencePath)) {
  failures.push('video/verification.json is missing')
} else {
  try {
    const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'))
    for (const key of ['sha256', 'byteLength', 'codec', 'width', 'height', 'durationSeconds']) {
      if (evidence[key] !== expected[key]) failures.push(`verification.json ${key}=${evidence[key]}; expected ${expected[key]}`)
    }
    if (evidence.fullDecode !== 'passed') failures.push('verification.json must record fullDecode=passed')
    if (evidence.sampleDataOnly !== true) failures.push('verification.json must record sampleDataOnly=true')
  } catch (error) {
    failures.push(`verification.json is invalid: ${error instanceof Error ? error.message : String(error)}`)
  }
}

if (failures.length) {
  console.error('Embedded founder event video verification failed:')
  failures.forEach((failure) => console.error(`- ${failure}`))
  process.exit(1)
}

console.log(`Embedded founder event video verified: ${bytes.length} bytes, sha256 ${sha256}`)
