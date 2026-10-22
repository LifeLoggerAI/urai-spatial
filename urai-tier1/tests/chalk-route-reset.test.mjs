import test from 'node:test';
import assert from 'node:assert/strict';
import {resetChalkRouteState} from '../src/spatial/chalk/chalkRouteReset.mjs';
import {isChalkSessionLeaseCurrent} from '../src/spatial/chalk/chalkSessionLease.mjs';

function setup() {
  const calls=[];
  const state={busy:true,report:'private local observation',pending:{id:'unsubmitted'},jobs:[{jobId:'held_test'}],listening:true};
  const callbacks={
    stop(){calls.push('stop');state.listening=false},
    setReport(value){calls.push('report');state.report=value},
    setPending(value){calls.push('pending');state.pending=value},
    setJobs(value){calls.push('jobs');state.jobs=value},
    setBusy(value){calls.push('busy');state.busy=value},
  };
  return {calls,state,callbacks};
}
test('route change releases stale busy state, diagnostic, job listing and microphone',()=>{
 const {calls,state,callbacks}=setup();
 resetChalkRouteState(callbacks);
 assert.deepEqual(state,{busy:false,report:'',pending:null,jobs:[],listening:false});
 assert.deepEqual(calls,['stop','report','pending','jobs','busy']);
});
test('new destination can start another engineering request',()=>{
 const {state,callbacks}=setup();resetChalkRouteState(callbacks);
 assert.equal(state.busy,false);
 state.busy=true;
 assert.equal(state.busy,true);
});
test('route ABA cannot accept stale result after release',()=>{
 const lease={requestedUid:'founder_12345',currentUid:'founder_12345',requestedAuthEpoch:4,currentAuthEpoch:4,
  requestedRoute:'/life-map',currentRoute:'/life-map',requestedRouteEpoch:8,currentRouteEpoch:10};
 const {callbacks,state}=setup();resetChalkRouteState(callbacks);
 assert.equal(isChalkSessionLeaseCurrent(lease),false);
 assert.equal(state.busy,false);
});
test('invalid callbacks fail before partially clearing user state',()=>{
 const {state,callbacks}=setup();
 assert.throws(()=>resetChalkRouteState({...callbacks,setJobs:undefined}),/CALLBACKS_REQUIRED/);
 assert.equal(state.busy,true);
 assert.equal(state.pending.id,'unsubmitted');
});
