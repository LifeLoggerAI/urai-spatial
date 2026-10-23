import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'

const original = readFileSync(new URL('../src/spatial/life-movie/lifeMovieOwnerSequence.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(original, { compilerOptions: {module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,strict:true} }).outputText
const module={exports:{}}
vm.runInNewContext(compiled,{module,exports:module.exports},{filename:'lifeMovieOwnerSequence.ts'})
const {currentLifeMovieMemories}=module.exports
const owner={uid:'owner-a'}, otherOwner={uid:'owner-b'}, rehydratedSameUid={uid:'owner-a'}
const movieA={id:'movie-a'}, movieB={id:'movie-b'}
const memories=[{id:'memory-a',ownerId:'owner-a',title:'Private A'}]
const sequence={actor:owner,movieId:'movie-a',selectedMemoryId:'memory-a',manifest:movieA,memories}
const select=(overrides={})=>currentLifeMovieMemories(
 overrides.bound===undefined?sequence:overrides.bound,
 overrides.actor===undefined?owner:overrides.actor,
 overrides.liveActor===undefined?owner:overrides.liveActor,
 overrides.movieId===undefined?'movie-a':overrides.movieId,
 overrides.memoryId===undefined?'memory-a':overrides.memoryId,
 overrides.manifest===undefined?movieA:overrides.manifest,
)
test('only exact authorized owner and requested original movie can render source memories',()=>{
 assert.equal(select(),memories)
 assert.equal(select({movieId:'movie-b',manifest:movieB}),null)
 assert.equal(select({memoryId:'memory-b'}),null)
})
test('owner switching or same-uid actor replacement hides previously loaded memories synchronously',()=>{
 assert.equal(select({liveActor:otherOwner}),null)
 assert.equal(select({liveActor:null}),null)
 assert.equal(select({liveActor:rehydratedSameUid}),null)
 assert.equal(select({actor:rehydratedSameUid,liveActor:rehydratedSameUid}),null)
})
test('manifest replacement, revocation, or loading is not allowed to reuse previous chapters',()=>{
 assert.equal(select({manifest:movieB}),null)
 assert.equal(select({manifest:null}),null)
 assert.equal(select({bound:null}),null)
})
test('authenticated ad-hoc sequence remains available without a governed movie manifest',()=>{
 const adHoc={...sequence,movieId:null,manifest:null}
 assert.equal(select({bound:adHoc,movieId:null,manifest:null}),memories)
 assert.deepEqual(Array.from(select({bound:{...adHoc,memories:[]},movieId:null,manifest:null})),[])
})
