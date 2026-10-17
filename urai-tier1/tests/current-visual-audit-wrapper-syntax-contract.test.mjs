import assert from 'node:assert/strict'
import fs from 'node:fs'
import { spawnSync } from 'node:child_process'
import test from 'node:test'

const wrapper = fs.readFileSync('../scripts/run-live-visual-audit-current.mjs', 'utf8')
const driver = fs.readFileSync('../scripts/run-canonical-live-visual-audit.mjs', 'utf8')

test('current-canon visual audit wrapper remains valid JavaScript', () => {
  for (const script of ['../scripts/run-live-visual-audit-current.mjs', '../scripts/run-canonical-live-visual-audit.mjs']) {
    const result = spawnSync(process.execPath, ['--check', script], {
      cwd: process.cwd(),
      encoding: 'utf8',
    })

    assert.equal(
      result.status,
      0,
      `${script} failed node --check:\n${result.stderr || result.stdout}`,
    )
  }
})

test('current-canon visual audit resolves Playwright from the Tier-1 workspace', () => {
  assert.match(wrapper, /createRequire\(new URL\('\.\.\/urai-tier1\/package\.json', import\.meta\.url\)\)/)
  assert.match(wrapper, /requireFromTierOne\('playwright'\)/)
  assert.doesNotMatch(wrapper, /generatedPath[\s\S]*import \{ chromium \} from 'playwright'/)
})

test('canonical visual audit waits for settled Ground and atomic route travel', () => {
  assert.match(driver, /data-ground-arrival/)
  assert.match(driver, /=== 'settled'/)
  assert.match(driver, /data-home-ready/)
  assert.match(driver, /Promise\.all\(\[/)
  assert.match(driver, /page\.waitForURL\(\/\\\/focus\\\?\//)
  assert.match(driver, /48px touch-target contract/)
  assert.match(driver, /urai-canonical-live-visual-audit-2/)
})


test('current Home visual audit keeps asset-driven ownership and cold-start budget', () => {
  const currentHome = fs.readFileSync('../scripts/run-canonical-live-visual-audit-current-home.mjs', 'utf8')
  assert.match(currentHome, /\.urai-asset-home-world\[data-home-primary-owner="asset-driven"\]/)
  assert.match(currentHome, /data-home-assets-ready/)
  assert.match(currentHome, /const currentHomeSettlement[\s\S]*timeout: 90_000/)
  assert.doesNotMatch(currentHome, /const currentHomeSettlement[\s\S]*timeout: 45_000/)
})
