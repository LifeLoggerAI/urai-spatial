import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

// Generated encoding fixtures exercise the actual installed FFmpeg lifecycle.
// They do not certify a real place, camera calibration, reconstruction or device.
const script = process.env.URAI_SOURCE_PREPARATION_TEST_SCRIPT
  ?? fileURLToPath(new URL('../../scripts/prepare-captured-reality-source.mjs', import.meta.url))
const hasFfmpeg = ['ffmpeg', 'ffprobe'].every((name) => spawnSync(name, ['-version']).status === 0)
const hash = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
const run = (name, args) => {
  const result = spawnSync(name, args, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 })
  assert.equal(result.status, 0, result.stderr)
  return result.stdout
}
const packetHashes = (file) => JSON.parse(run('ffprobe', [
  '-v', 'error', '-select_streams', 'v:0', '-show_packets', '-show_data_hash', 'sha256',
  '-show_entries', 'packet=data_hash', '-of', 'json', file,
])).packets.map((packet) => packet.data_hash)
function directory(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'urai-captured-timeline-'))
  try { fn(dir) } finally { fs.rmSync(dir, { recursive: true, force: true }) }
}

test('stream-copy preserves encoded evidence through multiple source-bound intervals', { skip: !hasFfmpeg }, () => directory((dir) => {
  const source = path.join(dir, 'original.mp4'), out = path.join(dir, 'derivatives')
  run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'testsrc2=s=64x64:r=10:d=42',
    '-c:v', 'libx264', '-crf', '7', '-g', '100', '-bf', '0', '-force_key_frames', 'expr:gte(t,n_forced*10)', source])
  const originalHash = hash(source)
  run(process.execPath, [script, '--source', source, '--out-dir', out, '--segment-seconds', '20'])
  const receipt = JSON.parse(fs.readFileSync(path.join(out, 'original_DERIVATIVE_RECEIPT.json'), 'utf8'))
  assert.equal(hash(source), originalHash)
  assert.equal(receipt.derivativePolicy.mode, 'stream-copy')
  assert.equal(receipt.derivatives.length, 3)
  assert.deepEqual(receipt.derivatives.flatMap((item) => packetHashes(path.join(out, item.fileName))), packetHashes(source))
  let end = 0
  for (const item of receipt.derivatives) {
    assert.ok(Math.abs(item.sourceTimeline.startSeconds - end) <= .11)
    assert.ok(item.sourceTimeline.endSeconds > item.sourceTimeline.startSeconds)
    assert.equal(item.sourceTimeline.outputTimestampsReset, true)
    assert.equal(item.sourceTimeline.precision, 'CONTAINER_TIMING_NOT_FRAME_OR_SAMPLE_CORRESPONDENCE')
    assert.equal(item.sha256, hash(path.join(out, item.fileName)))
    end = item.sourceTimeline.endSeconds
  }
  assert.ok(Math.abs(end - 42) <= .11)
  assert.deepEqual(fs.readdirSync(out).filter((name) => name.startsWith('.source-preparation-')), [])
}))

test('bounded preparation retains an original-linked prefix and reports its bound', { skip: !hasFfmpeg }, () => directory((dir) => {
  const source = path.join(dir, 'original.mp4'), out = path.join(dir, 'derivatives')
  run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'testsrc2=s=64x64:r=10:d=4',
    '-c:v', 'libx264', '-crf', '7', '-g', '10', '-bf', '0', source])
  const originalHash = hash(source)
  run(process.execPath, [script, '--source', source, '--out-dir', out, '--segment-seconds', '20', '--duration-seconds', '1.5'])
  const receipt = JSON.parse(fs.readFileSync(path.join(out, 'original_DERIVATIVE_RECEIPT.json'), 'utf8'))
  assert.equal(hash(source), originalHash)
  assert.equal(receipt.original.sha256, originalHash)
  assert.equal(receipt.derivativePolicy.requestedSourceDurationSeconds, 1.5)
  assert.equal(receipt.derivatives.length, 1)
  const copied = packetHashes(path.join(out, receipt.derivatives[0].fileName))
  assert.equal(copied.length, 15)
  assert.deepEqual(copied, packetHashes(source).slice(0, 15))
  assert.ok(receipt.derivatives[0].sourceTimeline.endSeconds < 1.61)
}))

