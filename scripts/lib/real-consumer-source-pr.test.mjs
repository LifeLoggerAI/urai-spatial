import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {sourcePrFromEvent,sourcePrFromRunner} from './real-consumer-source-pr.mjs'
const repo='LifeLoggerAI/urai-spatial'
const sha='902b4fdf3cd7d2094f202ae6cb60cc1d364aa65a'
const event=(number=1636)=>({repository:{full_name:repo},number,
  pull_request:{number,head:{sha,ref:'repair/release-closure-integration-20261007',repo:{full_name:repo}},
  base:{ref:'main',repo:{full_name:repo}}}})
const args=(e,eventName='pull_request')=>({eventName,event:e,repository:repo,exactSha:sha})
assert.equal(sourcePrFromEvent(args(event())),1636)
assert.equal(sourcePrFromEvent(args(event(1841))),1841)
assert.notEqual(sourcePrFromEvent(args(event())),1810)
assert.equal(sourcePrFromEvent(args({repository:{full_name:repo}},'workflow_dispatch')),null)
let bad=event();bad.number=1810
assert.throws(()=>sourcePrFromEvent(args(bad)),/Contradictory native PR/)
bad=event();bad.pull_request.head.sha='a'.repeat(40)
assert.throws(()=>sourcePrFromEvent(args(bad)),/Native PR head differs/)
bad=event();bad.pull_request.head.repo.full_name='untrusted/fork'
assert.throws(()=>sourcePrFromEvent(args(bad)),/External or deleted fork/)
bad=event();bad.pull_request.base.repo.full_name='untrusted/fork'
assert.throws(()=>sourcePrFromEvent(args(bad)),/Native base repository/)
bad=event();bad.repository.full_name='untrusted/fork'
assert.throws(()=>sourcePrFromEvent(args(bad)),/Native event repository differs/)
assert.throws(()=>sourcePrFromEvent(args(event(),'push')),/Unbound source event/)
assert.throws(()=>sourcePrFromEvent({...args(event()),repository:'untrusted/fork'}),/Unexpected source repository/)
assert.throws(()=>sourcePrFromEvent({...args(event()),exactSha:'bad'}),/Invalid exact source SHA/)
assert.throws(()=>sourcePrFromRunner({}),/Native GitHub event payload required/)
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'urai-native-event-'))
try{
 const file=path.join(dir,'event.json');fs.writeFileSync(file,JSON.stringify(event()))
 assert.equal(sourcePrFromRunner({GITHUB_EVENT_PATH:file,GITHUB_EVENT_NAME:'pull_request',GITHUB_REPOSITORY:repo,URAI_EXACT_HEAD:sha}),1636)
}finally{fs.rmSync(dir,{recursive:true,force:true})}
console.log('PASS native event exact-head PR provenance and refusal regressions')
