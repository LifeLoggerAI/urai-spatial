import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const runner = fileURLToPath(new URL('../scripts/genesis-r799-exact-head-acceptance.sh', import.meta.url))
const source = readFileSync(runner, 'utf8')
const marker = phrase => {
  const offset = source.indexOf(phrase)
  assert.ok(offset >= 0, 'missing exact runner gate: ' + phrase)
  return offset
}

test('combined R802 acceptance shell parses natively', () => {
  const r = spawnSync('bash', ['-n', runner], { encoding: 'utf8', timeout: 5000 })
  assert.equal(r.status, 0, r.stderr)
})
test('source and isolated emulator preflight run before any dependency install or Firebase execution', () => {
  assert.ok(marker('git status --porcelain') < marker('run synthetic_boundary_tests'))
  assert.ok(marker('run synthetic_boundary_tests') < marker('run synthetic_four_preflight'))
  assert.ok(marker('run synthetic_four_preflight') < marker('run frozen_install'))
  assert.ok(marker('run frozen_install') < marker('run firebase_four'))
  assert.match(source, /node --test tests\/run-memory-media-four-emulator-proof\.test\.mjs/)
  assert.match(source, /node scripts\/run-memory-media-four-emulator-proof\.mjs --preflight/)
})
test('original complete build and four real service command remain required without mock substitution', () => {
  for (const required of [
    'pnpm install --frozen-lockfile',
    'pnpm --filter urai-functions build',
    'pnpm --filter urai-functions test',
    'pnpm --filter urai-tier1 typecheck',
    'pnpm --filter urai-tier1 test:unit',
    'pnpm --filter urai-tier1 build',
    '--project demo-memory-media-playback --only auth,firestore,storage,functions',
    'node apps/functions/scripts/memory-media-playback-emulator-proof.cjs',
  ]) assert.ok(source.includes(required), 'original acceptance stage missing: ' + required)
  assert.match(source, /block production_go/)
  assert.doesNotMatch(source, /\b(?:firebase deploy|vercel deploy|--prod)\b/)
})
test('the combined runner refuses missing exact source before installs or emulator startup', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'urai-r802-driver-reject-'))
  try {
    const result = spawnSync('bash', [runner], {
      cwd, timeout: 5000, encoding: 'utf8',
      env: { PATH: process.env.PATH, HOME: cwd },
    })
    assert.equal(result.status, 2, result.stderr)
    assert.match(result.stdout, /source: BLOCKED/)
    assert.match(result.stdout, /GENESIS HOLD/)
    assert.doesNotMatch(result.stdout, /frozen_install|functions_build|firebase_four/)
    const proofPath = /evidence: (\/tmp\/urai-genesis-exact\.[^\s]+)/.exec(result.stdout)?.[1]
    assert.ok(proofPath, 'refusal must identify the evidence directory')
    const receipt = readFileSync(join(proofPath, 'stages.tsv'), 'utf8')
    assert.match(receipt, /source\tBLOCKED\t2/)
    assert.doesNotMatch(receipt, /frozen_install|firebase_four/)
    rmSync(proofPath, { recursive: true, force: true })
  } finally {
    rmSync(cwd, { recursive: true, force: true })
  }
})
