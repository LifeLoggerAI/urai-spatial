'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const prune = require('./prune-stale-release-runs.cjs');
const current = 'a'.repeat(40), old = 'b'.repeat(40), newer = 'c'.repeat(40);
function fixture(options = {}) {
  const target = { id: 90, event: 'pull_request', created_at: '2026-10-07T11:00:00Z', head_branch: 'release', head_sha: old, head_repository: { full_name: 'LifeLoggerAI/urai-spatial' }, status: 'in_progress', ...options.target };
  const cancelled = []; let reads = 0;
  const github = { paginate: async (_, args) => args.status === 'queued' ? [target] : [], rest: {
    pulls: { get: async () => ({ data: { state: 'open', head: { sha: options.heads?.[Math.min(reads++, options.heads.length - 1)] || current, ref: 'release', repo: { full_name: 'LifeLoggerAI/urai-spatial' } }, base: { repo: { full_name: 'LifeLoggerAI/urai-spatial' } } } }) },
    git: { getRef: async () => ({ data: { object: { sha: options.pushHead || current } } }) },
    actions: { listWorkflowRunsForRepo() {},
      getWorkflowRun: async ({ run_id }) => ({ data: run_id === 100 ? { id: 100, created_at: '2026-10-07T11:05:00Z' } : { ...target, ...(options.terminal && cancelled.length ? { status: 'completed' } : {}) } }),
      cancelWorkflowRun: async ({ run_id }) => { cancelled.push(run_id); if (options.cancelError) throw Object.assign(new Error('API error'), { status: options.cancelError }); }
    }
  }};
  const context = { repo: { owner: 'LifeLoggerAI', repo: 'urai-spatial' }, runId: 100, sha: current, ref: 'refs/heads/release', payload: { pull_request: { number: 1, head: { sha: current, ref: 'release', repo: { full_name: 'LifeLoggerAI/urai-spatial' } }, base: { repo: { full_name: 'LifeLoggerAI/urai-spatial' } } } } };
  const run = () => prune({ github, context, core: { warning() {} }, sleep: async () => {} });
  return { run, cancelled, context };
}
test('only same-repository older active source gets a cancellation request', async () => { const f = fixture(); const r = await f.run(); assert.deepEqual(f.cancelled, [90]); assert.equal(r.cancelRequested, 1); });
test('historical PR rerun cannot cancel newer live candidate', async () => { const f = fixture({ heads: [newer] }); assert.equal((await f.run()).superseded, true); assert.deepEqual(f.cancelled, []); });
test('live PR movement before cancellation preserves all remaining work', async () => { const f = fixture({ heads: [current, current, newer] }); assert.equal((await f.run()).superseded, true); assert.deepEqual(f.cancelled, []); });
test('newer run ID is preserved even with misleading timestamps', async () => { const f = fixture({ target: { id: 101 } }); await f.run(); assert.deepEqual(f.cancelled, []); });
test('current SHA reruns are preserved', async () => { const f = fixture({ target: { head_sha: current } }); await f.run(); assert.deepEqual(f.cancelled, []); });
test('manual protected runtime dispatch is preserved', async () => { const f = fixture({ target: { event: 'workflow_dispatch' } }); await f.run(); assert.deepEqual(f.cancelled, []); });
test('foreign repository same branch name is preserved', async () => { const f = fixture({ target: { head_repository: { full_name: 'foreign/urai-spatial' } } }); await f.run(); assert.deepEqual(f.cancelled, []); });
test('unknown creation identity is preserved', async () => { const f = fixture({ target: { created_at: 'invalid' } }); await f.run(); assert.deepEqual(f.cancelled, []); });
test('terminal readback resolves a transient cancel exhaustion', async () => { const f = fixture({ cancelError: 502, terminal: true }); const r = await f.run(); assert.equal(f.cancelled.length, 4); assert.equal(r.alreadyTerminal, 1); assert.deepEqual(r.failures, []); });
test('active target after cancel exhaustion remains a failure', async () => { const f = fixture({ cancelError: 502 }); const r = await f.run(); assert.deepEqual(r.failures, ['90:502']); });
test('409 conflict is only accepted with actual terminal readback', async () => { const f = fixture({ cancelError: 409 }); const r = await f.run(); assert.deepEqual(r.failures, ['90:409']); });
test('push rerun also requires current live branch identity', async () => { const f = fixture({ pushHead: newer }); f.context.payload = {}; assert.equal((await f.run()).superseded, true); assert.deepEqual(f.cancelled, []); });
test('fork PR event cannot acquire branch cancellation authority', async () => { const f = fixture(); f.context.payload.pull_request.head.repo.full_name = 'foreign/urai-spatial'; await f.run(); assert.deepEqual(f.cancelled, []); });

test('live branch movement between transient retries stops cancellation', async () => { const f = fixture({ heads: [current, current, current, current, newer], cancelError: 502 }); const r = await f.run(); assert.equal(r.superseded, true); assert.deepEqual(f.cancelled, [90]); assert.deepEqual(r.failures, []); });
