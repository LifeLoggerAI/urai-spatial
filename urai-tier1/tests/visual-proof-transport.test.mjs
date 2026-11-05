import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { ARTIFACT_BYTES, MAX_PARTS, PART_BYTES, REPOSITORY, prepareNativeArchive, reconstructArchive, splitArchive, validateManifest, validateNativeArtifact, verifyNativeUploads } from '../../scripts/visual-proof-transport.mjs'

const sha = bytes => createHash('sha256').update(bytes).digest('hex')
const sourceSha = '1'.repeat(40)
const nativeEnv = binding => ({ GITHUB_REPOSITORY: REPOSITORY, GITHUB_RUN_ID: binding.runId, GITHUB_RUN_ATTEMPT: binding.runAttempt,
  URAI_EXACT_HEAD: binding.sourceSha, URAI_PROOF_GROUP: binding.proofGroup, URAI_ORIGINAL_ARTIFACT_ID: binding.artifactId, URAI_ORIGINAL_ARTIFACT_DIGEST: binding.archiveSha256, GITHUB_TOKEN: 'synthetic-read-only-test-token' })
function temporary(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'urai-visual-transport-'))
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))
  return root
}
function fixture(t, length = PART_BYTES + 107, proofGroup = 'visual') {
  const root = temporary(t)
  const archive = Buffer.alloc(length, 0x83)
  archive.set([0x50, 0x4b, 0x03, 0x04])
  // Synthetic binary payload includes PNG magic; no real visual acceptance is generated.
  archive.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 17)
  const archivePath = path.join(root, 'original.zip')
  fs.writeFileSync(archivePath, archive)
  const binding = { repository: REPOSITORY, sourceSha, proofGroup, runId: '100', runAttempt: '2', artifactId: '200', archiveSha256: sha(archive) }
  const outputDirectory = path.join(root, 'parts')
  const manifest = splitArchive({ archivePath, outputDirectory, binding })
  return { root, archive, archivePath, binding, outputDirectory, manifest, manifestPath: path.join(outputDirectory, 'manifest.json'), partPaths: manifest.parts.map(part => path.join(outputDirectory, part.name)), outputPath: path.join(root, 'reconstructed.zip') }
}
const reconstruct = (f, overrides = {}) => reconstructArchive({ ...f, expected: f.binding, ...overrides })
const metadata = (binding, overrides = {}) => ({ id: Number(binding.artifactId), name: binding.proofGroup === 'adam-placement' ? `adam-placement-proof-${binding.sourceSha}` : binding.proofGroup === 'accessibility-performance' ? `accessibility-performance-evidence-${binding.sourceSha}` : `continuous-spatial-visual-proof-${binding.proofGroup}-${binding.sourceSha}`, expired: false,
  size_in_bytes: 100, digest: `sha256:${binding.archiveSha256}`, workflow_run: { id: Number(binding.runId) }, ...overrides })

test('partitioning is deterministic and reassembly retains every original byte', t => {
  const f = fixture(t)
  const second = path.join(f.root, 'second')
  assert.deepEqual(splitArchive({ ...f, outputDirectory: second }), f.manifest)
  assert.equal(f.manifest.partCount, 2)
  assert.equal(f.manifest.parts[0].bytes, PART_BYTES)
  assert.equal(f.manifest.parts[1].bytes, 107)
  assert.equal(reconstruct(f).archiveSha256, f.binding.archiveSha256)
  assert.deepEqual(fs.readFileSync(f.outputPath), f.archive)
  assert.deepEqual(fs.readFileSync(f.archivePath), f.archive)
  assert.ok(f.manifest.parts.every(part => part.bytes < ARTIFACT_BYTES))
  assert.ok(fs.statSync(f.manifestPath).size < 64 * 1024)
})

for (const [label, paths] of [
  ['missing', f => f.partPaths.slice(0, 1)], ['extra', f => [...f.partPaths, f.partPaths[0]]],
  ['duplicate', f => [f.partPaths[0], f.partPaths[0]]], ['reordered', f => [...f.partPaths].reverse()],
]) test(`rejects ${label} supplied parts without creating an output`, t => {
  const f = fixture(t)
  assert.throws(() => reconstruct(f, { partPaths: paths(f) }))
  assert.equal(fs.existsSync(f.outputPath), false)
})

