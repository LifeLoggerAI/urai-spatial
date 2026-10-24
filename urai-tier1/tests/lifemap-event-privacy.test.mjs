import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeLifeMapEventPrivacy, lifeMapOwnerDocumentAllowed, projectLifeMapOwnerSnapshot } from '../src/components/lifemap/lifeMapEventPrivacy.mjs';

const cases = [
  [{ privacyLevel: 'hidden' }, 'hidden'],
  [{ privacy: 'hidden' }, 'hidden'],
  [{ privacyLevel: 'private', privacy: 'hidden' }, 'hidden'],
  [{ privacyLevel: 'shareable', privacy: 'hidden' }, 'hidden'],
  [{ privacyLevel: 'hidden', privacy: 'shareable' }, 'hidden'],
  [{ privacyLevel: 'shareable' }, 'shareable'],
  [{ privacyLevel: 'private' }, 'private'],
  [{ privacy: 'shareable' }, 'private'],
  [{ privacyLevel: 'unrecognized', privacy: 'shareable' }, 'private'],
  [{}, 'private'],
  [null, 'private'],
];

test('current and legacy hidden event fields are both fail-closed', () => {
  for (const [value, expected] of cases) {
    assert.equal(normalizeLifeMapEventPrivacy(value), expected, JSON.stringify(value));
  }
});
test('legacy shareable alias cannot escalate privacy authority', () => {
  assert.equal(normalizeLifeMapEventPrivacy({ privacy:'shareable' }), 'private');
});
test('normalization is pure even for frozen Firestore-like objects', () => {
  const doc = Object.freeze({ privacyLevel:'shareable', privacy:'hidden', id:'sealed' });
  assert.equal(normalizeLifeMapEventPrivacy(doc), 'hidden');
  assert.equal(doc.privacyLevel,'shareable');
});
test('non-object or invalid values default to private', () => {
  for (const value of [undefined, null, '', false, 0, [], 'hidden']) {
    assert.equal(normalizeLifeMapEventPrivacy(value),'private');
  }
});
const owner = 'signed-in-owner'
test('owner-scoped events accept exact owner', () => {
  assert.equal(lifeMapOwnerDocumentAllowed({userId:owner,title:'Owned memory'},owner),true)
})
test('wrong-owner event does not reveal metadata', () => {
  const docs=[{userId:'other-owner',title:'Wrong account'}, {userId:owner,title:'Correct account'}]
  assert.deepEqual(docs.filter(x=>lifeMapOwnerDocumentAllowed(x,owner)).map(x=>x.title),['Correct account'])
})
test('wrong-owner eras do not reveal names or node relationships', () => {
  const eras=[{userId:'other-owner',title:'Private family era',nodeIds:['private-star']},{userId:owner,title:'My era',nodeIds:['mine']}]
  assert.deepEqual(eras.filter(x=>lifeMapOwnerDocumentAllowed(x,owner)).map(x=>x.title),['My era'])
})
test('owner id mismatch and invalid explicit identifiers fail closed', () => {
  for(const data of [{userId:'other-owner'},{userId:''},{userId:null},{userId:44},{userId:false},{userId:[]}])
    assert.equal(lifeMapOwnerDocumentAllowed(data,owner),false)
})
test('legacy documents without userId remain bound to the owner path',()=>{
  assert.equal(lifeMapOwnerDocumentAllowed({title:'Legacy event'},owner),true)
  assert.equal(lifeMapOwnerDocumentAllowed(Object.freeze({privacy:'hidden'}),owner),true)
})
test('missing authenticated identity and malformed data are never admitted',()=>{
  for(const expected of ['',null,undefined,'demo-user','   '])
    assert.equal(lifeMapOwnerDocumentAllowed({userId:owner},expected),false)
  for(const bad of [undefined,null,false,42,[], 'text'])
    assert.equal(lifeMapOwnerDocumentAllowed(bad,owner),false)
})
test('hidden privacy cannot be escalated by owner admission',()=>{
  const doc={userId:owner,privacy:'hidden',privacyLevel:'shareable'}
  assert.equal(lifeMapOwnerDocumentAllowed(doc,owner),true)
})

const snapshot=(id,data)=>({id,data:()=>data})
test('snapshot projection is atomic and filters explicit foreign owners',()=>{
 assert.deepEqual(projectLifeMapOwnerSnapshot([
  snapshot('a',{userId:owner}), snapshot('foreign',{userId:'other'}), snapshot('b',{})
 ],owner,id=>({id})),{ok:true,items:[{id:'a'},{id:'b'}]})
})
test('malformed or throwing snapshots discard every candidate record',()=>{
 assert.deepEqual(projectLifeMapOwnerSnapshot([snapshot('a',{}),{id:'b',data:()=>{throw Error('bad')}}],owner,id=>({id})),{ok:false,items:[]})
 assert.deepEqual(projectLifeMapOwnerSnapshot([snapshot('a',{}),snapshot('b',{})],owner,id=>{if(id==='b')throw Error('bad');return {id}}),{ok:false,items:[]})
})
test('projection rejects mismatched identity and invalid snapshot authority',()=>{
 assert.deepEqual(projectLifeMapOwnerSnapshot([snapshot('a',{})],owner,()=>({id:'b'})),{ok:false,items:[]})
 assert.deepEqual(projectLifeMapOwnerSnapshot(null,owner,()=>({id:'a'})),{ok:false,items:[]})
 assert.deepEqual(projectLifeMapOwnerSnapshot([snapshot('a',{})],'demo-user',()=>({id:'a'})),{ok:false,items:[]})
})
