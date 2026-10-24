import assert from 'node:assert/strict'
import test from 'node:test'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { ensureNativeGitAncestry } from '../scripts/lib/native-git-ancestry.mjs'
const root = '18bd6f3dfc9363f3764fa8011a67072b35902741'
const source = 'ff38ab444015011c7f86de8f2ee645cf4037a650'
const branch = 'verify/r4-exact-self-source-cloudbuild-20261023'
const args = (extra = {}) => ({ branch, sourceHead: source, trustedAncestor: root,
  ...extra,
  runGit: typeof extra.runGit === 'function' ? async (argv, name) => {
    // Preserve existing simulated ancestry probes; real-git regressions below
    // exercise the actual shallow-object and repository-mode transitions.
    if (argv[0] === 'rev-parse') return { exitCode: 0, output: 'true' }
    if (argv[0] === 'cat-file') return { exitCode: 0 }
    return extra.runGit(argv, name)
  } : extra.runGit,
})

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

test('a full repository with a missing ancestor never fetches', async () => {
  let fetches = 0
  await assert.rejects(ensureNativeGitAncestry({
    branch, sourceHead: source, trustedAncestor: root, allowDeepen: true,
    runGit: async argv => {
      if (argv[0] === 'rev-parse') return {exitCode:0,output:'false'}
      if (argv[0] === 'cat-file' && argv[2] === root+'^{commit}')
        return {exitCode:128,output:'fatal: Not a valid object name '+root+'^{commit}'}
      if (argv[0] === 'fetch') fetches++
      return {exitCode:0}
    },
  }),/NATIVE_HISTORY_TRUSTED_ANCESTOR_UNREADABLE/)
  assert.equal(fetches,0)
})

test('unexpected shallow Git failure is not interpreted as missing history', async () => {
  for (const failure of ['fatal: loose object is corrupt', 'fatal: Permission denied']) {
    let fetches = 0
    await assert.rejects(ensureNativeGitAncestry({
      branch, sourceHead: source, trustedAncestor: root, allowDeepen: true,
      runGit: async argv => {
        if (argv[0] === 'rev-parse') return {exitCode:0,output:'true'}
        if (argv[0] === 'cat-file' && argv[2] === root+'^{commit}')
          return {exitCode:128,output:failure}
        if (argv[0] === 'fetch') fetches++
        return {exitCode:0}
      },
    }),/NATIVE_HISTORY_TRUSTED_ANCESTOR_UNREADABLE/)
    assert.equal(fetches,0)
  }
})

test('unverified repository shallow state fails before any fetch', async () => {
  let fetches = 0
  await assert.rejects(ensureNativeGitAncestry({
    branch, sourceHead: source, trustedAncestor: root, allowDeepen:true,
    runGit:async argv => {
      if (argv[0]==='fetch') fetches++
      return {exitCode:0,output:'not-a-shallow-state'}
    }
  }),/NATIVE_HISTORY_SHALLOW_STATE_UNVERIFIED/)
  assert.equal(fetches,0)
})

test('real shallow clone returns 128 for missing ancestor and recovers with bounded deepen', async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(),'urai-git-ancestry-'))
  const origin = path.join(dir,'origin'), checkout = path.join(dir,'checkout')
  const git = (cwd, argv) => spawnSync('git', argv, {cwd, encoding:'utf8', timeout:20000})
  try {
    mkdirSync(origin)
    assert.equal(git(origin,['init','-q','-b',branch]).status,0)
    assert.equal(git(origin,['config','user.name','UrAi Fixture']).status,0)
    assert.equal(git(origin,['config','user.email','fixture@urai.invalid']).status,0)
    writeFileSync(path.join(origin,'file.txt'),'root\\n')
    assert.equal(git(origin,['add','file.txt']).status,0)
    assert.equal(git(origin,['commit','-qm','root']).status,0)
    const ancestor = git(origin,['rev-parse','HEAD']).stdout.trim()
    for(let i=1;i<=8;i++) {
      writeFileSync(path.join(origin,'file.txt'),String(i)+'\\n')
      assert.equal(git(origin,['commit','-qam','commit-'+i]).status,0)
    }
    const tip = git(origin,['rev-parse','HEAD']).stdout.trim()
    assert.equal(git(dir,['clone','-q','--depth=2','--single-branch','--branch',branch,
      pathToFileURL(origin).href,checkout]).status,0)
    const failed = git(checkout,['merge-base','--is-ancestor',ancestor,tip])
    assert.equal(failed.status,128)
    assert.match(failed.stderr,/not a valid commit name/i)
    let fetches = 0
    const done = await ensureNativeGitAncestry({
      branch,sourceHead:tip,trustedAncestor:ancestor,allowDeepen:true,
      runGit:async argv => {
        const p = git(checkout,argv)
        if(argv[0]==='fetch')fetches++
        return {exitCode:p.status,output:(p.stdout+p.stderr).trim(),
          timedOut:Boolean(p.error),spawnError:p.error?.message}
      },
    })
    assert.equal(done.verified,true)
    assert.equal(done.deepenAttempts,1)
    assert.equal(fetches,1)
    assert.equal(git(checkout,['merge-base','--is-ancestor',ancestor,tip]).status,0)
  } finally {rmSync(dir,{recursive:true,force:true})}
})
