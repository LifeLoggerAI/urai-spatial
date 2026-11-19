// R1548 review-only generator preflight: real entrypoint, harmless marker writers.
import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const source = fileURLToPath(new URL('../scripts/generate-review-visual-fixtures.mjs', import.meta.url))
const face = 'public/__digital-human-dev/anonymous-face-morph-v1.glb'
const home = 'public/assets/urai/home-production/interpretive/sanctuary-golden-grove-v1.splat'
const controlled = ['URAI_REVIEW_VISUAL_FIXTURES','NEXT_PUBLIC_URAI_ANONYMOUS_FACE_CALIBRATION','NEXT_PUBLIC_URAI_HOME_INTERPRETIVE_SPLAT_ASSET','VERCEL','URAI_PRODUCTION_RELEASE']
const enabled = { URAI_REVIEW_VISUAL_FIXTURES: 'true', NEXT_PUBLIC_URAI_ANONYMOUS_FACE_CALIBRATION: 'true' }
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'urai-r1548-guard-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  mkdirSync(join(root, 'scripts/digital-human'), { recursive: true })
  const entry = join(root, 'scripts/generate-review-visual-fixtures.mjs')
  copyFileSync(source, entry)
  const writer = [
    "import { mkdirSync, writeFileSync } from 'node:fs'",
    "import { dirname } from 'node:path'",
    "const output = process.argv[2]",
    "mkdirSync(dirname(output), {recursive:true})",
    "writeFileSync(output, 'TEST_MARKER_NOT_BINARY')",
  ].join('\n')
  writeFileSync(join(root, 'scripts/generate-public-home-splat.mjs'), writer)
  writeFileSync(join(root, 'scripts/digital-human/generate-anonymous-face-glb.mjs'), writer)
  return { root, entry }
}
function invoke(h, flags = {}) {
  const env = { ...process.env }
  for (const key of controlled) delete env[key]
  Object.assign(env, flags)
  const result = spawnSync(process.execPath, [h.entry], { cwd:h.root, env, encoding:'utf8', timeout:8000 })
  if (result.error) throw result.error
  return result
}
function seed(h, relative) {
  const target = join(h.root, relative)
  mkdirSync(dirname(target), { recursive:true })
  writeFileSync(target, 'STALE_MARKER_PRESERVE')
  return target
}
function denied(result, relative) {
  assert.notEqual(result.status, 0, 'a stale review asset cannot pass the build preflight')
  assert.match(result.stderr, /R1548_REVIEW_FIXTURES_STALE_OUTPUT_DENIED/)
  assert.ok(result.stderr.includes(relative.split('/').at(-1)))
}
for (const row of [
  ['default', {}],
  ['release default', { URAI_PRODUCTION_RELEASE:'true' }],
  ['Vercel default', { VERCEL:'1' }],
]) {
  test('fresh ' + row[0] + ' does not generate review assets', t => {
    const h = fixture(t)
    const result = invoke(h, row[1])
    assert.equal(result.status, 0, result.stderr)
    assert.match(result.stdout, /R1548_REVIEW_FIXTURES_SKIPPED/)
    assert.equal(existsSync(join(h.root, face)), false)
    assert.equal(existsSync(join(h.root, home)), false)
  })
}
for (const relative of [face, home]) {
  for (const row of [
    ['default', {}],
    ['release', {URAI_PRODUCTION_RELEASE:'true'}],
    ['Vercel', {VERCEL:'1'}],
  ]) {
    test('stale ' + relative + ' rejects ' + row[0] + ' and preserves evidence', t => {
      const h = fixture(t)
      const file = seed(h, relative)
      denied(invoke(h, row[1]), relative)
      assert.equal(readFileSync(file, 'utf8'), 'STALE_MARKER_PRESERVE')
    })
  }
}
test('explicitly opted-in local review still generates its anonymous marker', t => {
  const h = fixture(t)
  const result = invoke(h, enabled)
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /R1548_REVIEW_FIXTURES_GENERATED_REVIEW_ONLY/)
  assert.equal(readFileSync(join(h.root, face), 'utf8'), 'TEST_MARKER_NOT_BINARY')
})
for (const flag of [{URAI_PRODUCTION_RELEASE:'true'}, {VERCEL:'1'}]) {
  test('explicit requested generation remains denied on hosted or release builds', t => {
    const h = fixture(t)
    const result = invoke(h, {...enabled, ...flag})
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /R1548_REVIEW_FIXTURES_DENIED_ON_HOSTED_OR_RELEASE_BUILD/)
    assert.equal(existsSync(join(h.root, face)), false)
  })
}
test('enabled review to default/release/Vercel transitions fail instead of packaging stale face', t => {
  const h = fixture(t)
  assert.equal(invoke(h, enabled).status, 0)
  const content = readFileSync(join(h.root, face))
  for (const flags of [{},{URAI_PRODUCTION_RELEASE:'true'},{VERCEL:'1'}]) {
    denied(invoke(h, flags), face)
    assert.deepEqual(readFileSync(join(h.root, face)), content)
  }
})
