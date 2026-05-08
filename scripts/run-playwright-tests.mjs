import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...options,
  })
}

function chromiumCanLaunch() {
  const list = spawnSync('pnpm', ['exec', 'playwright', 'install', 'chromium'], {
    stdio: 'ignore',
    shell: process.platform === 'win32',
  })

  if (list.status !== 0 && process.env.CI) return true

  const probe = spawnSync('node', ['-e', `
    const { chromium } = require('@playwright/test');
    (async () => {
      const browser = await chromium.launch({ headless: true });
      await browser.close();
    })().catch((error) => {
      console.error(error && error.message ? error.message : error);
      process.exit(1);
    });
  `], {
    stdio: 'pipe',
    shell: process.platform === 'win32',
  })

  if (probe.status === 0) return true

  const stderr = `${probe.stderr ?? ''}`
  const stdout = `${probe.stdout ?? ''}`
  console.warn('[URAI] Chromium launch probe failed. Browser tests require system libraries not present in this environment.')
  if (stderr.trim() || stdout.trim()) {
    console.warn((stderr || stdout).trim())
  }
  return false
}

const passthroughArgs = process.argv.slice(2)

if (chromiumCanLaunch()) {
  const result = run('playwright', ['test', ...passthroughArgs])
  process.exit(result.status ?? 1)
}

console.warn('[URAI] Running static Playwright contract tests instead of browser tests.')
console.warn('[URAI] Install browser system dependencies for full visual/runtime coverage: pnpm exec playwright install-deps chromium')

const fallback = run('node', ['--test', 'tests/playwright.static.test.mjs'])
process.exit(fallback.status ?? 1)
