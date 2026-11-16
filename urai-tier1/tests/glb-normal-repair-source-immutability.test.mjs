import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { HOME_NORMAL_PREDECESSOR, deriveHomeNormalRepair, verifyHomeNormalRepair } from '../../scripts/lib/home-normal-repair.mjs'
import { verifyGlbNormalIntegrity } from '../../scripts/lib/glb-normal-integrity.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url))
const fixtureFiles = [
  'scripts/capture-home-state-proof.mjs',
  'scripts/repair-home-glb-pole-normals.mjs',
  'scripts/lib/glb-normal-integrity.mjs',
  'scripts/lib/home-normal-repair.mjs',
  'scripts/vendor/meshopt_encoder.module.mjs',
  'scripts/vendor/meshopt_encoder.provenance.json',
  HOME_NORMAL_PREDECESSOR.archivePath,
  'operations/assets/normal-repair-receipts/home-entry-chamber-v1.json',
  'operations/assets/production-receipts/home-entry-chamber-v1.json',
  'operations/assets/promotion-decisions/home-entry-chamber-v1.json',
  'scripts/vendor/meshopt_decoder.module.mjs',
  'scripts/vendor/meshopt_decoder.LICENSE.MIT',
  'scripts/vendor/meshopt_decoder.provenance.json',
  'operations/assets/generated-receipts/urai-final-glb-pack-v1.json',
]
for (const id of ['home-entry-chamber-v1', 'life-map-memory-star-v1', 'passport-status-room-v1', 'portal-ring-master-v1', 'urai-orb-avatar-v1']) {
  fixtureFiles.push(`urai-tier1/public/assets/urai/generated/models/${id}.glb`, `operations/assets/generated-receipts/${id}.json`, `operations/assets/promotion-rehearsal/${id}.json`)
}

test('rerunning bounded GLB repair on corrected assets preserves all bytes and current Home proof assertions in CI', () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'urai-glb-repair-'))
  try {
    const original = new Map()
    for (const relative of fixtureFiles) {
      const destination = path.join(fixture, relative)
      fs.mkdirSync(path.dirname(destination), { recursive: true })
      fs.copyFileSync(path.join(root, relative), destination)
      original.set(relative, fs.readFileSync(destination))
    }
    // A Git index exposes unintended CI staging as well as byte mutations.
    const initialized = spawnSync('git', ['init', '-q'], { cwd: fixture, encoding: 'utf8' })
    assert.equal(initialized.status, 0, initialized.stderr)
    const result = spawnSync(process.execPath, ['scripts/repair-home-glb-pole-normals.mjs'], { cwd: fixture, env: { ...process.env, GITHUB_ACTIONS: 'true' }, encoding: 'utf8' })
    assert.equal(result.status, 0, result.stdout + result.stderr)
    const report = JSON.parse(result.stdout)
    assert.equal(report.changed, false)
    assert.ok(report.assets.every((asset) => asset.changed === false))
    for (const [relative, bytes] of original) assert.deepEqual(fs.readFileSync(path.join(fixture, relative)), bytes, `repair unexpectedly changed ${relative}`)
    const staged = spawnSync('git', ['diff', '--cached', '--name-only'], { cwd: fixture, encoding: 'utf8' })
    assert.equal(staged.status, 0, staged.stderr)
    assert.equal(staged.stdout.trim(), '', 'idempotent asset repair must not stage proof or source changes')
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true })
  }
})

function withFixture(run) {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'urai-glb-repair-adversarial-'))
  try {
    for (const relative of fixtureFiles) {
      const destination = path.join(fixture, relative)
      fs.mkdirSync(path.dirname(destination), { recursive: true })
      fs.copyFileSync(path.join(root, relative), destination)
    }
    return run(fixture)
  } finally { fs.rmSync(fixture, { recursive: true, force: true }) }
}

const homePath = 'urai-tier1/public/assets/urai/generated/models/home-entry-chamber-v1.glb'
const homeReceipt = 'operations/assets/generated-receipts/home-entry-chamber-v1.json'
const homeRehearsal = 'operations/assets/promotion-rehearsal/home-entry-chamber-v1.json'
const packPath = 'operations/assets/generated-receipts/urai-final-glb-pack-v1.json'
const read = (fixture, relative) => JSON.parse(fs.readFileSync(path.join(fixture, relative), 'utf8'))
const write = (fixture, relative, value) => fs.writeFileSync(path.join(fixture, relative), JSON.stringify(value, null, 2) + '\n')
function rejectWithoutMutation(fixture, expected) {
  const before = new Map(fixtureFiles.map((relative) => [relative, fs.readFileSync(path.join(fixture, relative))]))
  const result = spawnSync(process.execPath, ['scripts/repair-home-glb-pole-normals.mjs'], { cwd: fixture, env: { ...process.env, GITHUB_ACTIONS: 'true' }, encoding: 'utf8' })
  assert.notEqual(result.status, 0, 'unrecognized/altered source must not authorize repair retirement')
  assert.match(result.stdout + result.stderr, expected)
  for (const [relative, bytes] of before) assert.deepEqual(fs.readFileSync(path.join(fixture, relative)), bytes, `rejected source unexpectedly mutated ${relative}`)
}

