import test from 'node:test';import assert from 'node:assert/strict';
import {selectChalkCallableFunctions} from '../src/spatial/chalk/chalkEmulatorRouting.mjs';
const context=()=>({journeyEmulatorEnabled:true,projectId:'demo-urai-auth-journey',reviewRequested:true,jobsEmulatorRequested:true});
test('reuse existing client object, no reconnect',()=>{const f={id:1};assert.equal(selectChalkCallableFunctions(f,context()),f)});
test('deny unexpected project',()=>assert.throws(()=>selectChalkCallableFunctions({}, {...context(),projectId:'urai-4dc1d'}),/DENIED/));
test('deny partial flags A',()=>assert.throws(()=>selectChalkCallableFunctions({}, {...context(),jobsEmulatorRequested:false}),/DENIED/));
test('deny partial flags B',()=>assert.throws(()=>selectChalkCallableFunctions({}, {...context(),reviewRequested:false}),/DENIED/));
test('deny absent client',()=>assert.throws(()=>selectChalkCallableFunctions(null,context()),/UNAVAILABLE/));
test('deny string flag',()=>assert.throws(()=>selectChalkCallableFunctions({}, {...context(),reviewRequested:'true'}),/CONFIG/));
