import assert from 'node:assert/strict'
import test from 'node:test'
import { ensureNativeGitAncestry } from '../scripts/lib/native-git-ancestry.mjs'
const root = '18bd6f3dfc9363f3764fa8011a67072b35902741'
const source = 'ff38ab444015011c7f86de8f2ee645cf4037a650'
const branch = 'verify/r4-firestore-java21-admission-20261023'
const args = (extra = {}) => ({ branch, sourceHead: source, trustedAncestor: root, ...extra })

test('complete ancestry does not fetch or mutate source', async () => {
  const calls = []
  const result = await ensureNativeGitAncestry(args({
    runGit: async (argv) => {calls.push(argv);return {exitCode:0}}
  }))
  assert.equal(result.verified,true)
  assert.equal(result.deepenAttempts,0)
  assert.equal(result.releaseAuthorized,false)
  assert.deepEqual(calls, [['merge-base','--is-ancestor',root,source]])
})
test('shallow source is deepened exactly once, then rechecked', async () => {
  const calls=[]
  const result=await ensureNativeGitAncestry(args({allowDeepen:true,runGit:async argv=>{
    calls.push(argv)
    return {exitCode:calls.length===1?1:0}
  }}))
  assert.equal(result.deepenAttempts,1)
  assert.deepEqual(calls[1], ['fetch','--no-tags','--deepen=256','--filter=blob:none','origin','refs/heads/'+branch])
  assert.deepEqual(calls[2], ['merge-base','--is-ancestor',root,source])
})
test('incomplete history can require multiple bounded fetches', async () => {
  let checks=0,fetches=0
  const result=await ensureNativeGitAncestry(args({allowDeepen:true,runGit:async argv=>{
    if(argv[0]==='merge-base')return {exitCode:++checks<3?1:0}
    fetches++;return {exitCode:0}
  }}))
  assert.equal(result.deepenAttempts,2)
  assert.equal(fetches,2)
})
test('existing checkout missing ancestry is never fetched into', async () => {
  const calls=[]
  await assert.rejects(ensureNativeGitAncestry(args({allowDeepen:false,runGit:async argv=>{
    calls.push(argv);return {exitCode:1}
  }})),/NATIVE_HISTORY_MISSING_IN_EXISTING_CHECKOUT_NO_FETCH/)
  assert.equal(calls.length,1)
  assert.equal(calls[0][0],'merge-base')
})
test('bounded recovery cannot retry indefinitely or claim success', async () => {
  let checks=0,fetches=0
  await assert.rejects(ensureNativeGitAncestry(args({allowDeepen:true,runGit:async argv=>{
    if(argv[0]==='merge-base'){checks++;return {exitCode:1}}
    fetches++;return {exitCode:0}
  }})),/NATIVE_HISTORY_UNVERIFIED_AFTER_BOUNDED_FETCH/)
  assert.equal(fetches,4);assert.equal(checks,5)
})
test('fetch failure is never accepted as complete history', async () => {
  await assert.rejects(ensureNativeGitAncestry(args({allowDeepen:true,runGit:async argv=>
    ({exitCode:argv[0]==='fetch'?128:1})})),/NATIVE_HISTORY_BOUNDED_FETCH_FAILED/)
})
test('failing or timed-out ancestry probes do not count as passing', async () => {
  const calls=[]
  await assert.rejects(ensureNativeGitAncestry(args({runGit:async argv=>{
    calls.push(argv);return {exitCode:0,timedOut:true}
  }})),/NATIVE_HISTORY_ANCESTRY_COMMAND_FAILED/)
  assert.equal(calls.length,1)
})
test('unknown branches, invalid SHAs and missing command authority rejected', async () => {
  for(const change of [
    {branch:'main'},
    {branch:branch+';echo bad'},
    {sourceHead:'HEAD'},
    {trustedAncestor:'a'.repeat(39)},
    {runGit:null},
  ]) {
    await assert.rejects(ensureNativeGitAncestry(args({runGit:async ()=>({exitCode:0}),...change})),/NATIVE_HISTORY_AUTHORITY_INVALID/)
  }
})
test('historical default branch is supported without combined-mode authorization', async () => {
  const result=await ensureNativeGitAncestry(args({
    branch:'repair/rfinal-convergence-candidate-20261020',
    runGit:async()=>({exitCode:0}),
  }))
  assert.equal(result.verified,true)
})

test('Git corruption or missing objects are not mistaken for shallow ancestry', async () => {
  for (const broken of [2, 128, null]) {
    let fetches=0
    await assert.rejects(ensureNativeGitAncestry(args({
      allowDeepen:true,
      runGit:async argv=>{
        if(argv[0]==='fetch'){fetches++;return {exitCode:0}}
        return {exitCode:broken}
      },
    })), /NATIVE_HISTORY_ANCESTRY_COMMAND_FAILED/)
    assert.equal(fetches,0)
  }
})
test('timed out or spawn-error ancestry probes never deepen', async () => {
  for(const outcome of [{exitCode:1,timedOut:true},{exitCode:1,spawnError:'EPERM'}]) {
    let fetches=0
    await assert.rejects(ensureNativeGitAncestry(args({allowDeepen:true,runGit:async argv=>{
      if(argv[0]==='fetch')fetches++
      return outcome
    }})),/NATIVE_HISTORY_ANCESTRY_COMMAND_FAILED/)
    assert.equal(fetches,0)
  }
})
