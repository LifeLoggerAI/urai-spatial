import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const runner = fileURLToPath(new URL('../scripts/genesis-r799-exact-head-acceptance.sh', import.meta.url))
const source = readFileSync(runner, 'utf8')
function execute(env = {}) {
  const cwd = mkdtempSync(join(tmpdir(), 'urai-r799-driver-'))
  try {
    const result = spawnSync('bash', [runner], {
      cwd, timeout: 20000, encoding: 'utf8',
      env: { PATH: process.env.PATH, HOME: cwd, ...env },
    })
    assert.ok(!result.error, String(result.error))
    const output = String(result.stdout) + String(result.stderr)
    const receiptDir = /evidence: (\/tmp\/urai-genesis-exact\.[^\s]+)/.exec(output)?.[1]
    assert.ok(receiptDir, output)
    return { result, output, receiptDir }
  } finally { rmSync(cwd, { recursive:true, force:true }) }
}
test('synthetic driver has valid bash syntax', () => {
  const result = spawnSync('bash', ['-n', runner], { encoding:'utf8' })
  assert.equal(result.status, 0, result.stderr)
})
test('missing reviewed head fails before opening Firebase or running installs', () => {
  const { result, output, receiptDir } = execute()
  try {
    assert.equal(result.status, 2)
    assert.match(output, /source: BLOCKED/)
    const report = readFileSync(join(receiptDir, 'stages.tsv'), 'utf8')
    assert.match(report, /source\tBLOCKED\t2/)
    assert.doesNotMatch(report, /frozen_install|firebase_four/)
  } finally { rmSync(receiptDir, { recursive:true, force:true }) }
})
test('invalid expected SHA is rejected without network access', () => {
  const { result, output, receiptDir } = execute({URAI_EXPECTED_HEAD:'not-a-git-sha'})
  try {
    assert.equal(result.status, 2)
    assert.match(output, /source: BLOCKED/)
  } finally { rmSync(receiptDir, { recursive:true, force:true }) }
})
test('missing exact worktree refuses a syntactically valid SHA', () => {
  const { result, output, receiptDir } = execute({URAI_EXPECTED_HEAD:'a'.repeat(40)})
  try {
    assert.equal(result.status, 2)
    assert.match(readFileSync(join(receiptDir, 'source.log'), 'utf8'), /Full Git checkout missing/)
    assert.match(output, /GENESIS HOLD/)
  } finally { rmSync(receiptDir, { recursive:true, force:true }) }
})
test('four real Firebase emulators are named with exact synthetic project and config', () => {
  assert.match(source, /--config firebase\.memory-media-playback-test\.json/)
  assert.match(source, /--project demo-memory-media-playback --only auth,firestore,storage,functions/)
  assert.match(source, /apps\/functions\/scripts\/memory-media-playback-emulator-proof\.cjs/)
})
test('driver requires frozen original workspace and no cloud fallback', () => {
  for (const phrase of ['git status --porcelain', 'pnpm install --frozen-lockfile',
    'pnpm --filter urai-functions build', 'pnpm --filter urai-functions test',
    'pnpm --filter urai-tier1 typecheck', 'pnpm --filter urai-tier1 test:unit',
    'pnpm --filter urai-tier1 build', 'no automatic downloads', 'GOOGLE_APPLICATION_CREDENTIALS']) {
    assert.ok(source.includes(phrase), 'missing ' + phrase)
  }
})
test('completion never grants production GO, nor invokes deploy', () => {
  assert.match(source, /block production_go/)
  assert.doesNotMatch(source, /\b(?:firebase deploy|vercel deploy|--prod|github\.com\/settings\/billing)\b/)
})
