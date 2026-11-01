import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, rmSync, existsSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { SPARSE_DIRS, selectedForCone, windowsPathProblem, inspectTreePaths } from '../scripts/genesis-windows-path-preflight.mjs'

test('literal star-named GitHub audit directories are excluded without disabling NTFS checks', () => {
  for (const candidate of [
    '*audit/old/file.ts', 'urai-tier1/*audit/20260419_041417*final_tier1_lock_repair_v3/src/spatial/webxr/resolveWebXREntryState.ts',
    'archive/obsolete*/file.ts',
  ]) {
    assert.equal(selectedForCone(candidate), false, candidate)
    assert.equal(windowsPathProblem(candidate), 'WINDOWS_FORBIDDEN_FILENAME_CHARACTER')
  }
})
test('root files, workspace package sources, corrected Home and capture tools are selected', () => {
  for (const candidate of [
    'package.json','pnpm-lock.yaml','pnpm-workspace.yaml','urai-tier1/package.json','urai-tier1/next.config.ts',
    'urai-tier1/src/spatial/layout/homeAscentCinematicPath.ts','urai-tier1/public/assets/home.png',
    'urai-tier1/scripts/require-runtime-deps.mjs','scripts/genesis-ascent-patched-review-capture.mjs',
    'packages/tier-locks/package.json','apps/functions/package.json',
  ]) assert.equal(selectedForCone(candidate), true, candidate)
  assert.ok(SPARSE_DIRS.includes('urai-tier1/public'))
})
test('Windows reserved names, trailing dots, embedded stars and case collisions fail closed', () => {
  for (const candidate of ['urai-tier1/src/CON.tsx','urai-tier1/src/a*.tsx','scripts/bad:source.ts','urai-tier1/public/memory.']) {
    assert.ok(windowsPathProblem(candidate), candidate)
  }
  const result = inspectTreePaths(['package.json','urai-tier1/src/Home.tsx','urai-tier1/src/home.tsx'],'C:\\ur\\g')
  assert.equal(result.status,'WINDOWS_SPARSE_CHECKOUT_REFUSED')
  assert.equal(result.invalidIncluded,1)
  assert.match(result.problems[0].issue,/COLLISION/)
})
test('NUL-delimited CLI reports excluded star paths and returns zero only on Windows-safe selection', () => {
  const tool = new URL('../scripts/genesis-windows-path-preflight.mjs',import.meta.url).pathname
  const input = Buffer.from(['package.json','urai-tier1/*audit/oops.ts','urai-tier1/src/spatial/home.ts'].join('\0')+'\0')
  const p=spawnSync(process.execPath,[tool,'--checkout-root','C:\\ur\\g'],{input,encoding:'utf8'})
  assert.equal(p.status,0,p.stderr)
  const result=JSON.parse(p.stdout)
  assert.equal(result.checkedFiles,2)
  assert.equal(result.invalidExcluded,1)
  assert.equal(result.invalidIncluded,0)
})
test('NUL-delimited CLI refuses invalid selected filenames and unknown checkout roots', () => {
  const tool = new URL('../scripts/genesis-windows-path-preflight.mjs',import.meta.url).pathname
  const input=Buffer.from('urai-tier1/src/bad?source.ts\0')
  const p=spawnSync(process.execPath,[tool,'--checkout-root','C:\\ur\\g'],{input,encoding:'utf8'})
  assert.equal(p.status,2)
  assert.match(p.stdout,/WINDOWS_FORBIDDEN_FILENAME_CHARACTER/)
})
test('Windows conservative path limit refuses excessive source nesting', () => {
  assert.equal(windowsPathProblem('urai-tier1/src/'+ 'longname'.repeat(40)+'.tsx'), 'WINDOWS_CONSERVATIVE_PATH_LENGTH_EXCEEDED')
})

test('a real sparse checkout excludes star-audit trees while preserving exact commit identity', (t) => {
  const git = (...argv) => spawnSync('git', argv, { encoding: 'utf8' })
  if (git('--version').status !== 0) { t.skip('git not installed'); return }
  const fixture = mkdtempSync(join(tmpdir(), 'urai-sparse-checkout-'))
  t.after(() => rmSync(fixture, { recursive: true, force: true }))
  const source = join(fixture, 'source'), checkout = join(fixture, 'checkout')
  mkdirSync(join(source, '*audit'), { recursive: true })
  mkdirSync(join(source, 'urai-tier1', '*audit'), { recursive: true })
  mkdirSync(join(source, 'urai-tier1', 'src', 'spatial'), { recursive: true })
  mkdirSync(join(source, 'scripts'), { recursive: true })
  writeFileSync(join(source, 'package.json'), '{}\n')
  writeFileSync(join(source, '*audit', 'o.txt'), 'excluded')
  writeFileSync(join(source, 'urai-tier1', '*audit', 'o.txt'), 'excluded')
  writeFileSync(join(source, 'urai-tier1', 'src', 'spatial', 'Home.tsx'), 'valid')
  writeFileSync(join(source, 'scripts', 'capture.mjs'), 'valid')
  const run = (dir, ...args) => {
    const r = git('-C', dir, ...args)
    assert.equal(r.status, 0, `git ${args.join(' ')}: ${r.stderr}`)
    return r.stdout.trim()
  }
  run(source, 'init')
  run(source, 'config', 'user.name', 'Fixture')
  run(source, 'config', 'user.email', 'fixture@example.org')
  run(source, 'add', '-A')
  run(source, 'commit', '-m', 'fixture')
  const sha = run(source, 'rev-parse', 'HEAD')
  let result = git('clone', '--no-checkout', source, checkout)
  assert.equal(result.status, 0, result.stderr)
  run(checkout, 'update-ref', 'refs/heads/urai-genesis-pinned', sha)
  run(checkout, 'symbolic-ref', 'HEAD', 'refs/heads/urai-genesis-pinned')
  const entries = spawnSync('git', ['-C', checkout, 'ls-tree', '-r', '-z', '--name-only', sha], { encoding: 'buffer' })
  assert.equal(entries.status, 0)
  const report = inspectTreePaths(entries.stdout.toString('utf8').split('\0').filter(Boolean), 'C:\\ur\\g')
  assert.equal(report.invalidExcluded, 2)
  assert.equal(report.invalidIncluded, 0)
  run(checkout, 'sparse-checkout', 'init', '--cone')
  run(checkout, 'sparse-checkout', 'set', '--cone', 'scripts', 'urai-tier1/src')
  run(checkout, 'checkout', '--detach', sha)
  assert.equal(run(checkout, 'rev-parse', 'HEAD'), sha)
  assert.equal(existsSync(join(checkout, 'urai-tier1', 'src', 'spatial', 'Home.tsx')), true)
  assert.equal(existsSync(join(checkout, '*audit')), false)
  assert.equal(existsSync(join(checkout, 'urai-tier1', '*audit')), false)
})
