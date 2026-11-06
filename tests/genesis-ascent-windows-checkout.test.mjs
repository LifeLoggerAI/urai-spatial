import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const script = readFileSync(resolve(root, 'scripts/genesis-ascent-windows-checkout.ps1'), 'utf8')

test('Windows native review uses no-checkout before applying sparse NTFS exclusions', () => {
  const clone = script.indexOf('git clone --no-checkout')
  const sparse = script.indexOf('sparse-checkout init --no-cone')
  const patterns = script.indexOf('WriteAllText($patternFile')
  const checkout = script.indexOf('checkout --detach $Commit')
  assert.ok(clone >= 0 && clone < sparse && sparse < patterns && patterns < checkout)
  assert.match(script, /!\/\*audit\//)
  assert.match(script, /!\/urai-tier1\/\*audit\//)
  assert.match(script, /UTF8Encoding\]::new\(\$false\)/)
})

test('checkout enforces exact commit and does not touch production', () => {
  assert.match(script, /ValidatePattern\('\^\[0-9a-f\]\{40\}\$'\)/)
  assert.match(script, /DESTINATION_ALREADY_EXISTS_SELECT_A_FRESH_PRIVATE_DIRECTORY/)
  assert.match(script, /CHECKED_OUT_SHA_DIFFERS_FROM_REQUESTED_SHA/)
  assert.match(script, /REQUIRED_NATIVE_SOURCE_MISSING/)
  assert.match(script, /RELEASE_NO_GO_HOLD/)
  assert.doesNotMatch(script, /git\s+(?:push|merge|reset\s+--hard)|firebase\s+deploy|vercel\s+--prod/)
})
