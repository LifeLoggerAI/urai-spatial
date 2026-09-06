import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const workflowPath = new URL('../.github/workflows/spatial-post-deploy-verify.yml', import.meta.url)
const workflow = fs.readFileSync(workflowPath, 'utf8')

test('post-deploy verification requires an explicit expected deployed SHA', () => {
  assert.match(workflow, /expected_deployed_sha:\s*\n\s+description:/)
  assert.match(workflow, /expected_deployed_sha:[\s\S]*?required:\s*true/)
  assert.match(workflow, /URAI_EXPECTED_DEPLOYED_SHA:\s*\$\{\{ inputs\.expected_deployed_sha \}\}/)
  assert.match(workflow, /REQUIRE_LIVE_COMMIT_SHA:\s*["']true["']/)
})

test('post-deploy verification binds checkout and canonical authority to the expected SHA before live smoke', () => {
  assert.match(workflow, /ref:\s*\$\{\{ inputs\.expected_deployed_sha \}\}/)
  assert.match(workflow, /fetch-depth:\s*0/)
  assert.match(workflow, /persist-credentials:\s*false/)
  assert.match(workflow, /git fetch --no-tags origin main:refs\/remotes\/origin\/main/)
  assert.match(workflow, /node scripts\/verify-custom-domain-deployed-sha-authority\.mjs/)

  const authorityIndex = workflow.indexOf('Verify expected deployed SHA is canonical main authority')
  const smokeIndex = workflow.indexOf('Live smoke checks')
  assert.ok(authorityIndex >= 0, 'canonical deployed-SHA authority step must exist')
  assert.ok(smokeIndex > authorityIndex, 'canonical deployed-SHA authority must be proven before live smoke')
})
