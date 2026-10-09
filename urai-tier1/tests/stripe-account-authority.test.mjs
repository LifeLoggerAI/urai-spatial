import test, { beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks, stripTypeScriptTypes } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Real transaction modules; explicit Auth/Firestore/Stripe transport doubles.
// No provider, credential, emulator, account or production acceptance is claimed.
const root = new URL('../../', import.meta.url);
const stubs = {
  'firebase-admin/app': 'export const getApps=()=>[{}]; export const initializeApp=()=>({}); export const applicationDefault=()=>({});',
  'firebase-admin/firestore': 'export const getFirestore=()=>globalThis.__stripeAccountFixture.db;',
  'firebase-admin/auth': 'export const getAuth=()=>({getUser:uid=>globalThis.__stripeAccountFixture.getUser(uid)});',
  'firebase-admin': 'export const apps=[{}]; export const initializeApp=()=>({}); export const firestore=()=>globalThis.__stripeAccountFixture.db; export const auth=()=>({getUser:uid=>globalThis.__stripeAccountFixture.getUser(uid)});',
  'firebase-functions/v1': 'export const https={onRequest:x=>x}; export const config=()=>({});',
  'stripe': 'export default class Stripe {}',
  'source:adc': 'export const assertExternalAccountAdc=()=>{};',
};
const hooks = registerHooks({
  resolve(s,c,next) {
    if (s==='@/lib/server/google-adc') return {url:'stripe-account-fixture:source:adc',shortCircuit:true};
    if (stubs[s]) return {url:'stripe-account-fixture:'+s,shortCircuit:true};
    if (s.startsWith('@/')) return {url:new URL('../src/'+s.slice(2)+'.ts',import.meta.url).href,shortCircuit:true};
    if (s.startsWith('.') && c.parentURL?.startsWith('file:') && !/\.[a-z]+$/i.test(s)) {
      const p=new URL(s+'.ts',c.parentURL);
      if (existsSync(fileURLToPath(p))) return {url:p.href,shortCircuit:true};
    }
    return next(s,c);
  },
  load(url,c,next) {
    if (url.startsWith('stripe-account-fixture:')) return {format:'module',source:stubs[url.slice('stripe-account-fixture:'.length)],shortCircuit:true};
    if (url.startsWith(root.href) && url.endsWith('.ts')) {
      let s=readFileSync(new URL(url),'utf8');
      if (url.endsWith('/stripeEntitlements.ts')) s+='\nexport { applyOrderedEntitlement };\n';
      return {format:'module',source:stripTypeScriptTypes(s,{mode:'strip'}),shortCircuit:true};
    }
    return next(url,c);
  },
});
const next = await import('../src/lib/entitlementStore.ts');
const firebase = await import('../../apps/functions/src/stripeEntitlements.ts');
const uid='source-owned-account';
const ownedPath='users/'+uid;
const fencePath=ownedPath+'/privacyRuntime/exportAuthority';
const tombstonePath='privacyDeletionTombstones/'+uid;
const billingPath=ownedPath+'/billingRuntime/stripeAuthority';
const priorStripeMode=process.env.URAI_STRIPE_MODE;
const incarnationId='inc_source_current_001';
let state;
function snapshot(path) {
  return {exists:state.docs.has(path),data:()=>state.docs.get(path),get:key=>state.docs.get(path)?.[key]};
}
beforeEach(()=>{
  process.env.URAI_STRIPE_MODE='test';
  state={
    docs:new Map([[ownedPath,{accountStatus:'active'}],[billingPath,{schemaVersion:1,uid,creationTime:1000,incarnationId,mode:'test',stripeCustomerId:'cus_source',issuedPlans:['pro','founder','therapist']}]]),writes:[],reads:[],authReads:0,
    auth:{uid,disabled:false,metadata:{creationTime:new Date(1000).toUTCString()}},
    async getUser(value) { assert.equal(value,uid); this.authReads++; await this.onAuthRead?.(this.authReads); if(this.authError)throw this.authError;return structuredClone(this.auth); },
  };
  const reference=path=>({path,id:path.split('/').at(-1),get:async()=>snapshot(path)});
  state.db={
    doc:reference,
    collection:path=>({
      doc:id=>reference(path+'/'+id),
      where:(_field,_op,values)=>({limit:()=>({path, get:async()=>({empty:![...state.docs].some(([p,d])=>p.startsWith(path+'/')&&values.includes(d.state))})})}),
    }),
    runTransaction:async fn=>fn({
      get:async ref=>{assert.equal(state.writes.length,0,'all authority reads precede writes');state.reads.push(ref.path);return ref.get();},
      set:(ref,value)=>{state.writes.push({path:ref.path,value});state.docs.set(ref.path,value);},
    }),
  };
  globalThis.__stripeAccountFixture=state;
});
after(()=>{hooks.deregister();delete globalThis.__stripeAccountFixture;if(priorStripeMode===undefined)delete process.env.URAI_STRIPE_MODE;else process.env.URAI_STRIPE_MODE=priorStripeMode;});
const record=()=>({...next.defaultEntitlement(uid),planId:'pro',stripeCustomerId:'cus_source',stripeSubscriptionId:'sub_source',subscriptionStatus:'active',stripeIncarnationId:incarnationId,stripeAccountCreationTime:1000,stripeBillingMode:'test'});
const implementations=[
  {name:'Next',run:(value,resolve)=>next.applyStripeEventEntitlement(value,{id:'evt_source',created:100,resolveCurrentSubscription:resolve})},
  {name:'Functions',run:(value,resolve)=>firebase.applyOrderedEntitlement(value,{id:'evt_source',created:100},resolve)},
];
for(const implementation of implementations) {
  test(implementation.name+' applies an ordinary current-account settled event',async()=>{
    const result=await implementation.run(record());assert.equal(result.applied,true);assert.equal(state.writes.length,1);
    assert.ok(state.reads.includes(ownedPath));assert.ok(state.reads.includes(fencePath));assert.ok(state.reads.includes(tombstonePath));assert.equal(state.authReads,4);
  });
  const denials=[
    ['missing current owner',()=>state.docs.delete(ownedPath)],
    ['disabled current owner',()=>state.docs.set(ownedPath,{accountStatus:'disabled'})],
    ['deleted owner flag',()=>state.docs.set(ownedPath,{deleted:true})],
    ['deleting current owner',()=>state.docs.set(ownedPath,{accountStatus:'deleting'})],
    ['disabled Auth account',()=>state.auth.disabled=true],
    ['missing Auth account',()=>state.authError=Object.assign(Error('missing'),{code:'auth/user-not-found'})],
    ['prior UID incarnation event',()=>state.auth.metadata.creationTime=new Date(200000).toUTCString()],
    ['foreign Auth identity',()=>state.auth.uid='foreign-source'],
    ['malformed Auth incarnation',()=>state.auth.metadata.creationTime='unknown'],
    ['active canonical tombstone',()=>state.docs.set(tombstonePath,{uid,active:true})],
    ['malformed canonical tombstone',()=>state.docs.set(tombstonePath,{uid})],
    ['foreign canonical tombstone',()=>state.docs.set(tombstonePath,{uid:'foreign',active:false})],
    ['pending operational deletion',()=>state.docs.set(fencePath,{generation:1,pendingDeletions:{queued:true}})],
    ['malformed deletion epoch',()=>state.docs.set(fencePath,{generation:-1,pendingDeletions:{}})],
    ['malformed pending-deletion object',()=>state.docs.set(fencePath,{generation:1,pendingDeletions:[]})],
    ...['awaiting-grace','queued','in-progress','failed'].map(value=>['current deletion job '+value,()=>state.docs.set(ownedPath+'/deletionJobs/source',{state:value})]),
  ];
  for(const [name,change] of denials) test(implementation.name+' denies '+name,async()=>{
    change();const result=await implementation.run(record());assert.equal(result.applied,false);assert.equal(result.reason,'current-account-denied');assert.equal(state.writes.length,0);
  });
  test(implementation.name+' retries unavailable Auth without granting or acknowledging completion',async()=>{
    state.authError=Object.assign(Error('temporary'),{code:'auth/internal-error'});
    const result=await implementation.run(record());assert.equal(result.applied,false);assert.equal(result.retryable,true);assert.equal(state.writes.length,0);
  });
  test(implementation.name+' permits completed cleanup and inactive canonical tombstone for a current incarnation',async()=>{
    state.docs.set(fencePath,{generation:2,pendingDeletions:{}});state.docs.set(tombstonePath,{uid,active:false});state.docs.set(ownedPath+'/deletionJobs/source',{state:'completed'});
    assert.equal((await implementation.run(record())).applied,true);
  });
  for(const [name,change] of [
    ['owner deletion',()=>state.docs.delete(ownedPath)],
    ['queued cleanup',()=>state.docs.set(fencePath,{generation:1,pendingDeletions:{new:true}})],
    ['canonical withdrawal',()=>state.docs.set(tombstonePath,{uid,active:true})],
    ['Auth disable',()=>state.auth.disabled=true],
    ['UID recreation',()=>state.auth.metadata.creationTime=new Date(50000).toUTCString()],
  ]) test(implementation.name+' denies '+name+' during the awaited equal-time provider resolution',async()=>{
    const value=record();state.docs.set('userEntitlements/'+uid,{...value,subscriptionStatus:'past_due',stripeLastEventCreated:100,stripeLastEventId:'evt_old'});
    const result=await implementation.run(value,async()=>{change();return value;});assert.equal(result.applied,false);assert.equal(state.writes.length,0);
  });
  test(implementation.name+' denies Auth disable during final current-authority read',async()=>{
    state.onAuthRead=async count=>{if(count===4)state.auth.disabled=true;};
    assert.equal((await implementation.run(record())).applied,false);assert.equal(state.writes.length,0);
  });
  test(implementation.name+' preserves duplicate and stale-event no-write controls',async()=>{
    state.docs.set('userEntitlements/'+uid,{...record(),stripeLastEventCreated:200,stripeLastEventId:'evt_source'});
    assert.equal((await implementation.run(record())).reason,'duplicate-event');assert.equal(state.writes.length,0);
    state.docs.set('userEntitlements/'+uid,{...record(),stripeLastEventCreated:200,stripeLastEventId:'evt_other'});
    assert.equal((await implementation.run(record())).reason,'stale-event');assert.equal(state.writes.length,0);
  });
}