for (const mutation of ['tampered', 'truncated', 'oversized']) test(`rejects ${mutation} bytes and removes partial reconstruction`, t => {
  const f = fixture(t)
  const file = f.partPaths[1]
  const bytes = fs.readFileSync(file)
  if (mutation === 'tampered') { bytes[0] ^= 1; fs.writeFileSync(file, bytes) }
  if (mutation === 'truncated') fs.writeFileSync(file, bytes.subarray(1))
  if (mutation === 'oversized') fs.appendFileSync(file, Buffer.from([0]))
  assert.throws(() => reconstruct(f))
  assert.equal(fs.existsSync(f.outputPath), false)
})

test('self-consistent tampered part hashes cannot replace the externally expected whole digest', t => {
  const f = fixture(t)
  const bytes = fs.readFileSync(f.partPaths[1]); bytes[0] ^= 1
  fs.writeFileSync(f.partPaths[1], bytes)
  f.manifest.parts[1].sha256 = sha(bytes)
  fs.writeFileSync(f.manifestPath, JSON.stringify(f.manifest))
  assert.throws(() => reconstruct(f), /Reassembled native archive/)
  assert.equal(fs.existsSync(f.outputPath), false)
})

for (const [key, wrong] of Object.entries({ repository: 'other/repo', sourceSha: '2'.repeat(40), proofGroup: 'desktop', runId: '101', runAttempt: '3', artifactId: '201', archiveSha256: 'f'.repeat(64) })) {
  test(`rejects stale or wrong externally bound ${key}`, t => {
    const f = fixture(t, 100)
    assert.throws(() => reconstruct(f, { expected: { ...f.binding, [key]: wrong } }))
    assert.equal(fs.existsSync(f.outputPath), false)
  })
}

test('rejects missing bindings, reordered manifest, traversal names, false counts and aggregate sizes', t => {
  const f = fixture(t)
  const variants = [
    m => { delete m.archiveSha256 }, m => { m.parts.reverse() }, m => { m.parts[0].name = '../escape' },
    m => { m.parts[1].index = 1 }, m => { m.partCount++ }, m => { m.archiveBytes++ },
    m => { m.parts[0].bytes++ }, m => { m.partBytes = ARTIFACT_BYTES }, m => { m.parts[0].artifactName = 'arbitrary' },
    m => { m.originalArtifactName = 'arbitrary' }, m => { m.manifestArtifactName = 'arbitrary' },
    m => { m.validationScope = 'VISUAL_ACCEPTED' },
  ]
  for (const change of variants) { const m = structuredClone(f.manifest); change(m); assert.throws(() => validateManifest(m, f.binding)) }
  assert.throws(() => validateManifest(f.manifest, undefined))
})

test('partition and reconstruction never overwrite existing archives or evidence directories', t => {
  const f = fixture(t, 100)
  assert.throws(() => splitArchive(f), /EEXIST/)
  assert.deepEqual(fs.readFileSync(f.archivePath), f.archive)
  fs.writeFileSync(f.outputPath, 'previous proof')
  assert.throws(() => reconstruct(f), /EEXIST/)
  assert.equal(fs.readFileSync(f.outputPath, 'utf8'), 'previous proof')
})

test('partitioning rejects bad whole hashes, oversized input and invalid ZIP headers without retained partials', t => {
  const f = fixture(t, 100)
  const outputDirectory = path.join(f.root, 'bad')
  assert.throws(() => splitArchive({ ...f, outputDirectory, binding: { ...f.binding, archiveSha256: 'f'.repeat(64) } }), /digest mismatch/)
  assert.equal(fs.existsSync(outputDirectory), false)
  const fd = fs.openSync(f.archivePath, 'r+'); fs.ftruncateSync(fd, PART_BYTES * MAX_PARTS + 1); fs.closeSync(fd)
  assert.throws(() => splitArchive({ ...f, outputDirectory }), /bounded transport size/)
  fs.writeFileSync(f.archivePath, Buffer.alloc(100))
  assert.throws(() => splitArchive({ ...f, outputDirectory }), /ZIP header/)
  assert.equal(fs.existsSync(outputDirectory), false)
})

