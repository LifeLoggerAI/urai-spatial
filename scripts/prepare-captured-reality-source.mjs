#!/usr/bin/env node
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const MAX_DERIVATIVE_BYTES = 240 * 1024 * 1024

function fail(message) {
  console.error(`[FAIL] ${message}`)
  process.exit(1)
}

function arg(name, fallback = '') {
  const index = process.argv.indexOf(`--${name}`)
  return index >= 0 ? String(process.argv[index + 1] ?? '') : fallback
}

function command(name, args) {
  const result = spawnSync(name, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  if (result.status !== 0) fail(`${name} failed: ${String(result.stderr || result.stdout).slice(0, 1200)}`)
  return String(result.stdout || '')
}

function sha256(file) {
  const hash = crypto.createHash('sha256')
  const fd = fs.openSync(file, 'r')
  const buffer = Buffer.allocUnsafe(8 * 1024 * 1024)
  try {
    let bytes = 0
    do {
      bytes = fs.readSync(fd, buffer, 0, buffer.length, null)
      if (bytes > 0) hash.update(buffer.subarray(0, bytes))
    } while (bytes > 0)
  } finally {
    fs.closeSync(fd)
  }
  return hash.digest('hex')
}

const source = path.resolve(arg('source'))
const outDir = path.resolve(arg('out-dir', './captured-reality-derivatives'))
const segmentSeconds = Number(arg('segment-seconds', '90'))

if (!source || !fs.existsSync(source) || !fs.statSync(source).isFile()) fail('--source must be an existing local file')
if (!Number.isInteger(segmentSeconds) || segmentSeconds < 20 || segmentSeconds > 180) fail('--segment-seconds must be an integer from 20 to 180')
for (const binary of ['ffmpeg', 'ffprobe']) {
  const probe = spawnSync(binary, ['-version'], { encoding: 'utf8' })
  if (probe.status !== 0) fail(`${binary} is required`)
}

const before = fs.statSync(source)
const originalSha256 = sha256(source)
const probeJson = JSON.parse(command('ffprobe', [
  '-v', 'error',
  '-show_entries', 'format=duration,size,bit_rate:stream=index,codec_type,codec_name,width,height,r_frame_rate',
  '-of', 'json',
  source,
]))

fs.mkdirSync(outDir, { recursive: true })
const base = path.basename(source, path.extname(source)).replace(/[^A-Za-z0-9._-]+/g, '_')
const pattern = path.join(outDir, `${base}_PART%03d.mp4`)
const receiptPath = path.join(outDir, `${base}_DERIVATIVE_RECEIPT.json`)
const existing = fs.readdirSync(outDir).some((name) =>
  name === path.basename(receiptPath) || (name.startsWith(`${base}_PART`) && name.endsWith('.mp4')),
)
if (existing) fail('output contains prior derivatives or receipt for this source; select a fresh --out-dir to preserve provenance')

command('ffmpeg', [
  '-hide_banner', '-loglevel', 'error', '-n',
  '-i', source,
  '-map', '0:v:0', '-map', '0:a?',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '18',
  '-pix_fmt', 'yuv420p',
  '-c:a', 'aac', '-b:a', '192k',
  '-force_key_frames', `expr:gte(t,n_forced*${segmentSeconds})`,
  '-f', 'segment', '-segment_time', String(segmentSeconds),
  '-reset_timestamps', '1',
  pattern,
])

const after = fs.statSync(source)
if (before.size !== after.size || before.mtimeMs !== after.mtimeMs || sha256(source) !== originalSha256) {
  fail('immutable source changed during derivative creation')
}

const derivatives = fs.readdirSync(outDir)
  .filter((name) => name.startsWith(`${base}_PART`) && name.endsWith('.mp4'))
  .sort()
  .map((name) => {
    const file = path.join(outDir, name)
    const stat = fs.statSync(file)
    if (stat.size > MAX_DERIVATIVE_BYTES) {
      fail(`${name} is ${stat.size} bytes and exceeds the 240 MiB analysis ceiling; rerun with a shorter --segment-seconds value`)
    }
    return {
      fileName: name,
      byteSize: stat.size,
      sha256: sha256(file),
    }
  })

if (!derivatives.length) fail('ffmpeg produced no derivatives')

const receipt = {
  schema: 'urai-captured-reality-source-derivative-v1',
  classification: 'ANALYSIS_DERIVATIVE_NOT_SOURCE_AUTHORITY',
  generatedAt: new Date().toISOString(),
  original: {
    fileName: path.basename(source),
    byteSize: before.size,
    sha256: originalSha256,
    probe: probeJson,
    immutableVerified: true,
  },
  derivativePolicy: {
    maxBytes: MAX_DERIVATIVE_BYTES,
    segmentSeconds,
    codec: 'h264+aac',
    videoCrf: 18,
    purpose: 'private captured-reality analysis and reconstruction input',
  },
  derivatives,
}

fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + '\n')
console.log(JSON.stringify({ ok: true, receiptPath, derivativeCount: derivatives.length, originalSha256 }, null, 2))
