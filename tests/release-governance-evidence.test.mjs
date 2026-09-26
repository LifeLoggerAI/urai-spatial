import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

const workflow = readFileSync(new URL('../.github/workflows/release-governance-guard.yml', import.meta.url), 'utf8')
const sha = 'a'.repeat(40)
function step(name) {
  const block = workflow.split(`      - name: ${name}\n`)[1]?.split('\n      - name: ')[0]
  assert.ok(block, name)
  return block
}
function run(name, dir, env = {}) {
  const body = step(name).split('        run: |\n')[1].split('\n').map(line => line.startsWith('          ') ? line.slice(10) : line).join('\n')
  return spawnSync('bash', ['-c', body], { cwd: dir, encoding: 'utf8', env: {
    ...process.env, EXACT_SHA: sha, BASE_SHA: 'b'.repeat(40), GITHUB_REPOSITORY: 'owner/repo',
    REPOSITORY: 'owner/repo', GITHUB_API_URL: 'https://fixture.invalid', PR_NUMBER: '1', PR_AUTHOR: 'author', GH_TOKEN: 'synthetic', ...env,
  } })
}
function temp(t) {
  const dir = mkdtempSync(join(tmpdir(), 'governance-evidence-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  return dir
}
function approval(id, state = 'APPROVED', login = 'reviewer', commit = sha) {
  return { id, state, user: { login }, submitted_at: `2026-09-26T00:00:00Z`, commit_id: commit }
}
function reviews(t, pages) {
  const dir = temp(t)
  mkdirSync(join(dir, 'bin'))
  writeFileSync(join(dir, 'pages.json'), JSON.stringify(pages))
  writeFileSync(join(dir, 'bin/curl'), `#!/usr/bin/env node
const fs = require('node:fs');
const url = process.argv.at(-1);
if (url.endsWith('/permission')) { console.log(JSON.stringify({permission:'read'})); }
else {
  const page = new URL(url).searchParams.get('page');
  fs.appendFileSync('requests.txt', page + '\\n');
  const value = JSON.parse(fs.readFileSync('pages.json'))[Number(page)-1];
  if (!value) process.exit(22);
  console.log(JSON.stringify(value));
}
`, { mode: 0o755 })
  return { dir, result: run('Require exact-head governed approval', dir, { PATH: `${join(dir, 'bin')}:${process.env.PATH}` }) }
}

test('later-page changes-requested revokes an earlier exact-head approval', t => {
  const page = [approval(1), ...Array.from({ length: 99 }, (_, i) => approval(i + 2, 'COMMENTED', 'other'))]
  const { result, dir } = reviews(t, [page, [approval(101, 'CHANGES_REQUESTED')]])
  assert.equal(result.status, 1, result.stderr)
  assert.match(result.stderr, /No independent exact-head approval/)
  assert.equal(readFileSync(join(dir, 'requests.txt'), 'utf8'), '1\n2\n')
})
test('later-page eligible approval is admitted, while author/stale approvals remain rejected', t => {
  const page = Array.from({ length: 100 }, (_, i) => approval(i + 1, 'COMMENTED'))
  const accepted = reviews(t, [page, [approval(101)]])
  assert.equal(accepted.result.status, 0, accepted.result.stderr)
  assert.equal(readFileSync(join(accepted.dir, 'artifacts/release-governance/approved-reviewer.txt'), 'utf8'), 'reviewer\n')
  for (const review of [approval(1, 'APPROVED', 'author'), approval(1, 'APPROVED', 'reviewer', 'c'.repeat(40))]) {
    assert.equal(reviews(t, [[review]]).result.status, 1)
  }
})
test('malformed or failed review page fails closed', t => {
  assert.notEqual(reviews(t, [{ message: 'rate limited' }]).result.status, 0)
  const full = Array.from({ length: 100 }, (_, i) => approval(i + 1))
  assert.notEqual(reviews(t, [full]).result.status, 0)
})
test('approval failure still retains an honest unknown/not-run receipt', t => {
  const dir = temp(t)
  const outcomes = { scope: { outcome: 'success', outputs: { applies: 'true' } }, checkout: { outcome: 'success' }, tree: { outcome: 'success' }, approval: { outcome: 'failure' } }
  const result = run('Retain guard receipt', dir, { GUARD_STEPS: JSON.stringify(outcomes) })
  assert.equal(result.status, 0, result.stderr)
  const receipt = JSON.parse(readFileSync(join(dir, 'artifacts/release-governance/receipt.json')))
  assert.equal(receipt.exactSha, sha)
  assert.equal(receipt.gateOutcomes.approval, 'failure')
  assert.equal(receipt.gateOutcomes.records, 'not-run')
  assert.equal(receipt.temporaryDispatcherPresent, null)
  assert.equal(receipt.incidentRecordPresent, null)
  assert.equal(receipt.changedReleaseWorkflowsValidated, null)
  assert.equal(receipt.independentApprovalVerified, false)
  assert.equal(receipt.productionAuthorized, false)
  for (const name of ['Retain guard receipt', 'Upload governance receipt']) {
    assert.match(step(name), /if: always\(\) && steps\.scope\.outputs\.applies != 'false'/)
  }
})
test('successful validation counts files without authorizing production', t => {
  const dir = temp(t)
  const root = join(dir, 'artifacts/release-governance')
  mkdirSync(root, { recursive: true })
  writeFileSync(join(root, 'validated-release-workflows.txt'), 'one.yml\ntwo.yml\n')
  writeFileSync(join(root, 'validated-production-records.txt'), '')
  writeFileSync(join(root, 'approved-reviewer.txt'), 'reviewer\n')
  writeFileSync(join(root, 'approval-mode.txt'), 'independent-collaborator\n')
  const outcomes = Object.fromEntries(['scope', 'checkout', 'tree', 'approval', 'dispatchers', 'ownership', 'workflows', 'records', 'boundary'].map(id => [id, { outcome: 'success' }]))
  outcomes.scope.outputs = { applies: 'true' }
  const result = run('Retain guard receipt', dir, { GUARD_STEPS: JSON.stringify(outcomes) })
  assert.equal(result.status, 0, result.stderr)
  const receipt = JSON.parse(readFileSync(join(root, 'receipt.json')))
  assert.equal(receipt.changedReleaseWorkflowsValidated, 2)
  assert.equal(receipt.productionAuthorizationRecordsValidated, 0)
  assert.equal(receipt.independentApprovalVerified, true)
  assert.equal(receipt.temporaryDispatcherPresent, false)
  assert.equal(receipt.incidentRecordPresent, true)
  assert.equal(receipt.productionAuthorized, false)
})
