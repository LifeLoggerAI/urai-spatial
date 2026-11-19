// R1548 fail-closed build gate across every declared next build entrypoint.
// Executable command behavior, not only a source regex. Runs in isolated
// temporary directories with mocked Next/tsc (no production, cloud, or assets).
import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { chmodSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { delimiter, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const sourceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sourcePackage = JSON.parse(readFileSync(join(sourceRoot, 'package.json'), 'utf8'))
const expectedEntrypoints = ['build', 'check', 'check:build']
const home = 'public/assets/urai/home-production/interpretive/sanctuary-golden-grove-v1.splat'
const face = 'public/__digital-human-dev/anonymous-face-morph-v1.glb'
const clearedFlags = [
  'URAI_REVIEW_VISUAL_FIXTURES', 'NEXT_PUBLIC_URAI_ANONYMOUS_FACE_CALIBRATION',
  'NEXT_PUBLIC_URAI_HOME_INTERPRETIVE_SPLAT_ASSET', 'URAI_PRODUCTION_RELEASE', 'VERCEL',
]
function workspace(t) {
  const dir = mkdtempSync(join(tmpdir(), 'urai-r1548-build-gates-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  const scriptsDir = join(dir, 'scripts')
  const bin = join(dir, 'fakebin')
  mkdirSync(scriptsDir, { recursive: true })
  mkdirSync(bin, { recursive: true })
  copyFileSync(join(sourceRoot, 'scripts/generate-review-visual-fixtures.mjs'), join(scriptsDir, 'generate-review-visual-fixtures.mjs'))
  writeFileSync(join(scriptsDir, 'require-runtime-deps.mjs'), "console.log('FAKE_DEPS_OK')\n")
  const pkg = { name: 'urai-r1548-build-preflight-probe', private: true, type: 'module', scripts: {} }
  for (const key of expectedEntrypoints) {
    assert.ok(sourcePackage.scripts[key], `missing build entrypoint ${key}`)
    pkg.scripts[key] = sourcePackage.scripts[key]
  }
  writeFileSync(join(dir, 'package.json'), JSON.stringify(pkg))
  const log = join(dir, 'compiler-invocations.log')
  for (const command of ['next', 'tsc']) {
    const stub = join(bin, command)
    writeFileSync(stub, `#!/bin/sh\nprintf '%s\\n' '${command}' >> "$URAI_BUILD_PROBE_LOG"\nexit 0\n`)
    chmodSync(stub, 0o755)
  }
  return { dir, bin, log }
}
function invoke(ctx, script, flags = {}) {
  const env = { ...process.env, PATH: ctx.bin + delimiter + process.env.PATH, URAI_BUILD_PROBE_LOG: ctx.log }
  for (const name of clearedFlags) delete env[name]
  Object.assign(env, flags)
  const result = spawnSync('npm', ['run', '--silent', script], { cwd: ctx.dir, env, encoding: 'utf8', timeout: 15_000 })
  if (result.error) throw result.error
  return { status: result.status, output: result.stdout + '\n' + result.stderr,
    compilerCalls: existsSync(ctx.log) ? readFileSync(ctx.log, 'utf8').trim().split(/\n/).filter(Boolean) : [] }
}
function seed(ctx, path) {
  const file = join(ctx.dir, path)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, 'UNAPPROVED_REVIEW_FIXTURE_MARKER')
  return file
}
for (const script of expectedEntrypoints) {
  test(`${script}: clean default build invokes mocked compiler, no review asset generated`, t => {
    const ctx = workspace(t)
    const result = invoke(ctx, script)
    assert.equal(result.status, 0, result.output)
    assert.ok(result.compilerCalls.includes('next'), `expected mocked compiler for ${script}`)
    assert.equal(existsSync(join(ctx.dir, face)), false)
    assert.equal(existsSync(join(ctx.dir, home)), false)
  })
  for (const stale of [face, home]) {
    test(`${script}: stale ${stale} denies before Next and preserves marker`, t => {
      const ctx = workspace(t)
      const file = seed(ctx, stale)
      const result = invoke(ctx, script)
      assert.notEqual(result.status, 0, `${script} wrongly reached Next with stale review assets`)
      assert.match(result.output, /R1548_REVIEW_FIXTURES_STALE_OUTPUT_DENIED/)
      assert.equal(result.compilerCalls.includes('next'), false)
      assert.equal(readFileSync(file, 'utf8'), 'UNAPPROVED_REVIEW_FIXTURE_MARKER')
    })
  }
  test(`${script}: explicit Vercel review generation denied before Next`, t => {
    const ctx = workspace(t)
    const result = invoke(ctx, script, {
      URAI_REVIEW_VISUAL_FIXTURES: 'true', NEXT_PUBLIC_URAI_ANONYMOUS_FACE_CALIBRATION: 'true', VERCEL: '1',
    })
    assert.notEqual(result.status, 0, `${script} wrongly reached Next in Vercel review mode`)
    assert.match(result.output, /R1548_REVIEW_FIXTURES_DENIED_ON_HOSTED_OR_RELEASE_BUILD/)
    assert.equal(result.compilerCalls.includes('next'), false)
  })
}
