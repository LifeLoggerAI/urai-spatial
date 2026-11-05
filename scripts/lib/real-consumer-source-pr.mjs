import assert from 'node:assert/strict'
import fs from 'node:fs'

const SOURCE_REPOSITORY = 'LifeLoggerAI/urai-spatial'

/** Bind artifact identity to the native GitHub event and the checked-out exact SHA.
 * Workflow dispatch has no native PR identity, so it must never inherit one.
 */
export function sourcePrFromEvent({ eventName, event, repository, exactSha }) {
  assert.equal(repository, SOURCE_REPOSITORY, 'Unexpected source repository')
  assert.match(String(exactSha || ''), /^[a-f0-9]{40}$/, 'Invalid exact source SHA')
  assert.ok(event && typeof event === 'object', 'Missing native GitHub event')
  assert.equal(event.repository?.full_name, SOURCE_REPOSITORY,
    'Native event repository differs from build source')
  if (eventName === 'workflow_dispatch') return null
  assert.equal(eventName, 'pull_request', 'Unbound source event cannot claim a PR')
  const pr = event.pull_request
  assert.ok(pr && Number.isSafeInteger(pr.number) && pr.number > 0,
    'No valid native pull request number')
  assert.equal(event.number, pr.number, 'Contradictory native PR identifiers')
  assert.equal(pr.head?.sha, exactSha, 'Native PR head differs from checked-out source')
  assert.equal(pr.head?.repo?.full_name, SOURCE_REPOSITORY,
    'External or deleted fork cannot assert source PR authority')
  assert.equal(pr.base?.repo?.full_name, SOURCE_REPOSITORY,
    'Native base repository not canonical')
  assert.ok(typeof pr.head?.ref === 'string' && pr.head.ref.length > 0,
    'Missing native head ref')
  assert.ok(typeof pr.base?.ref === 'string' && pr.base.ref.length > 0,
    'Missing native base ref')
  return pr.number
}

export function sourcePrFromRunner(env = process.env) {
  assert.ok(env.GITHUB_EVENT_PATH, 'Native GitHub event payload required')
  const event = JSON.parse(fs.readFileSync(env.GITHUB_EVENT_PATH, 'utf8'))
  return sourcePrFromEvent({eventName: env.GITHUB_EVENT_NAME,
    event, repository: env.GITHUB_REPOSITORY, exactSha: env.URAI_EXACT_HEAD})
}