test('native artifact checks reject wrong identity, run, name, digest, expired and oversized wrappers', t => {
  const f = fixture(t, 100)
  const spec = { id: f.binding.artifactId, name: f.manifest.originalArtifactName, archiveDigest: f.binding.archiveSha256, maxBytes: ARTIFACT_BYTES }
  for (const wrong of [{ id: 201 }, { name: 'other' }, { digest: `sha256:${'f'.repeat(64)}` }, { expired: true }, { workflow_run: { id: 101 } }, { size_in_bytes: ARTIFACT_BYTES + 1 }, { size_in_bytes: 0 }]) {
    assert.throws(() => validateNativeArtifact(metadata(f.binding, wrong), f.binding, spec))
  }
})

test('native preparation verifies actual downloaded archive and sends token only to GitHub API', async t => {
  const f = fixture(t, 100)
  const outputDirectory = path.join(f.root, 'native-parts')
  const calls = []
  const fetchImpl = async (url, opts) => {
    calls.push({ url, opts })
    if (url.endsWith('/zip')) return new Response(null, { status: 302, headers: { location: 'https://storage.example.test/signed-archive' } })
    if (url.startsWith('https://api.github.com/')) return Response.json(metadata(f.binding, { size_in_bytes: f.archive.length }))
    return new Response(f.archive)
  }
  const manifest = await prepareNativeArchive({ outputDirectory, env: nativeEnv(f.binding), fetchImpl })
  assert.equal(manifest.archiveSha256, f.binding.archiveSha256)
  assert.equal(calls.length, 3)
  assert.ok(calls.slice(0, 2).every(call => call.opts.headers.Authorization === 'Bearer synthetic-read-only-test-token' && call.opts.redirect === 'manual'))
  assert.equal(calls[2].opts.headers, undefined)
  assert.equal(calls[2].opts.redirect, 'error')
  assert.equal(fs.existsSync(`${outputDirectory}.original.zip`), false)
})

test('fixed accessibility profile retains the exact archive and cannot substitute a visual artifact', async t => {
  const f = fixture(t, PART_BYTES + 107, 'accessibility-performance')
  assert.equal(f.manifest.originalArtifactName, `accessibility-performance-evidence-${sourceSha}`)
  assert.equal(f.manifest.archiveName, 'accessibility-performance.zip')
  assert.equal(f.manifest.parts[0].name, 'accessibility-performance.zip.part-01')
  assert.equal(f.manifest.parts[0].artifactName, `accessibility-performance-transport-${sourceSha}-100-2-part-01`)
  reconstruct(f)
  assert.deepEqual(fs.readFileSync(f.outputPath), f.archive)
  const outputDirectory = path.join(f.root, 'native-accessibility')
  let wrongName = false
  const fetchImpl = async url => {
    if (url.endsWith('/zip')) return new Response(null, { status: 302, headers: { location: 'https://storage.test/original-accessibility' } })
    if (url.startsWith('https://api.github.com/')) return Response.json(metadata(f.binding, { size_in_bytes: f.archive.length, ...(wrongName ? { name: `continuous-spatial-visual-proof-visual-${sourceSha}` } : {}) }))
    return new Response(f.archive)
  }
  assert.deepEqual(await prepareNativeArchive({ outputDirectory, env: nativeEnv(f.binding), fetchImpl }), f.manifest)
  wrongName = true
  await assert.rejects(prepareNativeArchive({ outputDirectory: path.join(f.root, 'wrong-profile'), env: nativeEnv(f.binding), fetchImpl }), /identity\/name/)
})

test('founder placement profile preserves native bytes and rejects another proof profile', async t => {
  const f = fixture(t, PART_BYTES + 107, 'adam-placement')
  assert.equal(f.manifest.originalArtifactName, `adam-placement-proof-${sourceSha}`)
  assert.equal(f.manifest.archiveName, 'adam-placement.zip')
  assert.equal(f.manifest.parts[0].name, 'adam-placement.zip.part-01')
  assert.equal(f.manifest.parts[0].artifactName, `adam-placement-transport-${sourceSha}-100-2-part-01`)
  reconstruct(f)
  assert.deepEqual(fs.readFileSync(f.outputPath), f.archive)
  let wrongName = false
  const fetchImpl = async url => {
    if (url.endsWith('/zip')) return new Response(null, { status: 302, headers: { location: 'https://storage.test/original-founder-placement' } })
    if (url.startsWith('https://api.github.com/')) return Response.json(metadata(f.binding, { size_in_bytes: f.archive.length, ...(wrongName ? { name: `continuous-spatial-visual-proof-visual-${sourceSha}` } : {}) }))
    return new Response(f.archive)
  }
  assert.deepEqual(await prepareNativeArchive({ outputDirectory: path.join(f.root, 'native-placement'), env: nativeEnv(f.binding), fetchImpl }), f.manifest)
  wrongName = true
  await assert.rejects(prepareNativeArchive({ outputDirectory: path.join(f.root, 'wrong-placement-profile'), env: nativeEnv(f.binding), fetchImpl }), /identity\/name/)
})

