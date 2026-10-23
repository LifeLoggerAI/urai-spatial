import test from 'node:test'
import assert from 'node:assert/strict'
import os from 'node:os'
import path from 'node:path'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, symlinkSync, statSync } from 'node:fs'
import { isOwnedVisualEvidencePath } from '../scripts/rfinal-visual-evidence-paths.mjs'

function fixture(run) {
  const temp = mkdtempSync(path.join(os.tmpdir(), 'urai-visual-ownership-'))
  const evidence = path.join(temp, 'evidence')
  const dir = path.join(evidence, 'browser-artifacts')
  mkdirSync(dir, { recursive: true })
  try { run({ temp, evidence, dir }) }
  finally { rmSync(temp, { recursive: true, force: true }) }
}
function maybeSymlink(target, link, kind) {
  try { symlinkSync(target, link, kind); return true }
  catch (e) { if (['EPERM', 'EACCES', 'ENOTSUP'].includes(e.code)) return false; throw e }
}
test('ordinary evidence directory, report and screenshot are eligible for byte checks', () => fixture(({ evidence, dir }) => {
  const report = path.join(dir, 'spatial-tier-lock-hardening-report-visual.json')
  const png = path.join(dir, 'real-home-desktop.png')
  writeFileSync(report, '{}')
  writeFileSync(png, 'PNG bytes validated separately')
  assert.equal(isOwnedVisualEvidencePath(evidence, dir, 'directory'), true)
  assert.equal(isOwnedVisualEvidencePath(evidence, report), true)
  assert.equal(isOwnedVisualEvidencePath(evidence, png), true)
}))
test('symbolic screenshot alias cannot pass byte-provenance path check', () => fixture(({ temp, evidence, dir }) => {
  const external = path.join(temp, 'external-screenshot.png')
  const link = path.join(dir, 'real-home-desktop.png')
  writeFileSync(external, 'external bytes')
  if (maybeSymlink(external, link, 'file')) {
    assert.equal(statSync(link).isFile(), true, 'old statSync check accepted an external target')
    assert.equal(isOwnedVisualEvidencePath(evidence, link), false)
  } else assert.equal(isOwnedVisualEvidencePath(evidence, link), false)
}))
test('linked browser-artifacts directory is never recognized as owned evidence', () => fixture(({ temp, evidence, dir }) => {
  rmSync(dir, { recursive: true, force: true })
  const external = path.join(temp, 'other-artifacts')
  mkdirSync(external)
  if (maybeSymlink(external, dir, process.platform === 'win32' ? 'junction' : 'dir')) {
    assert.equal(isOwnedVisualEvidencePath(evidence, dir, 'directory'), false)
    const file = path.join(external, 'real-home-desktop.png')
    writeFileSync(file, 'external bytes')
    assert.equal(isOwnedVisualEvidencePath(evidence, path.join(dir, 'real-home-desktop.png')), false)
  } else assert.equal(isOwnedVisualEvidencePath(evidence, dir, 'directory'), false)
}))
test('linked suite report cannot authorize the original visual stage', () => fixture(({ temp, evidence, dir }) => {
  const external = path.join(temp, 'external-report.json')
  const report = path.join(dir, 'spatial-tier-lock-hardening-report-visual.json')
  writeFileSync(external, '{"suite":"visual"}')
  if (maybeSymlink(external, report, 'file')) assert.equal(isOwnedVisualEvidencePath(evidence, report), false)
  else assert.equal(isOwnedVisualEvidencePath(evidence, report), false)
}))
test('parent escape and nested screenshot paths fail closed', () => fixture(({ temp, evidence, dir }) => {
  const external = path.join(temp, 'untrusted.png')
  writeFileSync(external, 'not owned')
  const nested = path.join(dir, 'nested')
  mkdirSync(nested)
  writeFileSync(path.join(nested, 'screenshot.png'), 'not direct')
  assert.equal(isOwnedVisualEvidencePath(evidence, external), false)
  assert.equal(isOwnedVisualEvidencePath(evidence, path.join(nested, 'screenshot.png')), false)
  assert.equal(isOwnedVisualEvidencePath(evidence, evidence, 'directory'), false)
}))
test('missing files and directory in place of screenshot cannot pass', () => fixture(({ evidence, dir }) => {
  assert.equal(isOwnedVisualEvidencePath(evidence, path.join(dir, 'missing.png')), false)
  mkdirSync(path.join(dir, 'fake.png'))
  assert.equal(isOwnedVisualEvidencePath(evidence, path.join(dir, 'fake.png')), false)
}))