test('altered successor bytes cannot retire the missing historical target', () => withFixture((fixture) => {
  const file = path.join(fixture, homePath), bytes = fs.readFileSync(file)
  bytes[bytes.length - 1] ^= 1
  fs.writeFileSync(file, bytes)
  rejectWithoutMutation(fixture, /exact canonical identity mismatch/)
}))

test('rebinding receipts cannot grant an altered successor canonical identity', () => withFixture((fixture) => {
  const file = path.join(fixture, homePath), bytes = fs.readFileSync(file)
  bytes[bytes.length - 1] ^= 1
  fs.writeFileSync(file, bytes)
  // A fabricated caller-side receipt is never an independent canonical source.
  const sha256 = 'a'.repeat(64)
  for (const relative of [homeReceipt, homeRehearsal]) { const record = read(fixture, relative); record.sha256 = sha256; write(fixture, relative, record) }
  const pack = read(fixture, packPath); pack.assets.find((entry) => entry.fileName === 'home-entry-chamber-v1.glb').sha256 = sha256; write(fixture, packPath, pack)
  rejectWithoutMutation(fixture, /exact canonical identity mismatch/)
}))

for (const [name, mutate, expected] of [
  ['stale generated receipt', (fixture) => { const value = read(fixture, homeReceipt); value.bytes += 4; write(fixture, homeReceipt, value) }, /generated receipt binding mismatch/],
  ['stale source recovery identity', (fixture) => { const value = read(fixture, homeReceipt); value.measurementReconciliation.sourceSha = 'a'.repeat(40); write(fixture, homeReceipt, value) }, /generated receipt binding mismatch/],
  ['stale pack receipt', (fixture) => { const value = read(fixture, packPath); value.assets.find((entry) => entry.fileName === 'home-entry-chamber-v1.glb').sha256 = 'a'.repeat(64); write(fixture, packPath, value) }, /pack receipt binding mismatch/],
  ['duplicate pack identity', (fixture) => { const value = read(fixture, packPath); value.assets.push({ ...value.assets.find((entry) => entry.fileName === 'home-entry-chamber-v1.glb') }); write(fixture, packPath, value) }, /pack receipt binding mismatch/],
  ['stale rehearsal', (fixture) => { const value = read(fixture, homeRehearsal); value.bytes = 1786808; value.sha256 = '73f2a49ed2cfd6cd7ae9baed7b3908d53e0cac75b9f36ff1b8be9654e3d3e2f2'; write(fixture, homeRehearsal, value) }, /fail-closed rehearsal binding mismatch/],
  ['claimed human approval', (fixture) => { const value = read(fixture, homeRehearsal); value.humanReviewApproved = true; write(fixture, homeRehearsal, value) }, /fail-closed rehearsal binding mismatch/],
  ['stale normal repair proof binding', (fixture) => { const value = read(fixture, homeReceipt); value.normalRepair.receiptSha256 = 'a'.repeat(64); write(fixture, homeReceipt, value) }, /normal repair receipt binding mismatch/],
  ['altered normal repair proof', (fixture) => { const file = 'operations/assets/normal-repair-receipts/home-entry-chamber-v1.json'; const value = read(fixture, file); value.geometryTopologyMaterialsNodesSkinsAnimationsUntouched = false; write(fixture, file, value) }, /normal repair proof integrity mismatch/],
  ['altered predecessor archive', (fixture) => { const file = path.join(fixture, HOME_NORMAL_PREDECESSOR.archivePath); const bytes = fs.readFileSync(file); bytes[bytes.length - 1] ^= 1; fs.writeFileSync(file, bytes) }, /exact predecessor identity mismatch/],
  ['claimed successor exact-head approval', (fixture) => { const value = read(fixture, homeRehearsal); value.exactHeadChecksPassed = true; write(fixture, homeRehearsal, value) }, /fail-closed rehearsal binding mismatch/],
  ['claimed successor deployment', (fixture) => { const file = 'operations/assets/production-receipts/home-entry-chamber-v1.json'; const value = read(fixture, file); value.deploymentAuthorized = true; write(fixture, file, value) }, /non-authorizing production receipt mismatch/],
  ['claimed paid execution', (fixture) => { const file = 'operations/assets/promotion-decisions/home-entry-chamber-v1.json'; const value = read(fixture, file); value.paidExecutionAuthorized = true; write(fixture, file, value) }, /non-authorizing promotion decision mismatch/],
  ['stale historical promotion identity', (fixture) => { const file = 'operations/assets/promotion-decisions/home-entry-chamber-v1.json'; const value = read(fixture, file); value.historicalPromotion.sha256 = value.sha256; write(fixture, file, value) }, /non-authorizing promotion decision mismatch/],
]) test(`${name} fails without modifying source or artifacts`, () => withFixture((fixture) => { mutate(fixture); rejectWithoutMutation(fixture, expected) }))

