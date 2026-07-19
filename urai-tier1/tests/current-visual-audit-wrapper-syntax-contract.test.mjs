import assert from 'node:assert/strict'
import fs from 'node:fs'
import { spawnSync } from 'node:child_process'
import test from 'node:test'

const wrapper = fs.readFileSync('../scripts/run-live-visual-audit-current.mjs', 'utf8')

test('current-canon visual audit wrapper remains valid JavaScript', () => {
  const result = spawnSync(process.execPath, ['--check', '../scripts/run-live-visual-audit-current.mjs'], {
    cwd: process.cwd(),
    encoding: 'utf8',
  })

  assert.equal(
    result.status,
    0,
    `run-live-visual-audit-current.mjs failed node --check:\n${result.stderr || result.stdout}`,
  )
})

test('current-canon visual audit resolves Playwright from the Tier-1 workspace', () => {
  assert.match(wrapper, /createRequire\(new URL\('\.\.\/urai-tier1\/package\.json', import\.meta\.url\)\)/)
  assert.match(wrapper, /requireFromTierOne\('playwright'\)/)
  assert.doesNotMatch(wrapper, /generatedPath[\s\S]*import \{ chromium \} from 'playwright'/)
})
