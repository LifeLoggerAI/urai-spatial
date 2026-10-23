import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
const source = readFileSync(new URL('../cloudbuild.urai-verify.yaml', import.meta.url), 'utf8')
const pinnedBranch = 'verify/r4-three-lane-convergence-20261023'
function firstStep(yaml) {
  const lines = yaml.split(/\r?\n/)
  const idx = lines.findIndex(x => x === '      - |')
  assert.ok(idx >= 0)
  let script = ''
  for (let i=idx+1; i<lines.length && (lines[i].startsWith('        ')||lines[i]==='');i++)
    script += (lines[i].startsWith('        ')?lines[i].slice(8):'') + '\n'
  return script.split('$$').join('$')
}
function preflight(env) {
  const script = firstStep(source).split('export GIT_TERMINAL_PROMPT=0')[0]
  const defaults = {
    URAI_SOURCE_BRANCH:pinnedBranch, URAI_SOURCE_SHA:'b'.repeat(40),
    URAI_CLOUD_PROJECT:'urai-qa-123',
    URAI_VERIFIER_SA:'urai-verifier@urai-qa-123.iam.gserviceaccount.com',
  }
  return spawnSync('bash',['-ceu',script + '\necho PREFLIGHT_COMPLETE'],{
    timeout:4000,encoding:'utf8',env:{...process.env,...defaults,...env}
  })
}
test('composite verifier defaults to R4 branch but requires an independently supplied SHA',()=>{
  assert.match(source,/_SOURCE_BRANCH:\s*'verify\/r4-three-lane-convergence-20261023'/)
  assert.match(source,/_SOURCE_SHA:\s*'EXPLICIT_PIN_REQUIRED'/)
  assert.doesNotMatch(source,/_SOURCE_SHA:\s*'[0-9a-f]{40}'/)
})
test('real verifier accepts only verified branch namespace and valid nonproduction identity',()=>{
  for (const branch of [pinnedBranch,'repair/test-case','ci/review-test']) {
    const result = preflight({URAI_SOURCE_BRANCH:branch})
    assert.equal(result.status,0,`${branch}: ${result.stdout} ${result.stderr}`)
    assert.match(result.stdout,/PREFLIGHT_COMPLETE/)
  }
  for (const branch of ['main','refs/heads/main','verify/../../evil','verify/branch;echo HACKED']) {
    const result = preflight({URAI_SOURCE_BRANCH:branch})
    assert.notEqual(result.status,0,branch)
    assert.match(result.stdout,/INVALID_SOURCE_BRANCH/)
    assert.doesNotMatch(result.stdout,/PREFLIGHT_COMPLETE/)
  }
  const prod = preflight({URAI_CLOUD_PROJECT:'urai-4dc1d', URAI_VERIFIER_SA:'urai-verifier@urai-4dc1d.iam.gserviceaccount.com'})
  assert.notEqual(prod.status,0)
  assert.match(prod.stdout,/PRODUCTION_PROJECT_FORBIDDEN/)
})
