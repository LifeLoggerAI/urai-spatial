import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { pathToFileURL } from 'node:url'
import { copyRuntimeContracts } from '../scripts/copy-runtime-contracts.mjs'
import { founderVoiceIssuerReadiness, FOUNDER_VOICE_RECEIPT_DENIED } from '../src/adamFounderVoiceReceiptContract.mjs'

const name = 'adamFounderVoiceReceiptContract.mjs'
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex')
const makeFixture = () => {
  const root = mkdtempSync(join(tmpdir(), 'urai-contract-'))
  const source = join(root, 'src', name)
  const target = join(root, 'lib', 'apps', 'functions', 'src', name)
  mkdirSync(dirname(source), { recursive: true })
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(source, 'export const founderVoiceIssuerReadiness = () => ({ ready: false })\n')
  return { root, source, target }
}

test('the original Founder voice issuer is still hard-off', () => {
  const result = founderVoiceIssuerReadiness()
  assert.equal(result.ready, false)
  assert.equal(result.code, FOUNDER_VOICE_RECEIPT_DENIED)
})

test('compiled Functions receives an exact-byte ESM contract with receipt', async () => {
  const { root, source, target } = makeFixture()
  try {
    const result = copyRuntimeContracts(root)
    assert.deepEqual(result, [{ name, sha256: sha256(readFileSync(source)) }])
    assert.equal(sha256(readFileSync(target)), sha256(readFileSync(source)))
    const imported = await import(pathToFileURL(target).href)
    assert.equal(imported.founderVoiceIssuerReadiness().ready, false)
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('missing compiler output fails closed without creating a fake build', () => {
  const { root, target } = makeFixture()
  try {
    rmSync(dirname(target), { recursive: true, force: true })
    assert.throws(() => copyRuntimeContracts(root), /compiled runtime contract missing/)
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('missing source fails closed instead of inventing a contract', () => {
  const { root, source } = makeFixture()
  try {
    rmSync(source)
    assert.throws(() => copyRuntimeContracts(root), /compiled runtime contract missing/)
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('the original Functions build invokes the runtime contract copier after tsc', () => {
  const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
  assert.match(packageJson.scripts.build, /tsc -p tsconfig\.json && node scripts\/copy-runtime-contracts\.mjs$/)
  assert.equal(packageJson.engines.node, '22')
  assert.equal(packageJson.main, 'lib/apps/functions/src/index.js')
})
