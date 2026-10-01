import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const workflow = fs.readFileSync(new URL('../.github/workflows/launch-verification.yml', import.meta.url), 'utf8')

test('launch verification uploads only fresh exact-head evidence', () => {
  assert.match(workflow, /URAI_EXACT_HEAD:/)
  assert.match(workflow, /ref: \$\{\{ env\.URAI_EXACT_HEAD \}\}/)
  assert.match(workflow, /git rev-parse HEAD/)
  assert.match(workflow, /pnpm install --frozen-lockfile/)
  assert.match(workflow, /exact-head-receipt\.json/)
  assert.match(workflow, /verified-head\.txt/)
  assert.match(workflow, /route-smoke\.tsv/)
  assert.match(workflow, /runner\.temp }}\/urai-spatial-launch-evidence/)
  assert.match(workflow, /production_targeted": false/)
  assert.match(workflow, /deployment_attempted": false/)
  assert.doesNotMatch(workflow, /_audit\/20260623_launch_route_chain/)
  assert.doesNotMatch(workflow, /pnpm install --no-frozen-lockfile/)
  assert.doesNotMatch(workflow, /pnpm run live:deploy/)
})

test('launch verification uses pinned immutable action identities', () => {
  assert.match(workflow, /actions\/checkout@11bd71901bbe5b1630ceea73d27597364c9af683/)
  assert.match(workflow, /actions\/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020/)
  assert.match(workflow, /pnpm\/action-setup@b906affcce14559ad1aafd4ab0e942779e9f58b1/)
  assert.match(workflow, /actions\/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02/)
  assert.doesNotMatch(workflow, /uses:\s+[^\n]+@v\d+/)
  assert.ok(
    workflow.indexOf('name: Setup pnpm') < workflow.indexOf('name: Setup Node'),
    'pnpm must be installed before setup-node requests pnpm cache metadata',
  )
})
