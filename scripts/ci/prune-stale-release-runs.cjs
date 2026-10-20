'use strict';

// A PR event SHA is historical. Never cancel on its authority without live readback.
module.exports = async function prune({ github, context, core, sleep = (ms) => new Promise((r) => setTimeout(r, ms)) }) {
  const owner = context.repo.owner;
  const repo = context.repo.repo;
  const pr = context.payload.pull_request;
  const branch = pr?.head?.ref || context.ref.replace('refs/heads/', '');
  const sha = pr?.head?.sha || context.sha;
  const repoName = owner + '/' + repo;
  const active = new Set(['queued', 'in_progress', 'waiting', 'pending', 'requested']);
  const transient = new Set([429, 500, 502, 503, 504]);
  const result = { branch, sha, inspected: 0, cancelRequested: 0, alreadyTerminal: 0, preserved: 0, superseded: false, failures: [] };
  if (!/^[0-9a-f]{40}$/.test(sha) || !Number.isSafeInteger(context.runId) || !branch) throw new Error('Invalid pruning identity');
  if (pr && (pr.head.repo.full_name !== repoName || pr.base.repo.full_name !== repoName)) {
    result.superseded = true;
    return result; // Fork runs cannot establish repository branch authority.
  }
  const retry = async (label, operation) => {
    for (let attempt = 1; attempt <= 4; attempt++) {
      try { return await operation(); }
      catch (error) {
        if (!transient.has(error?.status) || attempt === 4) throw error;
        core.warning(label + ' transient HTTP ' + error.status + '; retry ' + attempt + '/4');
        await sleep(Math.min(8000, 750 * (2 ** (attempt - 1))));
      }
    }
  };
  const liveSha = async () => {
    if (pr) {
      const { data } = await retry('Read live PR head', () => github.rest.pulls.get({ owner, repo, pull_number: pr.number }));
      if (data.state !== 'open' || data.head?.ref !== branch || data.head?.repo?.full_name !== repoName || data.base?.repo?.full_name !== repoName) return null;
      return data.head.sha;
    }
    const { data } = await retry('Read live branch head', () => github.rest.git.getRef({ owner, repo, ref: 'heads/' + branch }));
    return data.object?.sha;
  };
  const readRun = (id) => retry('Read workflow run ' + id, () => github.rest.actions.getWorkflowRun({ owner, repo, run_id: id }));
  if (await liveSha() !== sha) { result.superseded = true; return result; }
  const { data: invoking } = await readRun(context.runId);
  const invokingTime = Date.parse(invoking.created_at);
  if (invoking.id !== context.runId || !Number.isFinite(invokingTime)) throw new Error('Invalid invoking run identity');
  const seen = new Set();
  const eligible = (run) => (
    Number.isSafeInteger(run.id) && run.id < context.runId &&
    run.head_branch === branch && run.head_sha !== sha &&
    /^[0-9a-f]{40}$/.test(run.head_sha) &&
    run.head_repository?.full_name === repoName &&
    ['push', 'pull_request'].includes(run.event) &&
    Number.isFinite(Date.parse(run.created_at)) && Date.parse(run.created_at) <= invokingTime
  );
  for (const status of active) {
    const runs = await retry('List workflow runs ' + status, () => github.paginate(
      github.rest.actions.listWorkflowRunsForRepo, { owner, repo, status, per_page: 100 }));
    for (const listed of runs) {
      if (seen.has(listed.id)) continue;
      seen.add(listed.id);
      if (!eligible(listed)) { result.preserved++; continue; }
      if (await liveSha() !== sha) { result.superseded = true; return result; }
      const { data: run } = await readRun(listed.id);
      if (!eligible(run)) { result.preserved++; continue; }
      if (!active.has(run.status)) { result.alreadyTerminal++; continue; }
      // Refresh immediately before the bounded side effect. New source invalidates this invocation.
      if (await liveSha() !== sha) { result.superseded = true; return result; }
      result.inspected++;
      try {
        await retry('Cancel workflow run ' + run.id, async () => {
          if (await liveSha() !== sha) throw Object.assign(new Error('Pruning invocation superseded'), { superseded: true });
          return github.rest.actions.cancelWorkflowRun({ owner, repo, run_id: run.id });
        });
        result.cancelRequested++;
      } catch (error) {
        if (error.superseded) { result.superseded = true; return result; }
        try {
          const { data: after } = await readRun(run.id);
          if (after.id === run.id && after.status === 'completed') { result.alreadyTerminal++; continue; }
        } catch (_) { /* No trustworthy terminal readback: retain the original failure. */ }
        result.failures.push(String(run.id) + ':' + (error?.status || 'unknown'));
      }
    }
  }
  return result;
};
