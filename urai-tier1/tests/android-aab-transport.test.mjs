import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import { splitBundle, reconstructBundle, validateManifest, PART_BYTES, MAX_PARTS } from '../../scripts/android-aab-transport.mjs'

const sourceSha = 'a'.repeat(40)
const hash = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex')

test('bounded parts reconstruct the original synthetic binary exactly', (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'urai-aab-transport-'))
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }))
  const bytes = Buffer.alloc(PART_BYTES + 103, 0x61)
  bytes.fill(0x7d, PART_BYTES)
  const bundlePath = path.join(directory, 'app-release.aab')
  fs.writeFileSync(bundlePath, bytes)
  const outputDirectory = path.join(directory, 'parts')
  const expectedSha256 = hash(bytes)
  const manifest = splitBundle({ bundlePath, outputDirectory, sourceSha, expectedSha256 })
  assert.equal(manifest.partCount, 2)
  assert.ok(manifest.parts.every((part) => part.bytes <= 24 * 1024 * 1024))
  const manifestPath = path.join(outputDirectory, 'android-aab-transport.json')
  const partPaths = manifest.parts.map((part) => path.join(outputDirectory, part.name))
  const outputPath = path.join(directory, 'reconstructed.aab')
  const result = reconstructBundle({ manifestPath, partPaths, outputPath, sourceSha, expectedSha256 })
  assert.equal(result.bundleSha256, expectedSha256)
  assert.deepEqual(fs.readFileSync(outputPath), bytes)
  assert.throws(() => reconstructBundle({ manifestPath, partPaths, outputPath, sourceSha }), /EEXIST/)
  assert.throws(() => reconstructBundle({ manifestPath, partPaths: partPaths.slice(1), outputPath: `${outputPath}.missing`, sourceSha }), /count mismatch/)
  assert.throws(() => reconstructBundle({ manifestPath, partPaths: [...partPaths].reverse(), outputPath: `${outputPath}.reordered`, sourceSha }), /order mismatch/)
  assert.throws(() => reconstructBundle({ manifestPath, partPaths, outputPath: `${outputPath}.source`, sourceSha: 'b'.repeat(40) }), /source SHA mismatch/)
  const originalManifest = fs.readFileSync(manifestPath, 'utf8')
  fs.writeFileSync(manifestPath, JSON.stringify({ ...manifest, bundleSha256: 'c'.repeat(64) }))
  const wrongAggregate = `${outputPath}.aggregate`
  assert.throws(() => reconstructBundle({ manifestPath, partPaths, outputPath: wrongAggregate, sourceSha }), /Reconstructed bundle SHA-256/)
  assert.equal(fs.existsSync(wrongAggregate), false)
  fs.writeFileSync(manifestPath, originalManifest)
  fs.renameSync(partPaths[1], `${partPaths[1]}.absent`)
  assert.throws(() => reconstructBundle({ manifestPath, partPaths, outputPath: `${outputPath}.absent`, sourceSha }), /ENOENT/)
  fs.renameSync(`${partPaths[1]}.absent`, partPaths[1])
  fs.writeFileSync(partPaths[1], Buffer.alloc(103, 0x78))
  const failedOutput = `${outputPath}.changed`
  assert.throws(() => reconstructBundle({ manifestPath, partPaths, outputPath: failedOutput, sourceSha }), /part SHA-256 mismatch/)
  assert.equal(fs.existsSync(failedOutput), false)
  assert.throws(() => validateManifest({ ...manifest, parts: [...manifest.parts].reverse() }, sourceSha), /part order/)
  assert.throws(() => validateManifest({ ...manifest, bundleSha256: 'c'.repeat(64) }, sourceSha, expectedSha256), /Original bundle/)
  assert.throws(() => validateManifest({ ...manifest, bundleBytes: PART_BYTES * MAX_PARTS + 1 }, sourceSha), /bounded transport size/)
})

test('a changed original digest leaves no usable transport', (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'urai-aab-digest-'))
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }))
  const bundlePath = path.join(directory, 'app-release.aab')
  fs.writeFileSync(bundlePath, 'synthetic unsigned fixture')
  const outputDirectory = path.join(directory, 'parts')
  assert.throws(() => splitBundle({ bundlePath, outputDirectory, sourceSha, expectedSha256: '0'.repeat(64) }), /Original bundle/)
  assert.equal(fs.existsSync(outputDirectory), false)
})