for (const implementation of implementations) {
  const billingDenials = [
    ['missing server billing authority',()=>state.docs.delete(billingPath)],
    ['missing incarnation on provider event',value=>delete value.stripeIncarnationId],
    ['foreign provider incarnation',value=>value.stripeIncarnationId='inc_previous_account_001'],
    ['foreign provider customer',value=>value.stripeCustomerId='cus_foreign'],
    ['unissued plan',()=>state.docs.get(billingPath).issuedPlans=[]],
    ['foreign billing owner',()=>state.docs.get(billingPath).uid='foreign'],
    ['wrong provider realm',()=>state.docs.get(billingPath).mode='production'],
    ['legacy malformed billing authority',()=>state.docs.set(billingPath,{stripeCustomerId:'cus_source'})],
  ];
  for(const [name,change] of billingDenials) test(implementation.name+' denies '+name+' without changing retained finance',async()=>{
    const value=record();change(value);const before=structuredClone([...state.docs]);
    const result=await implementation.run(value);assert.equal(result.applied,false);assert.equal(state.writes.length,0);
    assert.deepEqual([...state.docs],before);
  });
  test(implementation.name+' rejects a delayed predecessor subscription after new account creation',async()=>{
    state.auth.metadata.creationTime=new Date(2000).toISOString();
    state.docs.set(billingPath,{...state.docs.get(billingPath),creationTime:2000,incarnationId:'inc_new_account_002'});
    // Event second 100 is later than the recreated account; timestamp fence alone cannot establish authority.
    assert.equal((await implementation.run(record())).applied,false);assert.equal(state.writes.length,0);
  });
  test(implementation.name+' rejects predecessor metadata after recreation within the same event second',async()=>{
    state.auth.metadata.creationTime=new Date(100200).toISOString();
    state.docs.set(billingPath,{...state.docs.get(billingPath),creationTime:100200,incarnationId:'inc_new_same_second_002'});
    assert.equal((await implementation.run(record())).applied,false);assert.equal(state.writes.length,0);
  });
  test(implementation.name+' accepts exact current association at the same event second',async()=>{
    state.auth.metadata.creationTime=new Date(100200).toISOString();state.docs.get(billingPath).creationTime=100200;
    const value={...record(),stripeAccountCreationTime:100200};
    assert.equal((await implementation.run(value)).applied,true);
    assert.equal(state.writes[0].value.stripeAccountCreationTime,100200);assert.equal(state.writes[0].value.stripeIncarnationId,incarnationId);
  });
  test(implementation.name+' retains an unbound legacy finance row without converting it to active current access',async()=>{
    const legacy={...record()};delete legacy.stripeIncarnationId;delete legacy.stripeAccountCreationTime;delete legacy.stripeBillingMode;
    state.docs.set('userEntitlements/'+uid,legacy);
    assert.equal((await implementation.run(record())).applied,false);assert.equal(state.writes.length,0);
    assert.deepEqual(state.docs.get('userEntitlements/'+uid),legacy);
  });
  test(implementation.name+' rejects binding withdrawal during equal-second provider readback',async()=>{
    const value=record();state.docs.set('userEntitlements/'+uid,{...value,subscriptionStatus:'past_due',stripeLastEventCreated:100,stripeLastEventId:'evt_old'});
    const result=await implementation.run(value,async()=>{state.docs.delete(billingPath);return value;});
    assert.equal(result.applied,false);assert.equal(state.writes.length,0);
  });
  test(implementation.name+' requires an issued matching checkout receipt',async()=>{
    const value={...record(),stripeCheckoutSessionId:'cs_unissued'};
    const result=await implementation.run(value);assert.equal(result.applied,false);assert.equal(result.retryable,true);assert.equal(state.writes.length,0);
  });
}