for (const failure of ['insecure-redirect', 'credential-redirect', 'wrong-hash', 'truncated-download', 'oversized-download', 'missing-token']) test(`native preparation fails closed for ${failure}`, async t => {
  const f = fixture(t, 100)
  const outputDirectory = path.join(f.root, 'bad-native')
  const env = nativeEnv(f.binding)
  if (failure === 'missing-token') env.GITHUB_TOKEN = ''
  const fetchImpl = async url => {
    if (url.endsWith('/zip')) return new Response(null, { status: 302, headers: { location: failure === 'insecure-redirect' ? 'http://storage.test/file' : failure === 'credential-redirect' ? 'https://secret@storage.test/file' : 'https://storage.test/file' } })
    if (url.startsWith('https://api.github.com/')) return Response.json(metadata(f.binding, { size_in_bytes: f.archive.length }))
    const bytes = Buffer.from(f.archive)
    if (failure === 'wrong-hash') bytes[99] ^= 1
    return new Response(failure === 'truncated-download' ? bytes.subarray(1) : failure === 'oversized-download' ? Buffer.concat([bytes, Buffer.from([0])]) : bytes)
  }
  await assert.rejects(prepareNativeArchive({ outputDirectory, env, fetchImpl }))
  assert.equal(fs.existsSync(outputDirectory), false)
  assert.equal(fs.existsSync(`${outputDirectory}.original.zip`), false)
})

test('native upload verification binds separate wrappers, verifies actual sizes and rejects missing or extra uploads', async t => {
  const f = fixture(t)
  const env = { ...nativeEnv(f.binding), URAI_MANIFEST_ID: '300', URAI_MANIFEST_DIGEST: 'a'.repeat(64), URAI_PART_01_ID: '301', URAI_PART_01_DIGEST: 'b'.repeat(64), URAI_PART_02_ID: '302', URAI_PART_02_DIGEST: 'c'.repeat(64) }
  const records = new Map([
    ['300', metadata(f.binding, { id: 300, name: f.manifest.manifestArtifactName, digest: `sha256:${env.URAI_MANIFEST_DIGEST}` })],
    ...f.manifest.parts.map((part, index) => [String(301 + index), metadata(f.binding, { id: 301 + index, name: part.artifactName, size_in_bytes: part.bytes + 256, digest: `sha256:${env[`URAI_PART_0${index + 1}_DIGEST`]}` })]),
  ])
  const fetchImpl = async url => Response.json(records.get(url.split('/').at(-1)))
  const outputPath = path.join(f.root, 'uploaded.json')
  const receipt = await verifyNativeUploads({ ...f, outputPath, env, fetchImpl })
  assert.equal(receipt.artifacts.length, 3)
  assert.ok(receipt.artifacts.every(artifact => artifact.archiveBytes <= ARTIFACT_BYTES))
  for (const changes of [{ URAI_PART_02_ID: '' }, { URAI_PART_02_ID: '301' }, { URAI_PART_03_ID: '303' }]) await assert.rejects(verifyNativeUploads({ ...f, outputPath: path.join(f.root, 'bad.json'), env: { ...env, ...changes }, fetchImpl }))
  records.get('302').size_in_bytes = ARTIFACT_BYTES + 1
  await assert.rejects(verifyNativeUploads({ ...f, outputPath: path.join(f.root, 'bad.json'), env, fetchImpl }), /byte limit/)
  assert.equal(fs.existsSync(path.join(f.root, 'bad.json')), false)
})

