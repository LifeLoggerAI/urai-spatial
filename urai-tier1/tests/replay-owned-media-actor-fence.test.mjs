import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'
const source=readFileSync(new URL('../src/spatial/memory/replayOwnerMediaFence.ts',import.meta.url),'utf8')
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
const module={exports:{}}
vm.runInNewContext(compiled,{module,exports:module.exports},{filename:'replayOwnerMediaFence.ts'})
const {currentOwnerMediaState}=module.exports
const originalActor={uid:'actor-a'}
const playback={key:'memory-a',status:'ready',media:[{kind:'video',url:'blob:private-source'}],actor:originalActor}
const view=(props={})=>currentOwnerMediaState(props.playback??playback,props.key??'memory-a',props.ownerId??'actor-a',props.liveActor===undefined?originalActor:props.liveActor,true)
test('current owner sees admitted media after exact-user and memory match',()=>{assert.equal(view(),playback)})
test('new account and sign-out cannot inherit a ready Blob URL from prior owner',()=>{
 for(const liveActor of [{uid:'actor-b'},null,{uid:'actor-a'}]){const result=view({liveActor});assert.equal(result.status,'loading');assert.equal(result.media.length,0)}
})
test('changed memory selection or owner scope clears prior media without showing URL',()=>{
 assert.equal(view({key:'memory-b'}).media.length,0)
 assert.equal(view({ownerId:'actor-b'}).media.length,0)
})
test('loading and revoked state remain fail closed without an unauthorized ready promotion',()=>{
 assert.equal(view({playback:{...playback,status:'unavailable',media:[]}}).status,'unavailable')
 assert.equal(view({playback:{...playback,status:'loading',media:[]}}).status,'loading')
})