test('unsupported copy codec falls back explicitly without mixing attempts', { skip: !hasFfmpeg }, () => directory((dir) => {
  const source = path.join(dir, 'original.mkv'), out = path.join(dir, 'derivatives')
  run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'testsrc2=s=64x64:r=10:d=0.4',
    '-f', 'lavfi', '-i', 'sine=frequency=300:duration=0.4', '-c:v', 'ffv1', '-c:a', 'pcm_s16le', source])
  const originalHash = hash(source)
  run(process.execPath, [script, '--source', source, '--out-dir', out, '--segment-seconds', '20'])
  const receipt = JSON.parse(fs.readFileSync(path.join(out, 'original_DERIVATIVE_RECEIPT.json'), 'utf8'))
  assert.equal(hash(source), originalHash)
  assert.equal(receipt.derivativePolicy.mode, 'analysis-proxy')
  assert.equal(receipt.derivativePolicy.copyFallbackReason, 'STREAM_COPY_CONTAINER_INCOMPATIBLE_OR_FAILED')
  assert.equal(receipt.derivatives.length, 1)
  assert.ok(receipt.derivatives[0].probe.streams.some((stream) => stream.codec_type === 'audio' && stream.codec_name === 'aac'))
  assert.equal(receipt.derivatives[0].sha256, hash(path.join(out, receipt.derivatives[0].fileName)))
  run('ffmpeg', ['-v', 'error', '-i', path.join(out, receipt.derivatives[0].fileName), '-f', 'null', '-'])
  assert.deepEqual(fs.readdirSync(out).filter((name) => name.startsWith('.source-preparation-')), [])
}))

test('missing or invalid duration cannot become unbounded processing', { skip: !hasFfmpeg }, () => directory((dir) => {
  const source = path.join(dir, 'original.mp4')
  run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'color=s=32x32:d=0.1', '-c:v', 'libx264', source])
  for (const suffix of [[], ['0'], ['-1'], ['NaN'], ['Infinity']]) {
    const result = spawnSync(process.execPath, [script, '--source', source, '--out-dir', path.join(dir, 'never-created'), '--duration-seconds', ...suffix], { encoding: 'utf8' })
    assert.notEqual(result.status, 0)
    assert.equal(fs.existsSync(path.join(dir, 'never-created')), false)
  }
}))

