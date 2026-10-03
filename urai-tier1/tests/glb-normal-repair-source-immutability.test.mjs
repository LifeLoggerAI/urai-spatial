import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../', import.meta.url))
const fixtureFiles = [
  'scripts/capture-home-state-proof.mjs',
  'scripts/repair-home-glb-pole-normals.mjs',
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
