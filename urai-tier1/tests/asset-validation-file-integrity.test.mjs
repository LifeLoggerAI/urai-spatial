import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import test from 'node:test'

const validator = readFileSync('scripts/validate-assets.mjs', 'utf8')

function validateFixture(status, payload) {
  const root = mkdtempSync(path.join(tmpdir(), 'urai-asset-validation-'))
  const app = path.join(root, 'app')
  try {
    for (const dir of ['public', 'scripts', 'src/spatial/assets']) mkdirSync(path.join(app, dir), { recursive: true })
    writeFileSync(path.join(app, 'scripts/validate-assets.mjs'), validator.replace('assetManifest.ts', 'assetManifest.mjs'))
    const entry = { id: 'fixture', type: 'audio', targetSurface: 'home', status, priority: 'critical', path: '/fixture.opus' }
    writeFileSync(path.join(app, 'src/spatial/assets/assetManifest.mjs'), `export const uraiSpatialAssetManifest = ${JSON.stringify([entry])}`)
    if (payload !== null) writeFileSync(path.join(app, 'public/fixture.opus'), payload)
    const result = spawnSync(process.execPath, ['scripts/validate-assets.mjs'], { cwd: app, encoding: 'utf8' })
    assert.equal(result.error, undefined)
    return { status: result.status, output: result.stdout + result.stderr }
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

test('asset gate rejects empty ready and fallback files', () => {
  for (const status of ['ready', 'fallback']) {
    const result = validateFixture(status, '')
    assert.equal(result.status, 1, result.output)
    assert.match(result.output, /Empty ready\/fallback files: 1/)
    assert.match(result.output, /Blocking ready\/fallback asset failures: 1/)
  }
})

test('asset gate accepts a nonempty Opus file and permits an explicit future slot', () => {
  for (const [status, payload] of [['ready', 'fixture bytes'], ['future', null]]) {
    const result = validateFixture(status, payload)
    assert.equal(result.status, 0, result.output)
    assert.match(result.output, /Empty ready\/fallback files: 0/)
  }
})
