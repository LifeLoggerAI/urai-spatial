import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isChalkSpatialOperatorClaim} from '../src/spatial/chalk/chalkSpatialOperatorRole.mjs';

const good = [
  {role:'admin'}, {role:'operator'}, {uraiSpatialAdmin:true},
  {roles:['admin']}, {roles:['operator']},
  {role:'user', roles:['user','operator']},
];
for (const [i,claims] of good.entries()) {
  test('permits current Spatial operator policy '+i,()=>{
    assert.equal(isChalkSpatialOperatorClaim(claims),true);
  });
}
for (const [name,claims] of [
  ['Jobs-specific flag alone',{uraiJobsAdmin:true}],
  ['Jobs flag and user role',{role:'user',uraiJobsAdmin:true}],
  ['forged string operator',{role:'user',uraiSpatialAdmin:'true'}],
  ['forged roles string',{roles:'admin'}],
  ['null',null],['array',['admin']],['scalar',1],['false',false],
  ['user role',{role:'user'}],['empty',{}],
  ['nullified roles',{role:'user',roles:null}],
]) {
  test('denies '+name,()=>assert.equal(isChalkSpatialOperatorClaim(claims),false));
}
test('frontend delegates its presentation check to the Spatial operator policy',()=>{
  const source=readFileSync(new URL('../src/spatial/chalk/ChalkPresenceRuntime.tsx',import.meta.url),'utf8');
  assert.match(source,/import\s*\{isChalkSpatialOperatorClaim\}\s*from '\.\/chalkSpatialOperatorRole\.mjs'/);
  assert.match(source,/if\(!isChalkSpatialOperatorClaim\(c\)\)\{setAccess\('denied'\)/);
  assert.doesNotMatch(source,/c\.uraiJobsAdmin/);
});
