import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const yaml = readFileSync(new URL('../.github/workflows/prune-stale-release-runs.yml', import.meta.url), 'utf8')
const source = yaml.split('          script: |\n')[1].split('\n').map(line => line.replace(/^ {12}/, '')).join('\n')
const execute = new (Object.getPrototypeOf(async function () {}).constructor)('github', 'context', 'core', source)
const fullName = 'LifeLoggerAI/urai-spatial'
const pr = { state: 'closed', merged: false, head: { ref: 'repair/obsolete', sha: 'old', repo: { full_name: fullName } } }
const run = { id: 1, name: 'URAI Spatial CI', status: 'queued', event: 'pull_request', repository: { full_name: fullName }, head_repository: { full_name: fullName }, head_branch: 'repair/obsolete', head_sha: 'old' }

async function scenario(options = {}) {
  const cancelled = []
  const failures = []
  const events = []
  let reads = 0
  const context = { repo: { owner: 'LifeLoggerAI', repo: 'urai-spatial' }, ref: 'refs/heads/main', sha: 'dispatch', runId: 999, payload: { inputs: { closed_pr_number: options.input ?? '1369' } } }
  const summary = { addHeading() { return this }, addRaw() { return this }, async write() {} }
  const github = { rest: {
    pulls: { list: 'pulls', async get() { reads++; return { data: options.prAt ? options.prAt(reads) : (options.pr ?? pr) } } },
    repos: { async getBranch() { return { data: { commit: { sha: 'new-live-head' } } } } },
    actions: {
      listWorkflowRunsForRepo: 'runs',
      async getWorkflowRun({ run_id }) { events.push('read'); return { data: options.readback ?? (options.runs ?? [run]).find(run => run.id === run_id) } },
      async cancelWorkflowRun({ run_id }) { events.push('cancel'); if (options.cancelError) throw options.cancelError; cancelled.push(run_id) },
    },
  }, async paginate(method, params) {
    if (method === 'pulls') return options.open ?? []
    return (options.runs ?? [run]).filter(run => run.status === params.status)
  } }
  await execute(github, context, { summary, setFailed(message) { failures.push(message) } })
  return { cancelled, failures, events }
}

test('closed same-repository obsolete verification is re-read before cancellation', async () => {
  const result = await scenario()
  assert.deepEqual(result.cancelled, [1])
  assert.deepEqual(result.events, ['read', 'cancel'])
})

for (const [name, change] of [
  ['current run', { id: 999 }],
  ['manual work', { event: 'workflow_dispatch' }],
  ['provider work', { name: 'Home CC0 Asset Vendor Forge' }],
  ['deployment', { name: 'URAI Spatial Firebase Preview' }],
  ['other branch', { head_branch: 'repair/active' }],
  ['other revision', { head_sha: 'newer' }],
  ['fork', { head_repository: { full_name: 'other/urai-spatial' } }],
  ['completed evidence', { status: 'completed' }],
]) test(`preserves ${name}`, async () => {
  assert.deepEqual((await scenario({ runs: [{ ...run, ...change }] })).cancelled, [])
})

test('preserves revisions still serving as an open PR head or base', async () => {
  for (const field of ['head', 'base']) {
    const open = { head: { ref: 'other', sha: 'head' }, base: { ref: 'main', sha: 'base' } }
    open[field].sha = 'old'
    assert.deepEqual((await scenario({ open: [open] })).cancelled, [])
  }
})

test('refuses branches used by stacked open PRs', async () => {
  await assert.rejects(scenario({ open: [{ head: { ref: 'child', sha: 'child' }, base: { ref: pr.head.ref, sha: 'parent' } }] }), /open PR still uses/)
})

test('refuses open, merged and cross-repository PRs', async () => {
  for (const candidate of [{ ...pr, state: 'open' }, { ...pr, merged: true }, { ...pr, head: { ...pr.head, repo: { full_name: 'other/repo' } } }]) {
    await assert.rejects(scenario({ pr: candidate }), /closed, unmerged same-repository/)
  }
})

test('reopening during pagination aborts cancellation', async () => {
  await assert.rejects(scenario({ prAt: read => read === 1 ? pr : { ...pr, state: 'open' } }), /closed, unmerged/)
})

test('a run finishing during pagination is preserved', async () => {
  assert.deepEqual((await scenario({ readback: { ...run, status: 'completed' } })).cancelled, [])
})

test('branch pruning preserves both fresh branch head and dispatch revision', async () => {
  const runs = ['old', 'new-live-head', 'dispatch'].map((sha, index) => ({ ...run, id: index + 1, head_branch: 'main', head_sha: sha, event: 'push' }))
  assert.deepEqual((await scenario({ input: '', runs })).cancelled, [1])
})

test('invalid PR input fails before selecting any run', async () => {
  await assert.rejects(scenario({ input: '1369;unexpected' }), /Invalid closed PR number/)
})

test('cancellation conflict is harmless but unexpected errors fail', async () => {
  assert.deepEqual((await scenario({ cancelError: { status: 409 } })).failures, [])
  assert.equal((await scenario({ cancelError: { status: 403 } })).failures.length, 1)
})

test('normal branch pushes trigger maintenance, without production identity or code checkout', () => {
  assert.doesNotMatch(yaml, /\n    paths:|pull_request_target:|id-token:|secrets:|actions\/checkout@/)
  assert.match(yaml, /actions: write/)
  assert.match(yaml, /pull-requests: read/)
})