test('production CLI requires external exact binding and rejects unknown or duplicate options', t => {
  const script = fileURLToPath(new URL('../../scripts/visual-proof-transport.mjs', import.meta.url))
  const f = fixture(t, 100)
  const run = args => spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' })
  const args = ['reconstruct', '--manifest', f.manifestPath, '--output', f.outputPath, '--source-sha', f.binding.sourceSha, '--archive-sha256', f.binding.archiveSha256, '--group', f.binding.proofGroup,
    '--run-id', f.binding.runId, '--run-attempt', f.binding.runAttempt, '--artifact-id', f.binding.artifactId, '--part', f.partPaths[0]]
  assert.notEqual(run(['reconstruct', '--manifest', f.manifestPath, '--output', f.outputPath, '--part', f.partPaths[0]]).status, 0)
  assert.notEqual(run([...args, '--unknown', 'value']).status, 0)
  assert.notEqual(run([...args, '--source-sha', f.binding.sourceSha]).status, 0)
  assert.equal(run(args).status, 0)
  assert.deepEqual(fs.readFileSync(f.outputPath), f.archive)
})

test('workflow preserves all original proof assertions and upload, and uses the configured separate bounded paths', () => {
  const workflow = fs.readFileSync(new URL('../../.github/workflows/continuous-spatial-visual-proof.yml', import.meta.url), 'utf8')
  const assertions = workflow.slice(workflow.indexOf('      - name: Prove complete group receipt\n'), workflow.indexOf('      - name: Upload exact-head grouped visual proof\n'))
  assert.equal(sha(assertions), '47ba006bf54949f3bdab54a860a483e22e3abd7300b3d1b0462ffd99c4c91612')
  const original = workflow.slice(workflow.indexOf('      - name: Upload exact-head grouped visual proof\n'), workflow.indexOf('      - name: Partition the original native visual archive\n'))
  assert.match(original, /if: always\(\)/)
  assert.match(original, /name: continuous-spatial-visual-proof-\$\{\{ matrix.proof_group \}\}-\$\{\{ env.URAI_EXACT_HEAD \}\}/)
  assert.match(original, /path: artifacts\/continuous-spatial-proof-\$\{\{ matrix.proof_group \}\}\n/)
  assert.match(original, /compression-level: 6/)
  const parts = workflow.match(/path: artifacts\/continuous-spatial-transport-\$\{\{ matrix.proof_group \}\}\/visual-proof.zip.part-[0-9]{2}/g)
  assert.equal(parts.length, MAX_PARTS)
  assert.equal(new Set(parts).size, MAX_PARTS)
  assert.equal(workflow.match(/compression-level: 0/g).length, MAX_PARTS + 2)
  assert.match(workflow, /verify-native-uploads/)
  assert.doesNotMatch(workflow, /path: artifacts\/continuous-spatial-transport-\$\{\{ matrix.proof_group \}\}\s*\n/)
})

test('accessibility workflow retains the complete archive and strict first-run/recovered-flake result', () => {
  const workflow = fs.readFileSync(new URL('../../.github/workflows/accessibility-performance-evidence.yml', import.meta.url), 'utf8')
  const suite = workflow.slice(workflow.indexOf('      - name: Run isolated accessibility and performance suite\n'), workflow.indexOf('      - name: Retain exact-head evidence\n'))
  assert.equal(sha(suite), 'd102e3cc51573649aef1714674a9f258f1e205c9846c96871e38c43181728c68')
  const original = workflow.slice(workflow.indexOf('      - name: Retain exact-head evidence\n'), workflow.indexOf('      - name: Partition the original native accessibility archive\n'))
  assert.match(original, /if: always\(\)/)
  assert.match(original, /name: accessibility-performance-evidence-\$\{\{ env.URAI_EXACT_HEAD \}\}/)
  assert.match(original, /path: artifacts\/accessibility-performance\n/)
  assert.match(original, /retention-days: 365/)
  assert.match(workflow, /URAI_PROOF_GROUP: accessibility-performance/)
  const parts = workflow.match(/path: artifacts\/accessibility-performance-transport\/accessibility-performance.zip.part-[0-9]{2}/g)
  assert.equal(parts.length, MAX_PARTS)
  assert.equal(new Set(parts).size, MAX_PARTS)
  assert.equal(workflow.match(/compression-level: 0/g).length, MAX_PARTS + 2)
  assert.match(workflow, /verify-native-uploads/)
  assert.doesNotMatch(workflow, /path: artifacts\/accessibility-performance-transport\s*\n/)
})

