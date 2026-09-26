import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const workflow = fs.readFileSync(new URL('../.github/workflows/prune-stale-release-runs.yml', import.meta.url), 'utf8')
const script = workflow.split('          script: |\n')[1].split('\n').map(line => line.slice(12)).join('\n')
const execute = new (Object.getPrototypeOf(async function () {}).constructor)('github', 'context', 'core', script)
async function run({ contextSha = 'current', heads = ['current'], relation = 'ahead', runs, compareError } = {}) {
  const cancelled = [], compared = [], notices = [], failures = []
  const queue = runs ?? [{ id: 1, head_branch: 'repair/example', head_sha: 'old' }]
  let reads = 0
  const github = {
    paginate: async (_, args) => args.status === 'queued' ? queue : [],
    rest: {
      git: { getRef: async () => ({ data: { object: { sha: heads[Math.min(reads++, heads.length - 1)] } } }) },
      repos: { compareCommits: async args => { compared.push(args); if (compareError) throw compareError; return { data: { status: relation } } } },
      actions: { listWorkflowRunsForRepo() {}, cancelWorkflowRun: async args => cancelled.push(args.run_id) },
    },
  }
  const summary = { addHeading() { return this }, addRaw() { return this }, async write() {} }
  await execute(github, { sha: contextSha, runId: 99, ref: 'refs/heads/repair/example', repo: { owner: 'owner', repo: 'repo' } }, { notice: value => notices.push(value), setFailed: value => failures.push(value), summary })
  return { cancelled, compared, notices, failures }
}
test('old queued pruner cannot cancel new branch runs', async () => {
  const r = await run({ contextSha: 'old', runs: [{ id: 1, head_branch: 'repair/example', head_sha: 'current' }] })
  assert.deepEqual(r.cancelled, []); assert.equal(r.compared.length, 0); assert.equal(r.notices.length, 1)
})
test('only strict ancestor runs from the exact branch are cancelled', async () => {
  const r = await run({ runs: [
    { id: 1, head_branch: 'repair/example', head_sha: 'old' },
    { id: 2, head_branch: 'repair/example', head_sha: 'current' },
    { id: 3, head_branch: 'other', head_sha: 'old' },
    { id: 99, head_branch: 'repair/example', head_sha: 'old' },
  ] })
  assert.deepEqual(r.cancelled, [1]); assert.equal(r.compared[0].base, 'old'); assert.equal(r.compared[0].head, 'current')
})
for (const relation of ['behind', 'diverged', 'identical']) test(`preserves ${relation} history`, async () => {
  assert.deepEqual((await run({ relation })).cancelled, [])
})
for (const heads of [['current', 'new'], ['current', 'current', 'new']]) test(`branch movement at read ${heads.length} aborts cancellation`, async () => {
  assert.deepEqual((await run({ heads })).cancelled, [])
})
test('unverifiable ancestry fails closed with explicit failure', async () => {
  const r = await run({ compareError: { status: 404 } }); assert.deepEqual(r.cancelled, []); assert.equal(r.failures.length, 1)
})
