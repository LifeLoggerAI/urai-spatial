import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

const source = readFileSync(new URL('../cloudbuild.urai-verify.yaml', import.meta.url), 'utf8')
const pinnedBranch = 'repair/operation-one-r148-original-urai-convergence-20261023'

function firstStep(yaml) {
  const lines = yaml.split(/\r?\n/)
  const idx = lines.findIndex(line => line === '      - |')
  assert.ok(idx >= 0)
  let script = ''
  for (let i = idx + 1; i < lines.length && (lines[i].startsWith('        ') || lines[i] === ''); i++)
    script += (lines[i].startsWith('        ') ? lines[i].slice(8) : '') + '\n'
  return script.split('$$').join('$')
}

function preflight(env) {
  const script = firstStep(source).split('export GIT_TERMINAL_PROMPT=0')[0]
  const defaults = {
    URAI_SOURCE_BRANCH: pinnedBranch, URAI_SOURCE_SHA: 'b'.repeat(40),
    URAI_CLOUD_PROJECT: 'urai-qa-123',
    URAI_VERIFIER_SA: 'urai-verifier@urai-qa-123.iam.gserviceaccount.com',
  }
  return spawnSync('bash', ['-ceu', script + '\necho PREFLIGHT_COMPLETE'], {
    timeout: 4000, encoding: 'utf8', env: { ...process.env, ...defaults, ...env },
  })
}

test('manual Cloud Build defaults to unified UrAi branch, never a baked-in SHA', () => {
  assert.ok(source.includes("_SOURCE_BRANCH: '" + pinnedBranch + "'"))
  assert.match(source, /_SOURCE_SHA:\s*'EXPLICIT_PIN_REQUIRED'/)
  assert.doesNotMatch(source, /_SOURCE_SHA:\s*'[0-9a-f]{40}'/)
  assert.doesNotMatch(source, /run_gate r4-/)
  assert.match(source, /run_gate lifemap-hidden-event-privacy/)
  assert.match(source, /run_gate ground-active-owner/)
  assert.match(source, /run_gate firestore-java-contract/)
  assert.match(source, /run_gate spatial-build/)
})

test('source pin preflight rejects unsafe refs, identity and production project', () => {
  for (const branch of [pinnedBranch, 'repair/test-case', 'verify/review-test']) {
    const run = preflight({ URAI_SOURCE_BRANCH: branch })
    assert.equal(run.status, 0, branch + ' ' + run.stdout + run.stderr)
    assert.match(run.stdout, /PREFLIGHT_COMPLETE/)
  }
  for (const branch of ['main', 'refs/heads/main', 'verify/../../evil', 'repair/x;echo HACKED']) {
    const run = preflight({ URAI_SOURCE_BRANCH: branch })
    assert.notEqual(run.status, 0, branch)
    assert.match(run.stdout, /INVALID_SOURCE_BRANCH/)
    assert.doesNotMatch(run.stdout, /PREFLIGHT_COMPLETE/)
  }
  const prod = preflight({ URAI_CLOUD_PROJECT: 'urai-4dc1d',
    URAI_VERIFIER_SA: 'urai-verifier@urai-4dc1d.iam.gserviceaccount.com' })
  assert.notEqual(prod.status, 0)
  assert.match(prod.stdout, /PRODUCTION_PROJECT_FORBIDDEN/)
})