for (const status of [404, 429, 500, 502, 503, 504, 'network']) test(`native preparation recovers bounded ${status} metadata/redirect failures with exact validation`, async t => {
  const f = fixture(t, 100)
  const calls = new Map(); const delays = []
  const fetchImpl = async (url, opts) => {
    assert.equal(opts.headers?.Authorization, url.startsWith('https://api.github.com/') ? 'Bearer synthetic-read-only-test-token' : undefined)
    if (!url.startsWith('https://api.github.com/')) return new Response(f.archive)
    const count = (calls.get(url) ?? 0) + 1; calls.set(url, count)
    if (count < 3) { if (status === 'network') throw new TypeError('synthetic network failure'); return new Response(null, { status }) }
    if (url.endsWith('/zip')) return new Response(null, { status: 302, headers: { location: 'https://storage.test/native' } })
    return Response.json(metadata(f.binding, { size_in_bytes: f.archive.length }))
  }
  const manifest = await prepareNativeArchive({ outputDirectory: path.join(f.root, 'retry'), env: nativeEnv(f.binding), fetchImpl, delay: async ms => delays.push(ms) })
  assert.equal(manifest.archiveSha256, f.binding.archiveSha256)
  assert.deepEqual([...calls.values()], [3, 3]); assert.deepEqual(delays, [1000, 2000, 1000, 2000])
})

for (const status of [404, 503, 'network', 401, 403]) test(`native metadata ${status} remains fail closed after its bounded attempt limit`, async t => {
  const f = fixture(t, 100); let calls = 0; const delays = []
  const outputDirectory = path.join(f.root, 'rejected')
  const fetchImpl = async () => { calls++; if (status === 'network') throw new Error('synthetic'); return new Response(null, { status }) }
  await assert.rejects(prepareNativeArchive({ outputDirectory, env: nativeEnv(f.binding), fetchImpl, delay: async ms => delays.push(ms) }), /unavailable/)
  const retryable = status !== 401 && status !== 403
  assert.equal(calls, retryable ? 5 : 1); assert.deepEqual(delays, retryable ? [1000, 2000, 4000, 8000] : [])
  assert.equal(fs.existsSync(outputDirectory), false)
})

test('a recovered metadata response cannot weaken digest or run ownership', async t => {
  const f = fixture(t, 100); let calls = 0
  const fetchImpl = async () => ++calls === 1 ? new Response(null, { status: 404 }) : Response.json(metadata(f.binding, { digest: `sha256:${'f'.repeat(64)}` }))
  await assert.rejects(prepareNativeArchive({ outputDirectory: path.join(f.root, 'wrong-digest'), env: nativeEnv(f.binding), fetchImpl, delay: async () => {} }), /digest mismatch/)
  assert.equal(calls, 2)
})


test('Adam placement workflow follows the shared bounded transport part limit', () => {
  const workflow = fs.readFileSync(new URL('../../.github/workflows/adam-placement-proof.yml', import.meta.url), 'utf8')
  const parts = workflow.split(/\r?\n/).filter(line => line.includes('path: artifacts/adam-placement-transport/adam-placement.zip.part-'))
  assert.equal(parts.length, MAX_PARTS)
  assert.equal(new Set(parts).size, MAX_PARTS)
  assert.match(workflow, /verify-native-uploads/)
})

for (const file of ['continuous-spatial-visual-proof.yml', 'accessibility-performance-evidence.yml', 'adam-placement-proof.yml']) {
  test(`${file} passes every uploaded part identity and digest to native verification`, () => {
    const workflow = fs.readFileSync(new URL(`../../.github/workflows/${file}`, import.meta.url), 'utf8')
    const steps = workflow.split(/\r?\n(?=      - name: )/)
    const verification = steps.find(step => step.includes('node scripts/visual-proof-transport.mjs verify-native-uploads'))
    assert.ok(verification, 'Native verification step is required')
    const uploads = steps.filter(step => /path: .*\.zip\.part-\d{2}\s*\n/.test(step))
    assert.equal(uploads.length, MAX_PARTS)
    for (const [offset, upload] of uploads.entries()) {
      const suffix = String(offset + 1).padStart(2, '0')
      const id = upload.match(/^        id: (\S+)$/m)?.[1]
      assert.ok(id, `Part ${suffix} needs its own upload step identity`)
      assert.match(upload, new RegExp(`path: .*\\.zip\\.part-${suffix}\\s*\\n`))
      assert.ok(verification.includes('URAI_PART_' + suffix + '_ID: ${{ steps.' + id + '.outputs.artifact-id }}'), `Part ${suffix} artifact ID does not reach verification`)
      assert.ok(verification.includes('URAI_PART_' + suffix + '_DIGEST: ${{ steps.' + id + '.outputs.artifact-digest }}'), `Part ${suffix} artifact digest does not reach verification`)
    }
    assert.equal((verification.match(/URAI_PART_\d{2}_ID:/g) ?? []).length, MAX_PARTS)
    assert.equal((verification.match(/URAI_PART_\d{2}_DIGEST:/g) ?? []).length, MAX_PARTS)
  })
}

