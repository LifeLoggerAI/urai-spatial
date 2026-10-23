import test from 'node:test';
import assert from 'node:assert/strict';
import {chalkIntent,chalkDiagnostic} from '../src/spatial/chalk/chalkSpatialContract.mjs';
const base=()=>({route:'/focus',component:'focus',sourceSha:'a'.repeat(40),actorUid:'founder_123',frames:[16,17,18,60,16,17,20,15]});
test('diagnostic captures honest local metrics',()=>{const x=chalkDiagnostic(base());assert.equal(x.status,'LOCAL_UNSUBMITTED');assert.equal(x.p95Ms,60);assert.equal(x.selectedStar,null)});
test('Chalk natural requests route but never execute',()=>{assert.equal(chalkIntent('Chalk, this transition is choppy'),'DIAGNOSTIC');assert.equal(chalkIntent('Chalk what engineering tasks are running'),'READ_JOBS');assert.equal(chalkIntent('Chalk pause that engineering job'),'NOT_CONNECTED')});
test('private star requires explicit same-owner authority',()=>{const b=base();assert.throws(()=>chalkDiagnostic({...b,allowStar:true,star:{authorized:false,ownerUid:b.actorUid,id:'star1'}}),/STAR_DENIED/);assert.throws(()=>chalkDiagnostic({...b,allowStar:true,star:{authorized:true,ownerUid:'foreign',id:'star1'}}),/STAR_DENIED/);assert.equal(chalkDiagnostic({...b,allowStar:true,star:{authorized:true,ownerUid:b.actorUid,id:'star1'}}).selectedStar.id,'star1')});
test('unknown source, route and invalid frames fail closed',()=>{const b=base();for(const patch of [{sourceSha:'unverified'},{component:'billing'},{route:'/settings/privacy'},{frames:[NaN]}])assert.throws(()=>chalkDiagnostic({...b,...patch}),/CHALK_SPATIAL_/)});
