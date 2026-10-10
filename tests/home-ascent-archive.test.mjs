import assert from 'node:assert/strict'
import test from 'node:test'
import { assertHomeAscentArchive } from '../scripts/home-sky-ascent-proof.mjs'

const expected={invocationId:'fixture-invocation-unique',exactHead:'a'.repeat(40),startingUrl:'https://urai.example/home/?demo=1',startingHeight:1.6471}
const valid=()=>({schemaVersion:'urai-read-only-home-ascent-archive-1',...expected,samples:[{phase:'HOME',cameraMode:'embodied-first-person',inputLocked:'false',sequence:'idle',height:1.6471,progress:0},{phase:'ASCENT',cameraMode:'ascent',inputLocked:'true',sequence:'life-map:traversal',height:4.4,progress:.2}]})
test('actual source-bound invocation archive preserves finite camera lift samples',()=>{
 const archive=valid();assert.equal(assertHomeAscentArchive(archive,expected),archive.samples)
})
for(const [name,edit] of [
 ['old source',archive=>archive.exactHead='b'.repeat(40)],
 ['stale invocation',archive=>archive.invocationId='old-invocation'],
 ['other starting URL',archive=>archive.startingUrl='https://urai.example/home/?demo=0'],
 ['foreign origin',archive=>archive.startingUrl='https://foreign.example/home/?demo=1'],
 ['different actual starting height',archive=>archive.startingHeight=2],
 ['no actual ascent sample',archive=>archive.samples=archive.samples.slice(0,1)],
 ['non-finite lift',archive=>archive.samples[1].height=NaN],
 ['unlocked camera',archive=>archive.samples[1].inputLocked='false'],
 ['symbolic sequence only',archive=>archive.samples[1].height=expected.startingHeight],
 ['wrong sequence',archive=>archive.samples[1].sequence='ground:opening'],
 ['unbounded sample payload',archive=>archive.samples=Array(513).fill(archive.samples[1])],
])test(`rejects ${name} archive instead of manufacturing ascent proof`,()=>{const archive=valid();edit(archive);assert.throws(()=>assertHomeAscentArchive(archive,expected))})