function syntheticNormalGlb({ component = 5126, normalized = false, vector = [0, 1, 0], count = 1, bufferLength, bounds } = {}) {
  const width = component === 5126 ? 4 : 2, stride = component === 5126 ? 12 : 8, bin = Buffer.alloc(stride)
  vector.forEach((value, axis) => component === 5126 ? bin.writeFloatLE(value, axis * width) : bin.writeInt16LE(value, axis * width))
  const json = { asset: { version: '2.0' }, buffers: [{ byteLength: bufferLength ?? bin.length }], bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: bin.length, byteStride: stride }], accessors: [{ bufferView: 0, byteOffset: 0, componentType: component, type: 'VEC3', count, normalized, ...bounds }, { bufferView: 0, byteOffset: 0, componentType: component, type: 'VEC3', count }], meshes: [{ primitives: [{ attributes: { NORMAL: 0, POSITION: 1 } }] }] }
  if (component !== 5126) json.extensionsRequired = ['KHR_mesh_quantization']
  const text = Buffer.from(JSON.stringify(json)), padded = Buffer.alloc(Math.ceil(text.length / 4) * 4, 0x20)
  text.copy(padded)
  const glb = Buffer.alloc(12 + 8 + padded.length + 8 + bin.length)
  glb.writeUInt32LE(0x46546c67, 0); glb.writeUInt32LE(2, 4); glb.writeUInt32LE(glb.length, 8)
  glb.writeUInt32LE(padded.length, 12); glb.writeUInt32LE(0x4e4f534a, 16); padded.copy(glb, 20)
  const at = 20 + padded.length; glb.writeUInt32LE(bin.length, at); glb.writeUInt32LE(0x004e4942, at + 4); bin.copy(glb, at + 8)
  return glb
}

test('finite unit FLOAT normals pass the unchanged1e-5 precision rule', async () => {
  const result = await verifyGlbNormalIntegrity(syntheticNormalGlb())
  assert.equal(result.checkedVectors, 1)
  assert.equal(result.floatAndLightingUnitTolerance, 1e-5)
})

test('quantized normals explicitly require lighting renormalization rather than raw unit claims', async () => {
  const result = await verifyGlbNormalIntegrity(syntheticNormalGlb({ component: 5122, normalized: true, vector: [16384, 0, 16384] }))
  assert.equal(result.quantizedLightingRenormalizationRequired, true)
  assert.equal(result.quantizedVectors, 1)
  assert.ok(result.maxQuantizedRawUnitDeviation > .2)
})

for (const [name, options, expected] of [
  ['zero FLOAT normal', { vector: [0, 0, 0] }, /non-unit NORMAL/],
  ['zero quantized normal', { component: 5122, normalized: true, vector: [0, 0, 0] }, /zero quantized NORMAL/],
  ['non-finite FLOAT normal', { vector: [NaN, 1, 0] }, /non-finite NORMAL/],
  ['non-unit FLOAT normal', { vector: [0, .99, 0] }, /non-unit NORMAL/],
  ['unnormalized quantized type', { component: 5122, normalized: false, vector: [0, 32767, 0] }, /invalid NORMAL component\/quantization/],
  ['accessor beyond view', { count: 2 }, /NORMAL accessor exceeds bufferView/],
  ['embedded buffer beyond BIN', { bufferLength: 16 }, /invalid embedded buffer identity\/extent/],
  ['false accessor bounds', { bounds: { min: [0, 0, 0], max: [0, .5, 0] } }, /exceeds declared bounds/],
]) test(`${name} fails closed`, async () => { await assert.rejects(verifyGlbNormalIntegrity(syntheticNormalGlb(options)), expected) })


test('immutable predecessor retains the real zero-normal failure', async () => {
  const predecessor = fs.readFileSync(path.join(root, HOME_NORMAL_PREDECESSOR.archivePath))
  assert.equal(predecessor.length, 184160)
  await assert.rejects(verifyGlbNormalIntegrity(predecessor, 'Historical predecessor'), /zero quantized NORMAL 119:3/)
})