async function asynchronousDirectory(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'urai-captured-publication-'))
  try { await fn(dir) } finally { fs.rmSync(dir, { recursive: true, force: true }) }
}
function generatedSource(dir, color = 'red', duration = '0.4') {
  fs.mkdirSync(dir, { recursive: true })
  const source = path.join(dir, 'original.mp4')
  run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'color=c=' + color + ':s=64x64:r=5:d=' + duration,
    '-c:v', 'libx264', '-g', '100', '-bf', '0', source])
  return source
}
function startPreparation(source, out, preload) {
  const args = [...(preload ? ['--import', preload] : []), script, '--source', source, '--out-dir', out, '--segment-seconds', '20']
  const child = spawn(process.execPath, args, { stdio: ['ignore', 'pipe', 'pipe'] })
  let stdout = '', stderr = ''
  child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8')
  child.stdout.on('data', value => { stdout += value }); child.stderr.on('data', value => { stderr += value })
  const result = new Promise((resolve, reject) => {
    child.once('error', reject)
    child.once('close', (code, signal) => resolve({ code, signal, stdout, stderr }))
  })
  return { child, result }
}
async function stopPreparations(...runs) {
  for (const item of runs) if (item && item.child.exitCode === null && item.child.signalCode === null) item.child.kill('SIGKILL')
  await Promise.all(runs.filter(Boolean).map(item => item.result))
}
async function awaitBarrier(file, processRun) {
  const deadline = Date.now() + 10000
  while (!fs.existsSync(file)) {
    if (processRun.child.exitCode !== null || processRun.child.signalCode !== null) {
      const result = await processRun.result
      throw new Error('Preparation ended before barrier: ' + result.stderr)
    }
    assert.ok(Date.now() < deadline, 'Preparation must reach the controlled lifecycle barrier')
    await new Promise(resolve => setTimeout(resolve, 20))
  }
}
// These test-only preloads delay a real lifecycle edge or insert a competing
// local output. Actual FFmpeg, hashing, hard-link and filesystem work still run.
function lifecycleProbe(dir, mode, out, ready, release) {
  const preload = path.join(dir, 'lifecycle-probe.mjs')
  fs.writeFileSync(preload, [
    "import fs from 'node:fs'",
    "import path from 'node:path'",
    "import childProcess from 'node:child_process'",
    "import { syncBuiltinESMExports } from 'node:module'",
    'const config = ' + JSON.stringify({ mode, out, ready, release }),
    'let held = false',
    'function hold() {',
    '  if (held) return; held = true',
    "  fs.writeFileSync(config.ready, 'ready', { flag: 'wx' })",
    '  const deadline = Date.now() + 15000, state = new Int32Array(new SharedArrayBuffer(4))',
    '  while (!fs.existsSync(config.release)) {',
    "    if (Date.now() > deadline) throw new Error('Lifecycle probe timed out')",
    '    Atomics.wait(state, 0, 0, 20)',
    '  }',
    '}',
    'const actualSpawn = childProcess.spawnSync',
    'childProcess.spawnSync = function(name, args, ...rest) {',
    "  const segment = name === 'ffmpeg' && args.includes('segment')",
    "  if (segment && config.mode === 'pause-before-ffmpeg') hold()",
    '  const result = actualSpawn.call(this, name, args, ...rest)',
    "  if (segment && result.status === 0 && config.mode === 'collision-after-ffmpeg') fs.writeFileSync(path.join(config.out, 'original_PART000.mp4'), 'prior-output-must-survive', { flag: 'wx' })",
    '  return result',
    '}',
    'const actualLink = fs.linkSync',
    'fs.linkSync = function(source, target) {',
    '  const result = actualLink.call(this, source, target)',
    "  if (config.mode === 'pause-after-first-link' && path.dirname(target) === config.out && target.endsWith('.mp4')) hold()",
    '  return result',
    '}',
    'const actualRename = fs.renameSync',
    'fs.renameSync = function(source, target) {',
    '  const result = actualRename.call(this, source, target)',
    "  if (config.mode === 'pause-after-first-link' && path.dirname(target) === config.out && target.endsWith('.mp4')) hold()",
    '  return result',
    '}',
    'syncBuiltinESMExports()',
  ].join('\n') + '\n')
  return preload
}
function interruptedEvidence(out) {
  const lock = fs.readdirSync(out).find(name => name.startsWith('.source-preparation-lock-'))
  assert.ok(lock, 'An interrupted preparation keeps exclusive destination ownership')
  const ownerPath = path.join(out, lock, 'owner.json')
  const owner = JSON.parse(fs.readFileSync(ownerPath, 'utf8'))
  assert.equal(owner.classification, 'INCOMPLETE_UNTIL_FINAL_RECEIPT')
  const stage = path.join(out, owner.stageDirectory)
  const stagedReceiptPath = path.join(stage, owner.receiptFileName)
  const receipt = JSON.parse(fs.readFileSync(stagedReceiptPath, 'utf8'))
  assert.equal(receipt.original.sha256, owner.originalSha256)
  for (const item of receipt.derivatives) assert.equal(hash(path.join(stage, item.fileName)), item.sha256)
  return { ownerPath, owner, stage, stagedReceiptPath, receipt }
}
test('concurrent same-basename preparation cannot replace the first source provenance', { skip: !hasFfmpeg, timeout: 30000 }, async () => asynchronousDirectory(async dir => {
  const firstSource = generatedSource(path.join(dir, 'first'), 'red')
  const secondSource = generatedSource(path.join(dir, 'second'), 'blue')
  const firstHash = hash(firstSource), secondHash = hash(secondSource), out = path.join(dir, 'derivatives')
  const ready = path.join(dir, 'ready'), release = path.join(dir, 'release')
  const preload = lifecycleProbe(dir, 'pause-before-ffmpeg', out, ready, release)
  let first, second
  try {
    first = startPreparation(firstSource, out, preload)
    await awaitBarrier(ready, first)
    second = startPreparation(secondSource, out)
    const rejected = await second.result
    assert.notEqual(rejected.code, 0, 'The concurrent source cannot own the same destination')
    assert.match(rejected.stderr, /reserved or incomplete/)
    fs.writeFileSync(release, 'continue')
    const accepted = await first.result
    assert.equal(accepted.code, 0, accepted.stderr)
    const receipt = JSON.parse(fs.readFileSync(path.join(out, 'original_DERIVATIVE_RECEIPT.json'), 'utf8'))
    assert.equal(receipt.original.sha256, firstHash)
    for (const item of receipt.derivatives) assert.equal(hash(path.join(out, item.fileName)), item.sha256)
    assert.equal(hash(firstSource), firstHash); assert.equal(hash(secondSource), secondHash)
    assert.equal(fs.readdirSync(out).some(name => name.startsWith('.source-preparation-')), false)
  } finally { await stopPreparations(first, second) }
}))
test('a late competing output is never replaced and incomplete publication stays fenced', { skip: !hasFfmpeg, timeout: 30000 }, async () => asynchronousDirectory(async dir => {
  const source = generatedSource(path.join(dir, 'source')), originalHash = hash(source), out = path.join(dir, 'derivatives')
  const preload = lifecycleProbe(dir, 'collision-after-ffmpeg', out, path.join(dir, 'ready'), path.join(dir, 'release'))
  const preparation = startPreparation(source, out, preload)
  try {
    const rejected = await preparation.result
    assert.notEqual(rejected.code, 0)
    assert.match(rejected.stderr, /incomplete publication preserved/)
    assert.equal(fs.readFileSync(path.join(out, 'original_PART000.mp4'), 'utf8'), 'prior-output-must-survive')
    assert.equal(fs.existsSync(path.join(out, 'original_DERIVATIVE_RECEIPT.json')), false)
    assert.equal(hash(source), originalHash)
    const evidence = interruptedEvidence(out)
    assert.equal(evidence.owner.originalSha256, originalHash)
  } finally { await stopPreparations(preparation) }
}))
test('interruption after one real publication preserves staged proof and blocks retry without mutation', { skip: !hasFfmpeg, timeout: 30000 }, async () => asynchronousDirectory(async dir => {
  const source = generatedSource(path.join(dir, 'source'), 'red', '42'), originalHash = hash(source), out = path.join(dir, 'derivatives')
  const ready = path.join(dir, 'ready'), release = path.join(dir, 'release')
  const preload = lifecycleProbe(dir, 'pause-after-first-link', out, ready, release)
  const preparation = startPreparation(source, out, preload)
  try {
    await awaitBarrier(ready, preparation)
    preparation.child.kill('SIGKILL')
    const stopped = await preparation.result
    assert.equal(stopped.signal, 'SIGKILL')
    assert.equal(fs.existsSync(path.join(out, 'original_DERIVATIVE_RECEIPT.json')), false)
    const evidence = interruptedEvidence(out)
    assert.equal(evidence.owner.originalSha256, originalHash)
    assert.equal(evidence.receipt.derivatives.length, 3)
    const published = fs.readdirSync(out).filter(name => name.endsWith('.mp4'))
    assert.deepEqual(published, [evidence.receipt.derivatives[0].fileName])
    assert.equal(hash(path.join(out, published[0])), evidence.receipt.derivatives[0].sha256)
    const before = new Map([evidence.ownerPath, evidence.stagedReceiptPath, ...evidence.receipt.derivatives.map(item => path.join(evidence.stage, item.fileName)), ...published.map(name => path.join(out, name))].map(file => [file, hash(file)]))
    const retry = startPreparation(source, out)
    const rejected = await retry.result
    assert.notEqual(rejected.code, 0)
    assert.match(rejected.stderr, /reserved or incomplete/)
    for (const [file, digest] of before) assert.equal(hash(file), digest)
    assert.equal(hash(source), originalHash)
  } finally { await stopPreparations(preparation) }
}))
