import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const root = fileURLToPath(new URL('../', import.meta.url))
const checkerPath = 'scripts/check-production-route-exposure-v2.mjs'
const stripePath = 'apps/functions/src/stripeEntitlements.ts'
const checker = fs.readFileSync(path.join(root, checkerPath), 'utf8')

function actualGuard(t, mutate) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'urai-production-route-test-'))
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }))
  // Copy every actual source required by the established checker and its real
  // guarded route tree. The Stripe transport/provider is never invoked here.
  const files = new Set([...checker.matchAll(/(?:requireTokens|read)\('([^']+)'/g)].map(match => match[1]))
  for (const name of [checkerPath, stripePath, 'urai-tier1/src/app/focus/page.tsx', 'urai-tier1/src/app/focus/FocusChamberClient.tsx']) files.add(name)
  const gates = fs.readFileSync(path.join(root, 'urai-tier1/src/app/CanonicalAssetGates.tsx'), 'utf8')
  for (const match of gates.matchAll(/\['(v\d+)',\s*(\d+),/g)) files.add(`urai-tier1/public/assets/urai/final/manifests/${match[1]}-asset-factory-spatial-handoff.json`)
  for (const name of files) {
    const destination = path.join(directory, name)
    fs.mkdirSync(path.dirname(destination), { recursive: true })
    fs.copyFileSync(path.join(root, name), destination)
  }
  fs.cpSync(path.join(root, 'urai-tier1/src/app'), path.join(directory, 'urai-tier1/src/app'), { recursive: true })
  const stripe = fs.readFileSync(path.join(directory, stripePath), 'utf8')
  if (mutate) fs.writeFileSync(path.join(directory, stripePath), mutate(stripe))
  const result = spawnSync(process.execPath, [checkerPath], { cwd: directory, encoding: 'utf8', timeout: 10_000 })
  assert.ifError(result.error)
  assert.equal(result.signal, null)
  return result
}

test('actual production route guard accepts current TEST-only Stripe source', t => {
  const result = actualGuard(t)
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /Production route exposure v2 passed/)
})
for (const [name, before, after] of [
  ['LIVE runtime admission', "mode !== 'test'", "mode === 'test'"],
  ['LIVE callback admission', 'event.livemode !== false', 'event.livemode !== true'],
  ['historical production-mode callback admission', 'event.livemode !== false', "event.livemode !== (mode === 'production')"],
]) test(`actual production route guard rejects ${name}`, t => {
  const result = actualGuard(t, source => {
    assert.ok(source.includes(before))
    const start = source.indexOf('export const handleStripeWebhook')
    assert.ok(start >= 0)
    return source.slice(0, start) + source.slice(start).replace(before, after)
  })
  assert.equal(result.status, 1, result.stdout)
  assert.match(result.stderr, /stripeEntitlements\.ts is missing:/)
})
