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
  base64Length: 29684,
  byteLength: 22263,
  sha256: '1280a31745e5cfc98eea64f733468daa064ce1d799026f98090485bedb1f8c6c',
  ebmlMagic: '1a45dfa3',
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
  ]) {
    if (!player.includes(required)) failures.push(`offline-video.html is missing: ${required}`)
  }
  for (const forbidden of ['fetch(', 'XMLHttpRequest', 'WebSocket(', 'EventSource(']) {
    if (player.includes(forbidden)) failures.push(`offline-video.html contains network-capable call: ${forbidden}`)
  }
}

if (failures.length) {
  console.error('Embedded founder event video verification failed:')
  failures.forEach((failure) => console.error(`- ${failure}`))
  process.exit(1)
}

console.log(`Embedded founder event video verified: ${bytes.length} bytes, sha256 ${sha256}`)
