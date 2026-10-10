import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const root = fileURLToPath(new URL('../', import.meta.url))
const homePath = 'src/app/HomeSpatialRuntimeLayer.tsx'
const canonicalHref = "href={homeJourneyHref('/life-map/?from=home-sky&entryPortal=home-sky&cameraCheckpoint=home-sky-ascent-complete', currentSearch)}"
const productionFiles = [
  'package.json', 'scripts/verify-tier-lock.mjs',
  'src/spatial/canon/tierLockState.ts', 'src/spatial/hud/CanonicalTierLockHud.tsx',
  'src/app/page.tsx', 'src/app/home/page.tsx', 'src/app/FinalHomeThreshold.tsx', homePath,
  'src/spatial/lifemap/SpatialLifeMapCanonical.tsx', 'src/app/focus/page.tsx', 'src/app/replay/page.tsx',
  'docs/audits/TIER_LOCK_VISUAL_CLOSEOUT.md',
]

function exerciseProductionGuard(t, transform) {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'urai-home-tier-lock-'))
  t.after(() => fs.rmSync(workspace, { recursive: true, force: true }))
  // Copy the real candidate source, including every other required invariant;
  // no mocked route, synthetic expected output, or alternate guard is used.
  for (const name of productionFiles) {
    const destination = path.join(workspace, name)
    fs.mkdirSync(path.dirname(destination), { recursive: true })
    fs.copyFileSync(path.join(root, name), destination)
  }
  const source = fs.readFileSync(path.join(workspace, homePath), 'utf8')
  assert.ok(source.includes(canonicalHref), 'actual consumer must use the exact governed composition')
  if (transform) fs.writeFileSync(path.join(workspace, homePath), transform(source))
  const result = spawnSync(process.execPath, ['scripts/verify-tier-lock.mjs'], { cwd: workspace, encoding: 'utf8', timeout: 10_000 })
  assert.ifError(result.error)
  assert.equal(result.signal, null, 'the real guard must finish without termination')
  return result
}

test('tier lock accepts the actual authority-preserving Home navigation consumer', t => {
  const result = exerciseProductionGuard(t)
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /canonical Home, Life Map, Focus, and Replay owners are converged/)
})

for (const [name, transform] of [
  ['wrong destination', source => source.replace(canonicalHref, canonicalHref.replace('/life-map/', '/focus/'))],
  ['missing Home origin', source => source.replace(canonicalHref, canonicalHref.replace('from=home-sky&', ''))],
  ['wrong entry portal', source => source.replace(canonicalHref, canonicalHref.replace('entryPortal=home-sky', 'entryPortal=other'))],
  ['premature camera checkpoint', source => source.replace(canonicalHref, canonicalHref.replace('cameraCheckpoint=home-sky-ascent-complete', 'cameraCheckpoint=home'))],
  ['manufactured demo', source => source.replace(canonicalHref, canonicalHref.replace("', currentSearch)", "&demo=1', currentSearch)"))],
  ['bypassed disclosure composition', source => source.replace(canonicalHref, 'href="/life-map/?from=home-sky&entryPortal=home-sky&cameraCheckpoint=home-sky-ascent-complete"')],
]) test(`tier lock rejects ${name} in the actual consumer`, t => {
  const result = exerciseProductionGuard(t, transform)
  assert.equal(result.status, 1, result.stdout)
  assert.match(result.stderr, /\[tier-lock\] missing .* in src\/app\/HomeSpatialRuntimeLayer\.tsx/)
})