test('native verification handles all sixteen bounded wrappers and fails closed for late-part substitutions', async t => {
  // Metadata-only synthetic transport fixture; this creates no native visual acceptance.
  const f = fixture(t, 100, 'accessibility-performance')
  f.manifest.archiveBytes = PART_BYTES * MAX_PARTS - 17
  f.manifest.partCount = MAX_PARTS
  const first = f.manifest.parts[0]
  f.manifest.parts = Array.from({ length: MAX_PARTS }, (_, offset) => {
    const index = offset + 1
    const suffix = String(index).padStart(2, '0')
    return { ...first, index, name: first.name.replace(/01$/, suffix), bytes: index === MAX_PARTS ? PART_BYTES - 17 : PART_BYTES,
      artifactName: first.artifactName.replace(/01$/, suffix) }
  })
  fs.writeFileSync(f.manifestPath, JSON.stringify(f.manifest))
  const env = { ...nativeEnv(f.binding), URAI_MANIFEST_ID: '300', URAI_MANIFEST_DIGEST: 'a'.repeat(64) }
  const records = new Map([['300', metadata(f.binding, { id: 300, name: f.manifest.manifestArtifactName, digest: `sha256:${env.URAI_MANIFEST_DIGEST}` })]])
  for (const [offset, part] of f.manifest.parts.entries()) {
    const suffix = String(offset + 1).padStart(2, '0')
    const id = String(301 + offset)
    env[`URAI_PART_${suffix}_ID`] = id
    env[`URAI_PART_${suffix}_DIGEST`] = sha(Buffer.from(`synthetic-wrapper-${suffix}`))
    records.set(id, metadata(f.binding, { id: Number(id), name: part.artifactName, size_in_bytes: part.bytes + 188, digest: `sha256:${env[`URAI_PART_${suffix}_DIGEST`]}` }))
  }
  const fetchImpl = async url => Response.json(records.get(url.split('/').at(-1)))
  const receipt = await verifyNativeUploads({ ...f, outputPath: path.join(f.root, 'all-sixteen.json'), env, fetchImpl })
  assert.equal(receipt.partCount, MAX_PARTS)
  assert.equal(receipt.artifacts.length, MAX_PARTS + 1)
  assert.equal(new Set(receipt.artifacts.map(artifact => artifact.artifactId)).size, MAX_PARTS + 1)
  assert.equal(receipt.validationScope, 'archive-transport-only')
  const rejectedPath = path.join(f.root, 'rejected.json')
  for (const [changes, expected] of [
    [{ URAI_PART_16_ID: '' }, /identity\/digest missing/],
    [{ URAI_PART_16_ID: env.URAI_PART_01_ID }, /Duplicate native artifact identities/],
    [{ URAI_PART_16_DIGEST: 'malformed' }, /identity\/digest missing/],
    [{ URAI_PART_16_DIGEST: 'f'.repeat(64) }, /digest mismatch/],
  ]) {
    await assert.rejects(verifyNativeUploads({ ...f, outputPath: rejectedPath, env: { ...env, ...changes }, fetchImpl }), expected)
    assert.equal(fs.existsSync(rejectedPath), false)
  }
  const last = records.get(env.URAI_PART_16_ID)
  for (const [changes, expected] of [
    [{ name: f.manifest.parts[0].artifactName }, /identity\/name\/expiry mismatch/],
    [{ workflow_run: { id: 101 } }, /another run/],
    [{ expired: true }, /identity\/name\/expiry mismatch/],
    [{ size_in_bytes: ARTIFACT_BYTES + 1 }, /byte limit/],
  ]) {
    records.set(env.URAI_PART_16_ID, { ...last, ...changes })
    await assert.rejects(verifyNativeUploads({ ...f, outputPath: rejectedPath, env, fetchImpl }), expected)
    assert.equal(fs.existsSync(rejectedPath), false)
  }
})