test('exact same-position repair is deterministic and changes only14NORMAL vectors', async () => {
  const predecessor = fs.readFileSync(path.join(root, HOME_NORMAL_PREDECESSOR.archivePath)), original = Buffer.from(predecessor)
  const first = await deriveHomeNormalRepair(predecessor), second = await deriveHomeNormalRepair(predecessor)
  assert.deepEqual(predecessor, original, 'derivation must preserve its immutable input')
  assert.deepEqual(first.candidate, second.candidate, 'pinned encoder must reproduce exact candidate bytes')
  assert.deepEqual(first.candidate, fs.readFileSync(path.join(root, homePath)))
  assert.equal(first.proof.changedNormalVectors, 14)
  assert.equal(first.proof.changedNormalBufferViews, 7)
  assert.equal(first.proof.allBufferViewsDecoded, 177)
  assert.equal(first.proof.allAccessorsVerified, 204)
  assert.equal(first.proof.decodedByteChanges.reduce((sum, view) => sum + view.byteOffsets.length, 0), 28)
  assert.equal(first.proof.originalBinPrefixBytesPreserved, 59876)
  assert.equal(first.proof.geometryTopologyMaterialsNodesSkinsAnimationsUntouched, true)
  assert.ok(first.proof.repairs.every((repair) => repair.samePositionExact && repair.adjacentNondegenerateTriangles === 0))
  const integrity = await verifyGlbNormalIntegrity(first.candidate)
  assert.equal(integrity.checkedVectors, 4236)
  assert.equal(integrity.accessorCount, 85)
  assert.equal(integrity.quantizedLightingRenormalizationRequired, true)
  assert.ok(integrity.maxQuantizedRawUnitDeviation > .001)
})

test('a corrupted predecessor cannot acquire normal-repair authority', async () => {
  const predecessor = fs.readFileSync(path.join(root, HOME_NORMAL_PREDECESSOR.archivePath)); predecessor[predecessor.length - 1] ^= 1
  await assert.rejects(deriveHomeNormalRepair(predecessor), /exact predecessor identity mismatch/)
})

function editCandidateJson(bytes, edit) {
  const sourceLength = bytes.readUInt32LE(12), sourceBin = 20 + sourceLength
  const json = JSON.parse(bytes.subarray(20, sourceBin).toString()); edit(json)
  const text = Buffer.from(JSON.stringify(json)), chunk = Buffer.alloc(Math.ceil(text.length / 4) * 4, 0x20); text.copy(chunk)
  const bin = bytes.subarray(sourceBin + 8), output = Buffer.alloc(28 + chunk.length + bin.length)
  bytes.subarray(0, 12).copy(output); output.writeUInt32LE(output.length, 8)
  output.writeUInt32LE(chunk.length, 12); output.writeUInt32LE(0x4e4f534a, 16); chunk.copy(output, 20)
  const at = 20 + chunk.length; output.writeUInt32LE(bin.length, at); output.writeUInt32LE(0x004e4942, at + 4); bin.copy(output, at + 8)
  return output
}

for (const [name, edit, error] of [
  ['material changes', (json) => { json.materials[0].name += '-altered' }, /JSON changed outside/],
  ['node scale changes', (json) => { json.nodes[0].scale = [2, 2, 2] }, /JSON changed outside/],
  ['animation changes', (json) => { json.animations[0].name += '-altered' }, /JSON changed outside/],
  ['normal accessor type changes', (json) => { json.accessors[119].normalized = false }, /JSON changed outside/],
  ['normal stream overflow', (json) => { json.bufferViews[92].extensions.EXT_meshopt_compression.byteOffset = 999999 }, /bounds\/mode invalid/],
]) test(`${name} cannot pass the exact decoded repair proof`, async () => {
  const predecessor = fs.readFileSync(path.join(root, HOME_NORMAL_PREDECESSOR.archivePath)), candidate = fs.readFileSync(path.join(root, homePath))
  await assert.rejects(verifyHomeNormalRepair(predecessor, editCandidateJson(candidate, edit)), error)
})

test('corrupting original BIN bytes fails the complete decoded repair proof', async () => {
  const predecessor = fs.readFileSync(path.join(root, HOME_NORMAL_PREDECESSOR.archivePath)), candidate = fs.readFileSync(path.join(root, homePath))
  candidate[20 + candidate.readUInt32LE(12) + 8 + 59875] ^= 1
  await assert.rejects(verifyHomeNormalRepair(predecessor, candidate), /original embedded BIN prefix changed|Malformed buffer data|decode error/)
})
