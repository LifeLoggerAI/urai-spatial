import assert from 'node:assert/strict'
import test from 'node:test'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs'

const runtime = readFileSync(new URL('../scripts/check-playwright-runtime.mjs', import.meta.url), 'utf8')
const packageManifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))

function fixture({ missingBrowser = false, autoInstall = false, installerFails = false } = {}) {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'urai-playwright-owning-workspace-'))
  try {
    mkdirSync(path.join(dir, 'scripts'))
    const packageFolder = path.join(dir, 'urai-tier1', 'node_modules', 'playwright')
    mkdirSync(packageFolder, { recursive: true })
    writeFileSync(path.join(dir, 'scripts', 'check-playwright-runtime.mjs'), runtime)
    writeFileSync(path.join(dir, 'urai-tier1', 'package.json'), '{"name":"urai-tier1"}')
    writeFileSync(path.join(packageFolder, 'package.json'), '{"name":"playwright","main":"index.cjs"}')
    writeFileSync(path.join(packageFolder, 'index.cjs'), `
      const fs = require('node:fs')
      exports.chromium = { async launch() {
        if (process.env.URAI_TEST_BROWSER_MISSING === '1' && !fs.existsSync('installed.marker')) {
          throw new Error("Executable doesn't exist")
        }
        return {
          async newPage() { return {
            async goto() {},
            locator() { return { async textContent() { return 'URAI Playwright runtime OK' } } },
            async close() {},
          } },
          async close() {},
        }
      } }
    `)
    writeFileSync(path.join(dir, 'scripts', 'run-pnpm.mjs'), `
      const fs = require('node:fs')
      const actual = process.argv.slice(2)
      const expected = ['--filter','urai-tier1','exec','playwright','install','chromium']
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        process.stderr.write('UNPINNED_WORKSPACE_INVOCATION:' + JSON.stringify(actual))
        process.exit(68)
      }
      if (process.env.URAI_TEST_INSTALL_FAIL === '1') process.exit(67)
      fs.writeFileSync('installed.marker', 'fixture')
      process.stdout.write('PINNED_CHROMIUM_FIXTURE_INSTALL_RAN\\n')
    `.replace("const fs = require('node:fs')", "import fs from 'node:fs'"))
    const args = [path.join(dir, 'scripts', 'check-playwright-runtime.mjs')]
    if (autoInstall) args.push('--auto-install')
    const result = spawnSync(process.execPath, args, {
      cwd: dir, encoding: 'utf8', timeout: 15000, shell: false,
      env: { ...process.env,
        URAI_TEST_BROWSER_MISSING: missingBrowser ? '1' : '0',
        URAI_TEST_INSTALL_FAIL: installerFails ? '1' : '0',
        URAI_PLAYWRIGHT_INSTALL_ATTEMPTS: '1',
        URAI_PLAYWRIGHT_INSTALL_RETRY_DELAY_MS: '0',
      },
    })
    assert.ifError(result.error)
    return result
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

test('Playwright is loaded from its declared owning tier1 workspace under strict pnpm isolation', () => {
  assert.match(runtime, /createRequire\(new URL\('\.\.\/urai-tier1\/package\.json', import\.meta\.url\)\)/)
  assert.match(runtime, /requireTier1\('playwright'\)/)
  const r = fixture()
  assert.equal(r.status, 0, r.stdout + r.stderr)
  assert.match(r.stdout, /playwright-runtime: PASS/)
})

test('missing Chromium without auto-install fails closed instead of skipping browser checks', () => {
  const r = fixture({missingBrowser:true})
  assert.notEqual(r.status, 0)
  assert.match(r.stderr, /Chromium failed to launch through Playwright/)
})

test('auto-install uses pinned tier1 workspace executable and checks runtime again', () => {
  const r = fixture({missingBrowser:true, autoInstall:true})
  assert.equal(r.status, 0, r.stdout + r.stderr)
  assert.match(r.stdout, /PINNED_CHROMIUM_FIXTURE_INSTALL_RAN/)
  assert.match(r.stdout, /playwright-runtime: PASS/)
  assert.doesNotMatch(r.stderr, /UNPINNED_WORKSPACE_INVOCATION/)
})

test('failed Chromium installer remains an explicit test failure', () => {
  const r = fixture({missingBrowser:true, autoInstall:true, installerFails:true})
  assert.notEqual(r.status, 0)
  assert.match(r.stderr, /Playwright chromium installer exited with code 67/)
  assert.doesNotMatch(r.stdout, /playwright-runtime: PASS/)
})

test('root install commands target workspace that declares Playwright', () => {
  for (const key of ['playwright:install','playwright:install-deps']) {
    assert.match(packageManifest.scripts[key], /run-pnpm\.mjs --filter urai-tier1 exec playwright install/)
  }
  assert.match(runtime, /\['scripts\/run-pnpm\.mjs', '--filter', 'urai-tier1', 'exec', 'playwright', 'install', 'chromium'\]/)
  assert.doesNotMatch(runtime, /import \{ chromium \} from 'playwright'/)
})
