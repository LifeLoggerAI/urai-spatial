import assert from 'node:assert/strict';
import test, {beforeEach, after} from 'node:test';
import {registerHooks} from 'node:module';
import {mkdtempSync, writeFileSync, rmSync, existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const fixtureDirectory = mkdtempSync(join(tmpdir(), 'urai-stripe-webhook-source-'));
const adcPath = join(fixtureDirectory, 'external-account.json');
writeFileSync(adcPath, JSON.stringify({
  type: 'external_account', audience: '//iam.googleapis.com/projects/source-test/pools/test/providers/test',
  subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
  token_url: 'https://sts.googleapis.com/v1/token', credential_source: {file: join(fixtureDirectory, 'fixture.jwt')},
}));
const priorEnvironment = new Map(['URAI_STRIPE_MODE', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET',
  'GOOGLE_APPLICATION_CREDENTIALS', 'URAI_FIREBASE_STATIC_EXPORT', 'FIREBASE_SERVICE_ACCOUNT_JSON',
  'FIREBASE_PRIVATE_KEY', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_TOKEN'].map((key) => [key, process.env[key]]));
let state;
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    const stubs = new Set(['next/server', 'stripe', 'firebase-admin/auth', 'firebase-admin/app', 'firebase-admin/firestore', 'firebase-functions/v1', 'firebase-admin']);
    if (stubs.has(specifier)) return {url: 'urai-stripe-source-test:' + specifier, shortCircuit: true};
    if (specifier.startsWith('@/')) {
      return {url: new URL('../src/' + specifier.slice(2) + '.ts', import.meta.url).href, shortCircuit: true};
    }
    if (specifier.startsWith('.') && context.parentURL?.startsWith('file:') && !/\.[a-z]+$/i.test(specifier)) {
      const candidate = new URL(specifier + '.ts', context.parentURL);
      if (existsSync(fileURLToPath(candidate))) return {url: candidate.href, shortCircuit: true};
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (!url.startsWith('urai-stripe-source-test:')) return nextLoad(url, context);
    let source;
    switch (url.slice('urai-stripe-source-test:'.length)) {
      case 'next/server':
        source = "export class NextResponse extends Response { static json(body, init) { return Response.json(body, init); } }"; break;
      case 'stripe':
        source = `export default class Stripe {
          constructor(key) { const s=globalThis.__uraiStripeSourceState; s.clients.push(key);
            this.webhooks={constructEvent(raw, signature) {if(signature!=='source-test-signature') throw Error('invalid-source-test-signature'); return JSON.parse(raw);}};
            this.subscriptions={retrieve: async id => globalThis.__uraiStripeSourceState.retrieve('subscriptions',id)};
            this.invoices={retrieve: async id => globalThis.__uraiStripeSourceState.retrieve('invoices',id)};
            this.paymentIntents={retrieve: async id => globalThis.__uraiStripeSourceState.retrieve('paymentIntents',id)};
            this.charges={retrieve: async id => globalThis.__uraiStripeSourceState.retrieve('charges',id)};
          }
        }`; break;
      case 'firebase-admin/app':
        source = "export const getApps=()=>[{}]; export const applicationDefault=()=>({}); export const initializeApp=()=>({});"; break;
      case 'firebase-admin/auth':
        source = `export function getAuth(){ return {getUser:uid=>globalThis.__uraiStripeSourceState.getUser(uid), async verifyIdToken(token, checkRevoked) {
          const s=globalThis.__uraiStripeSourceState; s.authChecks.push(checkRevoked);
          if(token==='revoked-fixture' && checkRevoked===true) throw Error('revoked');
          if(!['valid-fixture','revoked-fixture'].includes(token)) throw Error('invalid');
          return {uid:'user-source-fixture'};
        }}; }`; break;
      case 'firebase-admin/firestore':
        source = "export const getFirestore=()=>globalThis.__uraiStripeSourceState.db;"; break;
      case 'firebase-functions/v1':
        source = "export const https={onRequest:handler=>handler}; export const config=()=>({});"; break;
      case 'firebase-admin':
        source = `export const apps=[{}]; export const initializeApp=()=>({});
          export const auth=()=>({getUser:uid=>globalThis.__uraiStripeSourceState.getUser(uid), async verifyIdToken(token,checkRevoked){
            const s=globalThis.__uraiStripeSourceState; s.authChecks.push(checkRevoked);
            if(token==='revoked-fixture' && checkRevoked===true) throw Error('revoked');
            if(!['valid-fixture','revoked-fixture'].includes(token)) throw Error('invalid');
            return {uid:'user-source-fixture'};
          }});
          export const firestore=Object.assign(()=>globalThis.__uraiStripeSourceState.db,{FieldValue:{serverTimestamp:()=>0}});`; break;
      default: throw Error('unexpected source-test module');
    }
    return {format:'module', source, shortCircuit:true};
  },
});
beforeEach(() => {
  state = {
    subscriptions: new Map(), invoices: new Map(), paymentIntents: new Map(), charges: new Map(),
    accountDocs: new Map([['users/user-source-fixture', {accountStatus:'active'}]]),
    async getUser(uid) { return {uid, disabled:false, metadata:{creationTime:new Date(1000).toUTCString()}}; },
    entitlements: new Map(), clients: [], readbacks: [], authChecks: [], reads: 0,
    async retrieve(kind, id) {
      this.readbacks.push([kind,id]);
      const value=this[kind].get(id);
      if(value instanceof Error) throw value;
      if(!value) throw Error('missing-source-fixture');
      return value;
    },
  };
  const reference = (id) => ({
    id,
    async get() { state.reads++; return {exists: state.entitlements.has(id), data: () => state.entitlements.get(id)}; },
    async set(value) { state.entitlements.set(id, {...value}); },
  });
  const accountReference = path => ({path, async get() {return {exists:state.accountDocs.has(path), data:()=>state.accountDocs.get(path)};}});
  state.db = {
    doc: accountReference,
    collection(path) {
      if(path !== 'userEntitlements') return {doc:id=>accountReference(path+'/'+id),where:(_field,_op,values)=>({limit:()=>({get:async()=>({empty:![...state.accountDocs].some(([p,d])=>p.startsWith(path+'/')&&values.includes(d.state))})})})};
      return {
        doc: reference,
        where(_key, _operator, id) {
          return {limit() {return {async get() {
            const docs = [...state.entitlements].filter(([, value]) => value.stripeCustomerId === id)
              .map(([key, value]) => ({id: key, data: () => value}));
            return {empty: !docs.length, docs};
          }};}};
        },
      };
    },
    async runTransaction(callback) {
      return callback({get: (ref) => ref.get(), set: (ref, value) => state.entitlements.set(ref.id, {...value})});
    },
  };
  globalThis.__uraiStripeSourceState=state;
  process.env.URAI_STRIPE_MODE='test';
  process.env.STRIPE_SECRET_KEY='sk_test_source_fixture';
  process.env.STRIPE_WEBHOOK_SECRET='whsec_source_fixture';
  process.env.GOOGLE_APPLICATION_CREDENTIALS=adcPath;
  delete process.env.URAI_FIREBASE_STATIC_EXPORT;
  for(const key of ['FIREBASE_SERVICE_ACCOUNT_JSON','FIREBASE_PRIVATE_KEY','FIREBASE_CLIENT_EMAIL','FIREBASE_TOKEN']) delete process.env[key];
});
after(() => {
  hooks.deregister();
  delete globalThis.__uraiStripeSourceState;
  for(const [key,value] of priorEnvironment) {
    if(value===undefined) delete process.env[key]; else process.env[key]=value;
  }
  rmSync(fixtureDirectory,{recursive:true,force:true});
});

const {POST}=await import('../src/app/api/stripe/webhook/route.ts');
const {GET}=await import('../src/app/api/entitlement/route.ts');
const {handleStripeWebhook,getStripeEntitlement}=await import('../../apps/functions/src/stripeEntitlements.ts');
const userId='user-source-fixture';
function subscription(overrides={}) {
  return {id:'sub_fixture',customer:'cus_fixture',status:'active',latest_invoice:'in_current',
    metadata:{userId,planId:'pro'},...overrides};
}
function invoice(overrides={}) {
  return {id:'in_current',customer:'cus_fixture',status:'paid',
    parent:{type:'subscription_details',subscription_details:{subscription:'sub_fixture'}},...overrides};
}
function current(sub=subscription(), bill=invoice()) {
  state.subscriptions.set(sub.id,sub); state.invoices.set(bill.id,bill);
  return {sub,bill};
}
async function deliver(type, payload, options={}) {
  return POST(new Request('https://source-test.invalid/api/stripe/webhook',{
    method:'POST',headers:{'stripe-signature':options.signature??'source-test-signature'},
    body:JSON.stringify({id:options.id??'evt_fixture',created:options.created??100,livemode:options.livemode??false,
      type,data:{object:payload}}),
  }));
}

test('invoice.paid resolves current subscription and durably grants the matching paid plan', async()=>{
  const {bill}=current();
  const response=await deliver('invoice.paid',bill);
  assert.equal(response.status,200);
  assert.equal((await response.json()).applied,true);
  assert.equal(state.entitlements.get(userId).subscriptionStatus,'active');
  assert.equal(state.entitlements.get(userId).stripeSubscriptionId,'sub_fixture');
  assert.equal(state.entitlements.get(userId).stripeCustomerId,'cus_fixture');
});
test('invoice.payment_failed reaches the same backend and removes active paid access', async()=>{
  const {bill}=current(subscription(),invoice({status:'open'}));
  const response=await deliver('invoice.payment_failed',bill);
  assert.equal(response.status,200);
  assert.equal(state.entitlements.get(userId).subscriptionStatus,'past_due');
});
test('a delayed failed event cannot revoke a latest invoice which already recovered to paid', async()=>{
  current();
  await deliver('invoice.payment_failed',invoice({status:'open'}));
  assert.equal(state.entitlements.get(userId).subscriptionStatus,'active');
});
test('legacy signed invoice subscription fields are supported',async()=>{
  const {bill}=current(subscription(),invoice({parent:undefined,subscription:'sub_fixture'}));
  assert.equal((await deliver('invoice.paid',bill)).status,200);
  assert.equal(state.entitlements.get(userId).subscriptionStatus,'active');
});
test('a standalone one-off invoice cannot choose a user entitlement',async()=>{
  const response=await deliver('invoice.paid',invoice({parent:undefined,metadata:{userId,planId:'pro'}}));
  assert.equal(response.status,200); assert.equal((await response.json()).ignored,true);
  assert.equal(state.readbacks.length,0); assert.equal(state.entitlements.size,0);
});
test('a previous billing-period invoice is acknowledged without overwriting the current period',async()=>{
  const {bill}=current();
  const response=await deliver('invoice.payment_failed',{...bill,id:'in_previous',status:'open'});
  assert.equal((await response.json()).ignored,true); assert.equal(state.entitlements.size,0);
});
for(const [name,change] of [
  ['foreign customer',{customer:'cus_other'}],
  ['contradictory legacy subscription',{subscription:'sub_other'}],
  ['unrelated parent subscription',{parent:{type:'subscription_details',subscription_details:{subscription:'sub_other'}}}],
]) test(name+' fails retryably without an entitlement write',async()=>{
  current();
  const response=await deliver('invoice.paid',invoice(change));
  assert.equal(response.status,500); assert.equal(state.entitlements.size,0);
});
test('an unavailable current invoice remains retryable and does not acknowledge payment',async()=>{
  const {bill}=current(); state.invoices.set('in_current',new Error('provider-unavailable'));
  assert.equal((await deliver('invoice.paid',bill)).status,500);
  assert.equal(state.entitlements.size,0);
});
test('active subscription before first-payment settlement does not grant paid access',async()=>{
  const {sub}=current(subscription(),invoice({status:'open'}));
  assert.equal((await deliver('customer.subscription.created',sub)).status,200);
  assert.equal(state.entitlements.get(userId).subscriptionStatus,'incomplete');
});
test('an existing trial keeps its native trial state without a paid invoice lookup',async()=>{
  const sub=subscription({status:'trialing',latest_invoice:null});
  await deliver('customer.subscription.created',sub);
  assert.equal(state.entitlements.get(userId).subscriptionStatus,'trialing');
  assert.equal(state.readbacks.length,0);
});
test('duplicate and older signed events use the actual durable ordering implementation',async()=>{
  const {bill}=current();
  assert.equal((await (await deliver('invoice.paid',bill,{id:'evt_current',created:200})).json()).applied,true);
  assert.equal((await (await deliver('invoice.paid',bill,{id:'evt_current',created:200})).json()).reason,'duplicate-event');
  state.invoices.set('in_current',invoice({status:'open'}));
  assert.equal((await (await deliver('invoice.payment_failed',invoice({status:'open'}),{id:'evt_older',created:100})).json()).reason,'stale-event');
  assert.equal(state.entitlements.get(userId).subscriptionStatus,'active');
});
test('same-second paid delivery cannot reopen a canceled entitlement',async()=>{
  current();
  await deliver('customer.subscription.deleted',subscription({status:'canceled'}),{id:'evt_canceled',created:200});
  const response=await deliver('invoice.paid',invoice(),{id:'evt_paid',created:200});
  assert.equal((await response.json()).reason,'equal-time-precedence');
  assert.equal(state.entitlements.get(userId).subscriptionStatus,'canceled');
});
test('wrong-mode events are rejected before any provider lookup or entitlement write',async()=>{
  assert.equal((await deliver('invoice.paid',invoice(),{livemode:true})).status,400);
  assert.equal(state.readbacks.length,0); assert.equal(state.entitlements.size,0);
});
test('signature rejection stays before any provider lookup or entitlement write',async()=>{
  assert.equal((await deliver('invoice.paid',invoice(),{signature:'invalid-fixture'})).status,400);
  assert.equal(state.readbacks.length,0); assert.equal(state.entitlements.size,0);
});
test('revoked Firebase tokens cannot read an entitlement',async()=>{
  const response=await GET(new Request('https://source-test.invalid/api/entitlement',{headers:{authorization:'Bearer revoked-fixture'}}));
  assert.equal(response.status,401); assert.deepEqual(state.authChecks,[true]); assert.equal(state.reads,0);
});
test('valid authentication reads only its own entitlement without shared caching',async()=>{
  state.entitlements.set(userId,{userId,planId:'pro',subscriptionStatus:'active'});
  state.entitlements.set('other-user',{userId:'other-user',planId:'founder',subscriptionStatus:'active'});
  const response=await GET(new Request('https://source-test.invalid/api/entitlement',{headers:{authorization:'Bearer valid-fixture'}}));
  assert.equal(response.status,200); assert.equal((await response.json()).entitlement.userId,userId);
  assert.equal(response.headers.get('cache-control'),'private, no-store'); assert.deepEqual(state.authChecks,[true,true]);
});
test('static export remains closed with no auth or Firestore access',async()=>{
  process.env.URAI_FIREBASE_STATIC_EXPORT='true';
  assert.equal((await GET(new Request('https://source-test.invalid/api/entitlement'))).status,503);
  assert.equal(state.reads,0); assert.equal(state.authChecks.length,0);
});
function functionsResponse() {
  const result={status:200,headers:new Map(),body:null};
  const response={set(key,value){result.headers.set(key.toLowerCase(),value);return this;},
    status(value){result.status=value;return this;},json(body){result.body=body;return this;}};
  return {result,response};
}
async function deliverFunction(type,payload,options={}) {
  const event={id:options.id??'evt_function_fixture',created:options.created??100,
    livemode:options.livemode??false,type,data:{object:payload}};
  const {result,response}=functionsResponse();
  await handleStripeWebhook({method:'POST',body:event,rawBody:Buffer.from(JSON.stringify(event)),
    header:()=>options.signature??'source-test-signature'},response);
  return result;
}
function checkout(overrides={}) {
  return {id:'cs_fixture',customer:'cus_fixture',subscription:'sub_fixture',payment_status:'paid',
    metadata:{userId,planId:'pro'},...overrides};
}
for (const [handler,send] of [['Next',deliver],['Firebase',deliverFunction]]) {
  test(handler+' same-second current latest payment failure revokes previously paid access',async()=>{
    const {bill}=current();
    await send('invoice.paid',bill,{id:'evt_a_paid',created:200});
    assert.equal(state.entitlements.get(userId).subscriptionStatus,'active');
    const renewal=invoice({id:'in_renewal',status:'open'});
    current(subscription({latest_invoice:'in_renewal'}),renewal);
    const response=await send('invoice.payment_failed',renewal,{id:'evt_z_failed',created:200});
    assert.equal(response.status,200);
    assert.equal(state.entitlements.get(userId).subscriptionStatus,'past_due');
  });
  test(handler+' same-second verified paid recovery beats a later lexical failure ID',async()=>{
    current(subscription(),invoice({status:'open'}));
    await send('invoice.payment_failed',invoice({status:'open'}),{id:'evt_z_failed',created:200});
    assert.equal(state.entitlements.get(userId).subscriptionStatus,'past_due');
    state.invoices.set('in_current',invoice());
    assert.equal((await send('invoice.paid',invoice(),{id:'evt_a_paid',created:200})).status,200);
    assert.equal(state.entitlements.get(userId).subscriptionStatus,'active');
  });
  test(handler+' resolves a recovery occurring between initial failure lookup and transaction',async()=>{
    const {bill}=current();
    await send('invoice.paid',bill,{id:'evt_first',created:200});
    state.invoices.set('in_current',invoice({status:'open'}));
    const retrieve=state.retrieve;
    let reads=0;
    state.retrieve=async function(kind,id) {
      const value=await retrieve.call(this,kind,id);
      if(kind==='invoices' && ++reads===1) this.invoices.set('in_current',invoice());
      return value;
    };
    assert.equal((await send('invoice.payment_failed',invoice({status:'open'}),{id:'evt_failed',created:200})).status,200);
    assert.equal(state.entitlements.get(userId).subscriptionStatus,'active');
    assert.equal(reads,2);
  });
  test(handler+' cannot open access when a new unpaid invoice appears before the transaction',async()=>{
    current(subscription(),invoice({status:'open'}));
    await send('invoice.payment_failed',invoice({status:'open'}),{id:'evt_failed',created:200});
    state.invoices.set('in_current',invoice());
    const retrieve=state.retrieve;
    let changed=false;
    state.retrieve=async function(kind,id) {
      const value=await retrieve.call(this,kind,id);
      if(kind==='invoices' && !changed) {
        changed=true;
        current(subscription({latest_invoice:'in_renewal'}),invoice({id:'in_renewal',status:'open'}));
      }
      return value;
    };
    assert.equal((await send('invoice.paid',invoice(),{id:'evt_paid',created:200})).status,200);
    assert.equal(state.entitlements.get(userId).subscriptionStatus,'incomplete');
  });
  for(const direction of ['revoke','grant']) {
    test(handler+' unresolved same-second '+direction+' stays nonpaid and retryable',async()=>{
      current(subscription(),invoice({status:direction==='revoke'?'paid':'open'}));
      const initialType=direction==='revoke'?'invoice.paid':'invoice.payment_failed';
      await send(initialType,invoice({status:direction==='revoke'?'paid':'open'}),{id:'evt_first',created:200});
      state.invoices.set('in_current',invoice({status:direction==='revoke'?'open':'paid'}));
      const retrieve=state.retrieve;
      let reads=0;
      state.retrieve=async function(kind,id) {
        if(kind==='subscriptions' && ++reads===2) throw Error('provider-transaction-unavailable');
        return retrieve.call(this,kind,id);
      };
      const type=direction==='revoke'?'invoice.payment_failed':'invoice.paid';
      const bill=invoice({status:direction==='revoke'?'open':'paid'});
      assert.equal((await send(type,bill,{id:'evt_retryable',created:200})).status,500);
      assert.equal(state.entitlements.get(userId).subscriptionStatus,'past_due');
      assert.equal(state.entitlements.get(userId).stripeLastEventId,'evt_first');
      state.retrieve=retrieve;
      assert.equal((await send(type,bill,{id:'evt_retryable',created:200})).status,200);
      assert.equal(state.entitlements.get(userId).subscriptionStatus,direction==='revoke'?'past_due':'active');
    });
  }
  test(handler+' Checkout grants only its matching settled subscription',async()=>{
    current();
    assert.equal((await send('checkout.session.completed',checkout())).status,200);
    assert.equal(state.entitlements.get(userId).subscriptionStatus,'active');
    assert.equal(state.entitlements.get(userId).stripeCustomerId,'cus_fixture');
  });
  test(handler+' Checkout preserves matching subscription metadata fallback',async()=>{
    current();
    assert.equal((await send('checkout.session.completed',checkout({metadata:null}))).status,200);
    assert.equal(state.entitlements.get(userId).planId,'pro');
  });
  for (const [name,change] of [
    ['foreign customer',{customer:'cus_other'}],
    ['missing customer',{customer:null}],
    ['foreign user metadata',{metadata:{userId:'another-user',planId:'pro'}}],
    ['foreign plan metadata',{metadata:{userId,planId:'founder'}}],
  ]) test(handler+' Checkout '+name+' cannot write any entitlement',async()=>{
    current();
    assert.equal((await send('checkout.session.completed',checkout(change))).status,500);
    assert.equal(state.entitlements.size,0);
    assert.deepEqual(state.readbacks,[['subscriptions','sub_fixture']]);
  });
  test(handler+' Checkout cannot accept a different subscription from provider readback',async()=>{
    state.subscriptions.set('sub_fixture',subscription({id:'sub_other'}));
    assert.equal((await send('checkout.session.completed',checkout())).status,500);
    assert.equal(state.entitlements.size,0);
  });
}
test('Firebase rewritten webhook resolves paid invoices through the real Functions handler',async()=>{
  const {bill}=current();
  const result=await deliverFunction('invoice.paid',bill);
  assert.equal(result.status,200);assert.equal(result.body.applied,true);
  assert.equal(state.entitlements.get(userId).subscriptionStatus,'active');
});
test('Firebase rewritten webhook processes failure and provider-read recovery',async()=>{
  const {bill}=current(subscription(),invoice({status:'open'}));
  assert.equal((await deliverFunction('invoice.payment_failed',bill)).status,200);
  assert.equal(state.entitlements.get(userId).subscriptionStatus,'past_due');
  state.invoices.set('in_current',invoice());
  await deliverFunction('invoice.paid',invoice(),{id:'evt_recovered',created:200});
  assert.equal(state.entitlements.get(userId).subscriptionStatus,'active');
});
test('Firebase subscription creation remains incomplete until the latest invoice is settled',async()=>{
  const {sub}=current(subscription(),invoice({status:'open'}));
  await deliverFunction('customer.subscription.created',sub);
  assert.equal(state.entitlements.get(userId).subscriptionStatus,'incomplete');
});
test('Firebase invoice lookup failure stays retryable without entitlement effects',async()=>{
  const {bill}=current();state.invoices.set('in_current',new Error('provider-unavailable'));
  assert.equal((await deliverFunction('invoice.paid',bill)).status,500);
  assert.equal(state.entitlements.size,0);
});
test('Firebase customer mismatch stays retryable without entitlement effects',async()=>{
  current();
  assert.equal((await deliverFunction('invoice.paid',invoice({customer:'cus_other'}))).status,500);
  assert.equal(state.entitlements.size,0);
});
test('Firebase canceled state wins at the same second regardless of lexical event ID order',async()=>{
  current();
  await deliverFunction('customer.subscription.deleted',subscription({status:'canceled'}),{id:'evt_a_canceled',created:200});
  const result=await deliverFunction('invoice.paid',invoice(),{id:'evt_z_paid',created:200});
  assert.equal(result.body.reason,'equal-time-precedence');
  assert.equal(state.entitlements.get(userId).subscriptionStatus,'canceled');
});
test('Firebase existing unpaid grace mapping remains past_due',async()=>{
  await deliverFunction('customer.subscription.updated',subscription({status:'unpaid'}));
  assert.equal(state.entitlements.get(userId).subscriptionStatus,'past_due');
});
test('Firebase actual entitlement function rejects revoked authentication before reading storage',async()=>{
  const {result,response}=functionsResponse();
  await getStripeEntitlement({method:'GET',header:()=>'Bearer revoked-fixture'},response);
  assert.equal(result.status,401); assert.deepEqual(state.authChecks,[true]);assert.equal(state.reads,0);
  assert.equal(result.headers.get('cache-control'),'private, no-store, max-age=0');
});
test('Firebase wrong-mode webhook cannot call providers or write entitlement',async()=>{
  const result=await deliverFunction('invoice.paid',invoice(),{livemode:true});
  assert.equal(result.status,400);assert.equal(state.readbacks.length,0);assert.equal(state.entitlements.size,0);
});

for (const transport of ['Next', 'Firebase']) test(transport + ' verified latest-invoice failure revokes a grant at the same event second', async () => {
  current();
  const send = transport === 'Next' ? deliver : deliverFunction;
  await send('invoice.paid', invoice(), { id: 'evt_a_paid', created: 200 });
  assert.equal(state.entitlements.get(userId).subscriptionStatus, 'active');
  const latest = invoice({ id: 'in_new_period', status: 'open' });
  current(subscription({ latest_invoice: latest.id }), latest);
  const result = await send('invoice.payment_failed', latest, { id: 'evt_z_failed', created: 200 });
  assert.equal(result.status, 200);
  assert.equal(state.entitlements.get(userId).subscriptionStatus, 'past_due');
});

for (const transport of ['Next', 'Firebase']) for (const status of ['past_due', 'incomplete', 'none'])
test(transport + ' equal-second ' + status + ' denies access and suppresses a competing grant', async () => {
  current();
  const send = transport === 'Next' ? deliver : deliverFunction;
  await send('invoice.paid', invoice(), { id: 'evt_a_paid', created: 200 });
  state.subscriptions.set('sub_fixture', subscription({ status }));
  await send('customer.subscription.updated', subscription({ status }), { id: 'evt_z_denied', created: 200 });
  assert.equal(state.entitlements.get(userId).subscriptionStatus, status);
  await send('invoice.paid', invoice(), { id: 'evt_zz_competing_paid', created: 200 });
  assert.equal(state.entitlements.get(userId).subscriptionStatus, status);
  state.subscriptions.set('sub_fixture', subscription());
  await send('invoice.paid', invoice(), { id: 'evt_later_paid', created: 201 });
  assert.equal(state.entitlements.get(userId).subscriptionStatus, 'active');
});


