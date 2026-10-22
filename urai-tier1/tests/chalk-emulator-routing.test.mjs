import test from 'node:test';
import assert from 'node:assert/strict';
import { CHALK_FUNCTIONS_REGION, CHALK_FUNCTIONS_EMULATOR, chalkReviewEmulatorAllowed, requireChalkReviewEmulator } from '../src/spatial/chalk/chalkEmulatorRouting.mjs';
const valid=()=>({journeyEmulatorEnabled:true,projectId:'demo-urai-auth-journey',reviewRequested:true,jobsEmulatorRequested:true});
test('exact Firebase functions region and loopback destination',()=>{
 assert.equal(CHALK_FUNCTIONS_REGION,'us-central1');
 assert.deepEqual(CHALK_FUNCTIONS_EMULATOR,{host:'127.0.0.1',port:5001});
 assert.equal(Object.isFrozen(CHALK_FUNCTIONS_EMULATOR),true);
});
test('all isolated review guards admit local test project only',()=>{
 assert.equal(chalkReviewEmulatorAllowed(valid()),true);
 assert.deepEqual(requireChalkReviewEmulator(valid()),CHALK_FUNCTIONS_EMULATOR);
});
for (const [reason,change] of [
 ['production project',{projectId:'urai-4dc1d'}],
 ['other demo project',{projectId:'demo-other'}],
 ['disabled journey emulator',{journeyEmulatorEnabled:false}],
 ['missing journey emulator',{journeyEmulatorEnabled:undefined}],
 ['review opt-in missing',{reviewRequested:false}],
 ['jobs emulator opt-in missing',{jobsEmulatorRequested:false}],
 ['string flag forbidden',{reviewRequested:'true'}],
 ['null project',{projectId:null}],
]) test('refuses '+reason,()=>{
 const x={...valid(),...change};
 assert.equal(chalkReviewEmulatorAllowed(x),false);
 assert.throws(()=>requireChalkReviewEmulator(x),/CHALK_REVIEW_EMULATOR_DENIED/);
});
