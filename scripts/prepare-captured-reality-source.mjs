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
  const result = spawnSync(name, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 16 * 1024 * 1024 })
  if (result.status !== 0) throw new Error(`${name} failed: ${String(result.stderr || result.stdout).slice(0, 1200)}`)
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
const durationArg = arg('duration-seconds')
const durationSeconds = process.argv.includes('--duration-seconds') ? Number(durationArg) : null

if (!source || !fs.existsSync(source) || !fs.statSync(source).isFile()) fail('--source must be an existing local file')
if (!Number.isInteger(segmentSeconds) || segmentSeconds < 20 || segmentSeconds > 180) fail('--segment-seconds must be an integer from 20 to 180')
if (durationSeconds !== null && (!Number.isFinite(durationSeconds) || durationSeconds <= 0)) fail('--duration-seconds must be a positive finite number')
for (const binary of ['ffmpeg', 'ffprobe']) {
  const probe = spawnSync(binary, ['-version'], { encoding: 'utf8' })
  if (probe.status !== 0) fail(`${binary} is required`)
}

const before = fs.statSync(source)
const originalSha256 = sha256(source)
const probeJson = JSON.parse(command('ffprobe', [
  '-v', 'error',
  '-show_entries', 'format=duration,start_time,size,bit_rate:stream=index,codec_type,codec_name,width,height,r_frame_rate,time_base,start_time:stream_tags=rotate:stream_side_data=rotation',
  '-of', 'json',
  source,
]))

fs.mkdirSync(outDir, { recursive: true })
const base = path.basename(source, path.extname(source)).replace(/[^A-Za-z0-9._-]+/g, '_')
const receiptPath = path.join(outDir, `${base}_DERIVATIVE_RECEIPT.json`)
const existing = fs.readdirSync(outDir).some((name) =>
  name === path.basename(receiptPath) || (name.startsWith(`${base}_PART`) && name.endsWith('.mp4')),
)
if (existing) fail('output contains prior derivatives or receipt for this source; select a fresh --out-dir to preserve provenance')

const stage = fs.mkdtempSync(path.join(outDir, '.source-preparation-'))
let derivatives
let mode = 'stream-copy'
let copyFallbackReason = null
try {
  const pattern = path.join(stage, `${base}_PART%03d.mp4`)
  const listPath = path.join(stage, 'segments.csv')
  const bound = durationSeconds === null ? [] : ['-t', String(durationSeconds)]
  const segmentArgs = [
    '-f', 'segment', '-segment_time', String(segmentSeconds),
    '-segment_list', listPath, '-segment_list_type', 'csv',
    '-reset_timestamps', '1', pattern,
  ]
  const copied = spawnSync('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-n', '-i', source,
    ...bound, '-map', '0', '-c', 'copy', ...segmentArgs,
  ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 16 * 1024 * 1024 })
  const oversizeCopy = fs.readdirSync(stage).some((name) => name.endsWith('.mp4') && fs.statSync(path.join(stage, name)).size > MAX_DERIVATIVE_BYTES)
  if (copied.status !== 0 || oversizeCopy) {
    copyFallbackReason = copied.status !== 0 ? 'STREAM_COPY_CONTAINER_INCOMPATIBLE_OR_FAILED' : 'STREAM_COPY_EXCEEDED_TRANSFER_CEILING'
    // Delete only this invocation's temporary outputs. Never mix two attempts.
    for (const name of fs.readdirSync(stage)) fs.unlinkSync(path.join(stage, name))
    mode = 'analysis-proxy'
    command('ffmpeg', [
      '-hide_banner', '-loglevel', 'error', '-n', '-i', source, ...bound,
      '-map', '0:v:0', '-map', '0:a?',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '192k',
      '-force_key_frames', `expr:gte(t,n_forced*${segmentSeconds})`,
      ...segmentArgs,
    ])
  }
  const timeline = new Map()
  // FFmpeg quotes CSV filenames that contain commas; source basenames are sanitized.
  for (const line of fs.readFileSync(listPath, 'utf8').trim().split(/\r?\n/)) {
    const match = line.match(/^(?:"((?:[^"]|"")*)"|([^,]+)),([^,]+),([^,]+)$/)
    if (!match) throw new Error('ffmpeg produced an invalid segment timeline')
    const fileName = path.basename((match[1] ?? match[2]).replace(/""/g, '"'))
    const start = Number(match[3]), end = Number(match[4])
    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start || timeline.has(fileName)) throw new Error('ffmpeg produced an invalid segment interval')
    timeline.set(fileName, { startSeconds: start, endSeconds: end })
  }
  derivatives = fs.readdirSync(stage)
    .filter((name) => name.startsWith(`${base}_PART`) && name.endsWith('.mp4'))
    .sort()
    .map((name) => {
      const file = path.join(stage, name)
      const stat = fs.statSync(file)
      if (stat.size > MAX_DERIVATIVE_BYTES) throw new Error(`${name} is ${stat.size} bytes and exceeds the 240 MiB analysis ceiling; rerun with a shorter --segment-seconds value`)
      const segment = timeline.get(name)
      if (!segment) throw new Error('derivative is missing its source timeline binding')
      const derivativeProbe = JSON.parse(command('ffprobe', ['-v', 'error', '-show_entries', 'format=duration,start_time:stream=index,codec_type,codec_name,width,height,time_base,start_time:stream_tags=rotate:stream_side_data=rotation', '-of', 'json', file]))
      return {
        fileName: name,
        byteSize: stat.size,
        sha256: sha256(file),
        sourceTimeline: {
          basis: 'FFMPEG_SEGMENT_MUXER_UNRESET_TIMELINE',
          startSeconds: segment.startSeconds,
          endSeconds: segment.endSeconds,
          sourceFormatStartSeconds: Number(probeJson.format?.start_time ?? 0),
          outputTimestampsReset: true,
          precision: 'CONTAINER_TIMING_NOT_FRAME_OR_SAMPLE_CORRESPONDENCE',
        },
        probe: derivativeProbe,
      }
    })
  if (!derivatives.length || derivatives.length !== timeline.size) throw new Error('ffmpeg produced an incomplete derivative set')
  const after = fs.statSync(source)
  if (before.size !== after.size || before.mtimeMs !== after.mtimeMs || sha256(source) !== originalSha256) throw new Error('immutable source changed during derivative creation')
  for (const derivative of derivatives) fs.renameSync(path.join(stage, derivative.fileName), path.join(outDir, derivative.fileName))
} catch (error) {
  fs.rmSync(stage, { recursive: true, force: true })
  fail(error.message)
} finally {
  fs.rmSync(stage, { recursive: true, force: true })
}

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
    mode,
    codec: mode === 'stream-copy' ? 'original-streams-preserved' : 'h264+aac',
    videoCrf: mode === 'stream-copy' ? null : 18,
    copyFallbackReason,
    requestedSourceDurationSeconds: durationSeconds,
    timelinePrecision: 'CONTAINER_TIMING_NOT_FRAME_OR_SAMPLE_CORRESPONDENCE',
    purpose: 'private captured-reality analysis and reconstruction input',
  },
  derivatives,
}

fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + '\n')
console.log(JSON.stringify({ ok: true, receiptPath, derivativeCount: derivatives.length, originalSha256 }, null, 2))
