#!/usr/bin/env node
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const files = {
  atlas: 'urai-tier1/public/assets/urai/generated/textures/spatial-particle-atlas-v1.svg',
  materials: 'urai-tier1/public/assets/urai/generated/textures/global-cinematic-material-pack-v1.json',
  loading: 'urai-tier1/public/assets/urai/generated/loading/urai-loading-sequence-v1.json',
  audioScore: 'urai-tier1/public/assets/urai/generated/audio/urai-ambient-bed-v1.json',
  audioOpus: 'urai-tier1/public/assets/urai/generated/audio/urai-ambient-bed-v1.opus',
  consumer: 'urai-tier1/src/spatial/scene/SpatialWorldAssetLayer.tsx',
}

const read = (key) => fs.readFileSync(path.join(root, files[key]))
const text = (key) => read(key).toString('utf8')
const sha256 = (payload) => crypto.createHash('sha256').update(payload).digest('hex')

const atlas = text('atlas')
assert.match(atlas, /^<svg[^>]+width="1024"[^>]+height="1024"/)
assert.match(atlas, /<\/svg>\s*$/)
assert.equal((atlas.match(/<circle /g) ?? []).length, 4)
assert.ok(read('atlas').length <= 524288)

const materials = JSON.parse(text('materials'))
assert.equal(materials.version, 'global-cinematic-material-pack-v1')
assert.ok(materials.materials.portalEnergy.baseColor)
assert.ok(read('materials').length <= 262144)

const loading = JSON.parse(text('loading'))
assert.equal(loading.version, 'urai-loading-sequence-v1')
assert.equal(loading.durationMs, 2200)
assert.equal(loading.frames.at(-1).state, 'complete')
assert.ok(read('loading').length <= 262144)

const audio = JSON.parse(text('audioScore'))
assert.equal(audio.version, 'urai-ambient-bed-v1')
assert.equal(audio.userControlled, true)
assert.equal(audio.fallback, 'silent')
assert.ok(Array.isArray(audio.voices) && audio.voices.length >= 3)
assert.ok(audio.masterGain > 0 && audio.masterGain <= 1)

const opus = read('audioOpus')
assert.equal(opus.subarray(0, 4).toString('ascii'), 'OggS')
assert.ok(opus.includes(Buffer.from('OpusHead', 'ascii')))
assert.ok(opus.length <= 1048576)

const consumer = text('consumer')
for (const required of [
  '/assets/urai/generated/textures/spatial-particle-atlas-v1.svg',
  '/assets/urai/generated/textures/global-cinematic-material-pack-v1.json',
  '/assets/urai/generated/loading/urai-loading-sequence-v1.json',
  '/assets/urai/generated/audio/urai-ambient-bed-v1.json',
  '<SpatialSensoryLayer />',
]) assert.ok(consumer.includes(required), `Missing route consumption marker: ${required}`)

console.log(JSON.stringify({
  ok: true,
  files: Object.fromEntries(Object.entries(files).map(([key, relative]) => {
    const payload = read(key)
    return [key, { path: relative, bytes: payload.length, sha256: sha256(payload) }]
  })),
}, null, 2))
