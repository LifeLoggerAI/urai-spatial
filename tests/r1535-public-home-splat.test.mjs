import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { inspectSplat } from '../scripts/inspect-captured-reality-splat.mjs'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const generator = resolve(root, 'urai-tier1/scripts/generate-public-home-splat.mjs')
const intended = '/assets/urai/home-production/interpretive/sanctuary-golden-grove-v1.splat'
test('guest-only interpretive splat generator is deterministic, safe, and binary-valid', () => {
  const dir = mkdtempSync(join(tmpdir(), 'urai-r1535-'))
  try {
    const paths = [join(dir, 'one.splat'), join(dir, 'two.splat')]
    const receipts = paths.map(path => {
      const r = spawnSync(process.execPath, [generator, path], { cwd: root, encoding: 'utf8', timeout: 30000 })
      assert.equal(r.status, 0, r.stderr)
      return JSON.parse(r.stdout)
    })
    assert.equal(receipts[0].classification, 'SYNTHETIC_PUBLIC_REVIEW_ONLY')
    assert.equal(receipts[0].productionAuthorized, false)
    assert.equal(receipts[0].pointCount, 83360)
    assert.equal(receipts[0].byteSize, 2667520)
    assert.deepEqual(readFileSync(paths[0]), readFileSync(paths[1]))
    const inspected = inspectSplat(paths[0], { maxBytes: 4 * 1024 * 1024, maxPoints: 100000 })
    assert.equal(inspected.pointCount, 83360)
    assert.equal(inspected.sourceAuthenticityVerified, false)
    assert.equal(inspected.visualAcceptanceEstablished, false)
    assert.equal(inspected.launchReady, false)
    assert.equal(statSync(paths[0]).size, receipts[0].byteSize)
    assert.equal(receipts[0].sha256, receipts[1].sha256)
    assert.match(intended, /^\/assets\/urai\/home-production\/interpretive\/[^/]+\.splat$/)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('guest Home splat texture chunks align to the GPU texture row width', () => {
  const source = readFileSync(resolve(root, 'urai-tier1/src/spatial/home/HomeInterpretiveSplat.tsx'), 'utf8')
  assert.match(source, /const textureWidth = Math\.min\(gl\.capabilities\.maxTextureSize, 16_384\)/)
  assert.match(source, /chunkSize: textureWidth/)
  assert.match(source, /maxTextureSize: textureWidth/)
  assert.doesNotMatch(source, /chunkSize: mobile \? 16_000 : 25_000/)
})
