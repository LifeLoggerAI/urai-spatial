import assert from 'node:assert/strict';
import test from 'node:test';
import {registerHooks} from 'node:module';
const hooks=registerHooks({
  resolve(specifier, context, nextResolve) {
    if(specifier==='firebase/auth') return {url:'urai-plan-source-fixture:auth',shortCircuit:true};
    return nextResolve(specifier,context);
  },
  load(url,context,nextLoad) {
    if(url==='urai-plan-source-fixture:auth') return {format:'module',source:'export const getAuth=()=>({currentUser:null});',shortCircuit:true};
    return nextLoad(url,context);
  },
});
const {canAccessPlan}=await import('../src/components/spatial/stripePlanGate.ts');
hooks.deregister();
for(const status of ['canceled','past_due','incomplete','none',undefined]) {
  test('Founder '+String(status)+' cannot bypass refund/revocation for any paid tier',()=>{
    for(const tier of ['pro','therapist','founder']) assert.equal(canAccessPlan({planId:'founder',subscriptionStatus:status},tier),false);
  });
}
test('active and trialing plans preserve the governed plan ranks',()=>{
  for(const status of ['active','trialing']) {
    assert.equal(canAccessPlan({planId:'pro',subscriptionStatus:status},'pro'),true);
    assert.equal(canAccessPlan({planId:'pro',subscriptionStatus:status},'therapist'),false);
    assert.equal(canAccessPlan({planId:'therapist',subscriptionStatus:status},'therapist'),true);
    assert.equal(canAccessPlan({planId:'therapist',subscriptionStatus:status},'founder'),false);
    assert.equal(canAccessPlan({planId:'founder',subscriptionStatus:status},'founder'),true);
  }
});
test('free access remains available without a paid entitlement',()=>assert.equal(canAccessPlan(null,'free'),true));

