import assert from 'node:assert/strict';
import test, { beforeEach, after } from 'node:test';
import { registerHooks } from 'node:module';
import { mkdtempSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Actual route/Functions source, with disclosed Auth/Firestore/Stripe boundaries.
// No account token, provider request, payment or deployed acceptance is represented.
const fixtureDirectory = mkdtempSync(join(tmpdir(), 'urai-stripe-session-authority-'));
const adcPath = join(fixtureDirectory, 'external-account.json');
writeFileSync(adcPath, JSON.stringify({
  type: 'external_account', audience: '//iam.googleapis.com/projects/source-test/pools/test/providers/test',
  subject_token_type: 'urn:ietf:params:oauth:token-type:jwt', token_url: 'https://sts.googleapis.com/v1/token',
  credential_source: { file: join(fixtureDirectory, 'fixture.jwt') },
}));
const environmentKeys = ['URAI_STRIPE_MODE', 'URAI_STRIPE_COMMERCE_ENABLED', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET',
  'NEXT_PUBLIC_APP_URL', 'NEXT_PUBLIC_STRIPE_PRICE_PRO', 'STRIPE_BILLING_PORTAL_CONFIGURATION', 'GOOGLE_APPLICATION_CREDENTIALS',
  'URAI_FIREBASE_STATIC_EXPORT', 'FIREBASE_SERVICE_ACCOUNT_JSON', 'FIREBASE_PRIVATE_KEY',
  'FIREBASE_CLIENT_EMAIL', 'FIREBASE_TOKEN'];
const priorEnvironment = new Map(environmentKeys.map(key => [key, process.env[key]]));
const uid = 'owned-session-fixture';
const incarnationId = 'inc_session_current_001';
const billingPath = 'users/'+uid+'/billingRuntime/stripeAuthority';
const makeBinding = () => ({schemaVersion:1,uid,creationTime:1000,incarnationId,mode:'test',stripeCustomerId:'cus_owned_source',issuedPlans:['pro','founder','therapist']});
let state;
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (['next/server', 'stripe', 'firebase-admin/auth', 'firebase-admin/app', 'firebase-admin/firestore',
      'firebase-functions/v1', 'firebase-admin'].includes(specifier)) {
      return { url: 'urai-stripe-authority-fixture:' + specifier, shortCircuit: true };
    }
    if (specifier.startsWith('@/')) {
      return { url: new URL('../src/' + specifier.slice(2) + '.ts', import.meta.url).href, shortCircuit: true };
    }
    if (specifier.startsWith('.') && context.parentURL?.startsWith('file:') && !/\.[a-z]+$/i.test(specifier)) {
      const candidate = new URL(specifier + '.ts', context.parentURL);
      if (existsSync(fileURLToPath(candidate))) return { url: candidate.href, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (!url.startsWith('urai-stripe-authority-fixture:')) return nextLoad(url, context);
    const kind = url.slice('urai-stripe-authority-fixture:'.length);
    let source;
    if (kind === 'next/server') {
      source = 'export class NextResponse extends Response { static json(body, init) { return Response.json(body, init); } }';
    } else if (kind === 'stripe') {
      source = `export default class Stripe { constructor() {
        const s = globalThis.__uraiStripeAuthorityFixture;
        this.prices = { retrieve: async id => { s.priceReads.push(id); await s.onPriceRead?.(); if (s.priceReadError) throw Error('Price unavailable'); return { id: s.priceId ?? id, active: s.priceActive, livemode: s.priceLivemode }; } };
        this.customers = { retrieve: async id => { s.customerReads.push(id); await s.onCustomerRead?.(); return { id: s.customerId ?? id, livemode: s.customerLivemode ?? false, metadata: {userId:s.currentUid, uraiAccountIncarnation:s.providerIncarnation ?? s.accountDocs.get(s.billingPath)?.incarnationId} }; }, create: async (value,options) => { s.customerCreates.push({value,options}); await s.onCustomerCreate?.(); return {id:'cus_new_source',livemode:false,metadata:value.metadata}; } };
        this.webhooks={constructEvent:raw=>JSON.parse(raw)}; this.subscriptions={retrieve:async id=>{await s.onSubscriptionRead?.(); return s.subscriptions.get(id);}}; this.invoices={retrieve:async id=>s.invoices.get(id)};
        this.checkout = { sessions: { create: async value => { s.checkoutWrites.push(value); await s.onCheckoutCreate?.(); return { id: 'cs_source', url: 'https://checkout.stripe.com/source-fixture', customer:value.customer, livemode:false, metadata:value.metadata }; } } };
        this.billingPortal = { configurations: { retrieve: async id => { s.configurationReads.push(id); await s.onConfigurationRead?.(); if (s.configurationReadError) throw Error('Configuration unavailable'); return { id: s.configurationId ?? id, active: s.configurationActive, livemode: s.configurationLivemode }; } }, sessions: { create: async value => { s.portalWrites.push(value); await s.onPortalCreate?.(); return { id: 'bps_source', url: 'https://billing.stripe.com/source-fixture' }; } } };
      } }`;
    } else if (kind === 'firebase-admin/app') {
      source = 'export const getApps = () => [{}]; export const initializeApp = () => ({}); export const applicationDefault = () => ({});';
    } else if (kind === 'firebase-admin/auth') {
      source = `export const getAuth = () => ({ verifyIdToken: (...args) => globalThis.__uraiStripeAuthorityFixture.verify(...args),getUser:uid=>globalThis.__uraiStripeAuthorityFixture.getUser(uid) });`;
    } else if (kind === 'firebase-admin/firestore') {
      source = 'export const getFirestore = () => globalThis.__uraiStripeAuthorityFixture.db;';
    } else if (kind === 'firebase-functions/v1') {
      source = 'export const https = { onRequest: handler => handler }; export const config = () => ({});';
    } else if (kind === 'firebase-admin') {
      source = `export const apps = [{}]; export const initializeApp = () => ({});
        export const auth = () => ({ verifyIdToken: (...args) => globalThis.__uraiStripeAuthorityFixture.verify(...args),getUser:uid=>globalThis.__uraiStripeAuthorityFixture.getUser(uid) });
        export const firestore = () => globalThis.__uraiStripeAuthorityFixture.db;`;
    } else throw Error('Unexpected fixture boundary: ' + kind);
    return { format: 'module', source, shortCircuit: true };
  },
});

beforeEach(() => {
  state = {
    currentUid: uid, authChecks: [], reads: [], customerReads: [], priceReads: [], configurationReads: [], checkoutWrites: [], portalWrites: [],
    priceLivemode: false, priceActive: true, configurationLivemode: false, configurationActive: true,
    billingPath, accountDocs:new Map([['users/'+uid,{accountStatus:'active'}],[billingPath,makeBinding()]]),
    entitlements:new Map([[uid,{userId:uid,planId:'pro',stripeCustomerId:'cus_owned_source',stripeSubscriptionId:'sub_owned_source',subscriptionStatus:'active',updatedAt:0,stripeIncarnationId:incarnationId,stripeAccountCreationTime:1000,stripeBillingMode:'test'}]]),
    customerCreates:[],authCreationTime:1000,subscriptions:new Map(),invoices:new Map(),
    async getUser(id){return {uid:id,disabled:false,metadata:{creationTime:new Date(this.authCreationTime).toISOString()}};},
    async verify(token, checkRevoked) {
      this.authChecks.push(checkRevoked);
      assert.equal(token, 'owned-fixture-token');
      assert.equal(checkRevoked, true);
      if (!this.currentUid) throw Error('Source fixture token revoked');
      return { uid: this.currentUid };
    },
  };
  const reference=path=>({path,id:path.split('/').at(-1),get:async()=>{
    const financial=path.startsWith('userEntitlements/');
    if(financial){state.reads.push(['userEntitlements',path.split('/').at(-1)]);await state.onEntitlementRead?.();}
    const docs=financial?state.entitlements:state.accountDocs; const key=financial?path.split('/').at(-1):path;
    return {exists:docs.has(key),data:()=>docs.get(key)};
  }});
  state.db={doc:reference,collection:path=>({doc:id=>reference(path+'/'+id),where:(_key,_op,values)=>({limit:()=>({get:async()=>({empty:![...state.accountDocs].some(([p,d])=>p.startsWith(path+'/')&&values.includes(d.state))})})})}),
    runTransaction:async fn=>{let writing=false;return fn({get:async ref=>{assert.equal(writing,false,'transaction reads precede writes');return ref.get();},set:(ref,value)=>{writing=true;const financial=ref.path.startsWith('userEntitlements/');const docs=financial?state.entitlements:state.accountDocs;const key=financial?ref.id:ref.path;docs.set(key,{...docs.get(key),...value});}});}};
  globalThis.__uraiStripeAuthorityFixture = state;
  Object.assign(process.env, { URAI_STRIPE_MODE: 'test', URAI_STRIPE_COMMERCE_ENABLED: 'true',
    STRIPE_SECRET_KEY: 'sk_test_source_fixture', STRIPE_WEBHOOK_SECRET: 'whsec_source_fixture', NEXT_PUBLIC_APP_URL: 'https://urai.app',
    NEXT_PUBLIC_STRIPE_PRICE_PRO: 'price_source_fixture', STRIPE_BILLING_PORTAL_CONFIGURATION: 'bpc_source_fixture', GOOGLE_APPLICATION_CREDENTIALS: adcPath });
  for (const key of ['URAI_FIREBASE_STATIC_EXPORT', 'FIREBASE_SERVICE_ACCOUNT_JSON', 'FIREBASE_PRIVATE_KEY',
    'FIREBASE_CLIENT_EMAIL', 'FIREBASE_TOKEN']) delete process.env[key];
});
after(() => {
  hooks.deregister(); delete globalThis.__uraiStripeAuthorityFixture;
  for (const [key, value] of priorEnvironment) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
  rmSync(fixtureDirectory, { recursive: true, force: true });
});

const { GET: nextEntitlement } = await import('../src/app/api/entitlement/route.ts');
const { POST: nextCheckout } = await import('../src/app/api/stripe/create-checkout-session/route.ts');
const { POST: nextPortal } = await import('../src/app/api/stripe/create-portal-session/route.ts');
const { POST: nextWebhook } = await import('../src/app/api/stripe/webhook/route.ts');
const { getStripeEntitlement, createStripeCheckout, createStripeCustomerPortal, handleStripeWebhook } = await import('../../apps/functions/src/stripeEntitlements.ts');

const implementations = [
  { name: 'Next', async run(action, beforeBody) {
    const request = new Request('https://urai.app/api/' + action, { method: action === 'entitlement' ? 'GET' : 'POST',
      headers: { authorization: 'Bearer owned-fixture-token', 'content-type': 'application/json' },
      ...(action === 'entitlement' ? {} : { body: JSON.stringify({ planId: 'pro', returnUrl: '/passport' }) }) });
    if (beforeBody) request.json = async () => { await beforeBody(); return { planId: 'pro', returnUrl: '/passport' }; };
    const response = await ({ entitlement: nextEntitlement, checkout: nextCheckout, portal: nextPortal })[action](request);
    return { status: response.status, body: await response.json(), cacheControl: response.headers.get('cache-control') };
  } },
  { name: 'Firebase', async run(action) {
    const result = { status: 200, body: undefined, cacheControl: undefined };
    const req = { method: action === 'entitlement' ? 'GET' : 'POST', body: { planId: 'pro', returnUrl: '/passport' },
      header: name => name.toLowerCase() === 'authorization' ? 'Bearer owned-fixture-token' : undefined };
    const res = { set(name, value) { if (name.toLowerCase() === 'cache-control') result.cacheControl = value; return this; },
      status(value) { result.status = value; return this; }, json(value) { result.body = value; return this; } };
    await ({ entitlement: getStripeEntitlement, checkout: createStripeCheckout, portal: createStripeCustomerPortal })[action](req, res);
    return result;
  } },
];
for (const implementation of implementations) {
  for (const action of ['entitlement', 'checkout', 'portal']) {
    test(implementation.name + ' retains a current owner through ' + action, async () => {
      const result = await implementation.run(action);
      assert.equal(result.status, 200);
      assert.ok(action === 'entitlement' ? result.body.entitlement : result.body.url);
      assert.match(result.cacheControl, /private, no-store/);
      if (action === 'entitlement') assert.equal(result.body.entitlement.userId, uid);
    });
  }
  for (const currentUid of [null, 'foreign-session-fixture']) {
    const change = currentUid === null ? 'revocation' : 'owner change';
    for (const action of ['entitlement', 'portal', ...(implementation.name === 'Firebase' ? ['checkout'] : [])]) {
      test(implementation.name + ' denies ' + action + ' after ' + change + ' during entitlement read', async () => {
        state.onEntitlementRead = async () => { state.currentUid = currentUid; };
        const result = await implementation.run(action);
        assert.equal(result.status, 401);
        assert.equal(result.body.entitlement, undefined); assert.equal(result.body.url, undefined);
        assert.equal(state.customerReads.length, 0); assert.equal(state.checkoutWrites.length, 0); assert.equal(state.portalWrites.length, 0);
      });
    }
    test(implementation.name + ' denies portal dispatch after ' + change + ' during customer read', async () => {
      state.onCustomerRead = async () => { state.currentUid = currentUid; };
      const result = await implementation.run('portal');
      assert.equal(result.status, 401); assert.equal(result.body.url, undefined); assert.equal(state.portalWrites.length, 0);
    });
    for (const action of ['checkout', 'portal']) {
      test(implementation.name + ' suppresses ' + action + ' URL after ' + change + ' during provider create', async () => {
        state[action === 'checkout' ? 'onCheckoutCreate' : 'onPortalCreate'] = async () => { state.currentUid = currentUid; };
        const result = await implementation.run(action);
        assert.equal(result.status, 401); assert.equal(result.body.url, undefined);
        assert.equal(state[action === 'checkout' ? 'checkoutWrites' : 'portalWrites'].length, 1);
      });
    }
    if (implementation.name === 'Next') {
      for (const action of ['checkout', 'portal']) {
        test('Next denies ' + action + ' dispatch after ' + change + ' during request body read', async () => {
          const result = await implementation.run(action, async () => { state.currentUid = currentUid; });
          assert.equal(result.status, 401); assert.equal(result.body.url, undefined);
          assert.equal(state.reads.length, 0); assert.equal(state.customerReads.length, 0);
          assert.equal(state.checkoutWrites.length, 0); assert.equal(state.portalWrites.length, 0);
        });
      }
    }
  }
}

for (const implementation of implementations) {
  for (const action of ['checkout', 'portal']) {
    test(implementation.name + ' refuses ' + action + ' when commerce is disabled', async () => {
      process.env.URAI_STRIPE_COMMERCE_ENABLED = 'false';
      const result = await implementation.run(action);
      assert.equal(result.status, 503); assert.equal(result.body.url, undefined);
      assert.equal(state.checkoutWrites.length, 0); assert.equal(state.portalWrites.length, 0);
      assert.equal(state.priceReads.length, 0); assert.equal(state.configurationReads.length, 0);
    });
  }
  for (const [action, label, key, value, expectedStatus] of [
    ['checkout', 'cross-realm Price', 'priceLivemode', true, 500],
    ['checkout', 'unbound Price identity', 'priceId', 'price_foreign_fixture', 500],
    ['checkout', 'inactive Price', 'priceActive', false, 500],
    ['checkout', 'unknown Price realm', 'priceLivemode', undefined, 500],
    ['checkout', 'unavailable Price', 'priceReadError', true, 502],
    ['portal', 'cross-realm portal Configuration', 'configurationLivemode', true, 500],
    ['portal', 'unbound portal Configuration', 'configurationId', 'bpc_foreign_fixture', 500],
    ['portal', 'inactive portal Configuration', 'configurationActive', false, 500],
    ['portal', 'unknown Configuration realm', 'configurationLivemode', undefined, 500],
    ['portal', 'unavailable Configuration', 'configurationReadError', true, 502],
  ]) {
    test(implementation.name + ' refuses ' + label + ' before provider session creation', async () => {
      state[key] = value;
      const result = await implementation.run(action);
      assert.equal(result.status, expectedStatus); assert.equal(result.body.url, undefined);
      assert.equal(state.checkoutWrites.length, 0); assert.equal(state.portalWrites.length, 0);
    });
  }
  for (const currentUid of [null, 'foreign-session-fixture']) {
    for (const [action, hook] of [['checkout', 'onPriceRead'], ['portal', 'onConfigurationRead']]) {
      test(implementation.name + ' denies ' + action + ' after owner change during provider-object verification: ' + String(currentUid), async () => {
        state[hook] = async () => { state.currentUid = currentUid; };
        const result = await implementation.run(action);
        assert.equal(result.status, 401); assert.equal(result.body.url, undefined);
        assert.equal(state.checkoutWrites.length, 0); assert.equal(state.portalWrites.length, 0);
      });
    }
  }
  test(implementation.name + ' uses the exact verified Price and Configuration', async () => {
    assert.equal((await implementation.run('checkout')).status, 200);
    assert.equal((await implementation.run('portal')).status, 200);
    assert.deepEqual(state.priceReads, ['price_source_fixture']);
    assert.deepEqual(state.configurationReads, ['bpc_source_fixture']);
    assert.equal(state.checkoutWrites[0].line_items[0].price, 'price_source_fixture');
    assert.equal(state.portalWrites[0].configuration, 'bpc_source_fixture');
  });
}

async function sendBillingEvent(implementation, metadata, {customer='cus_owned_source',created=100,readback=false,livemode=false}={}) {
  const sub={id:'sub_owned_source',customer,status:'active',latest_invoice:'in_current',metadata};
  const invoice={id:'in_current',customer,status:'paid',parent:{type:'subscription_details',subscription_details:{subscription:sub.id}}};
  state.subscriptions.set(sub.id,sub);state.invoices.set(invoice.id,invoice);
  const event={id:'evt_incarnation_source',created,livemode,type:readback?'invoice.paid':'customer.subscription.created',data:{object:readback?invoice:sub}};
  if(implementation.name==='Next'){
    const response=await nextWebhook(new Request('https://urai.app/api/stripe/webhook',{method:'POST',headers:{'stripe-signature':'source-fixture'},body:JSON.stringify(event)}));
    return {status:response.status,body:await response.json()};
  }
  const result={status:200,body:null};
  await handleStripeWebhook({method:'POST',body:event,rawBody:Buffer.from(JSON.stringify(event)),header:()=> 'source-fixture'},
    {set(){return this;},status(value){result.status=value;return this;},json(body){result.body=body;return this;}});
  return result;
}
for(const implementation of implementations){
  test(implementation.name+' creates a fresh bounded TEST association and consumes its real-source callback/read/portal lifecycle',async()=>{
    state.entitlements.clear();state.accountDocs.delete(billingPath);
    assert.equal((await implementation.run('checkout')).status,200);
    assert.equal(state.customerCreates.length,1);assert.equal(state.checkoutWrites.length,1);
    const binding=state.accountDocs.get(billingPath),issued=state.accountDocs.get('users/'+uid+'/stripeCheckoutSessions/cs_source');
    assert.equal(binding.uid,uid);assert.equal(binding.creationTime,1000);assert.equal(binding.mode,'test');
    assert.equal(binding.stripeCustomerId,'cus_new_source');assert.deepEqual(binding.issuedPlans,['pro']);
    assert.equal(issued.incarnationId,binding.incarnationId);assert.equal(issued.stripeCustomerId,binding.stripeCustomerId);
    assert.match(state.customerCreates[0].options.idempotencyKey,/^urai-test-customer-/);
    const request=state.checkoutWrites[0];assert.equal(request.customer,binding.stripeCustomerId);
    assert.equal(request.metadata.uraiAccountIncarnation,binding.incarnationId);
    assert.equal(request.subscription_data.metadata.uraiAccountIncarnation,binding.incarnationId);
    const application=await sendBillingEvent(implementation,request.subscription_data.metadata,{customer:binding.stripeCustomerId});
    assert.equal(application.status,200);assert.equal(application.body.applied,true);
    const read=await implementation.run('entitlement');assert.equal(read.body.entitlement.subscriptionStatus,'active');
    assert.equal(read.body.entitlement.stripeIncarnationId,binding.incarnationId);
    assert.equal(read.body.entitlement.stripeAccountCreationTime,1000);
    assert.equal((await implementation.run('portal')).status,200);assert.equal(state.portalWrites[0].customer,binding.stripeCustomerId);
    assert.equal((await implementation.run('checkout')).status,200);assert.equal(state.customerCreates.length,1,'current customer is verified and reused, never duplicated');
  });
  for(const action of ['entitlement','checkout','portal'])test(implementation.name+' denies retained legacy access/customer reuse through '+action,async()=>{
    state.accountDocs.delete(billingPath);const financial=structuredClone(state.entitlements.get(uid));
    const result=await implementation.run(action);
    if(action==='entitlement'){assert.equal(result.status,200);assert.equal(result.body.entitlement.planId,'free');assert.equal(result.body.entitlement.stripeCustomerId,null);}
    else assert.equal(result.status,409);
    assert.deepEqual(state.entitlements.get(uid),financial);assert.equal(state.customerReads.length,0);
    assert.equal(state.customerCreates.length,0);assert.equal(state.checkoutWrites.length,0);assert.equal(state.portalWrites.length,0);
    assert.equal(state.accountDocs.has(billingPath),false);
  });
  for(const action of ['entitlement','checkout','portal'])test(implementation.name+' fails closed after same-UID recreation within the same second through '+action,async()=>{
    state.authCreationTime=1200;const financial=structuredClone(state.entitlements.get(uid));
    const result=await implementation.run(action);
    if(action==='entitlement'){assert.equal(result.status,200);assert.equal(result.body.entitlement.planId,'free');assert.equal(result.body.entitlement.stripeCustomerId,null);}
    else assert.equal(result.status,409);
    assert.deepEqual(state.entitlements.get(uid),financial);assert.equal(state.customerCreates.length,0);
    assert.equal(state.checkoutWrites.length,0);assert.equal(state.portalWrites.length,0);
  });
  test(implementation.name+' rejects a delayed old subscription on the actual webhook after recreation',async()=>{
    const old={userId:uid,planId:'pro',uraiAccountIncarnation:incarnationId};
    state.authCreationTime=2000;state.accountDocs.set(billingPath,{...makeBinding(),creationTime:2000,incarnationId:'inc_recreated_current_002'});
    const retained=structuredClone(state.entitlements.get(uid));
    const result=await sendBillingEvent(implementation,old,{created:100});
    assert.equal(result.body.applied,false);assert.deepEqual(state.entitlements.get(uid),retained);
    assert.equal((await implementation.run('entitlement')).body.entitlement.planId,'free');
  });
  test(implementation.name+' denies a missing provider incarnation without reconstructing it from retained customer lookup',async()=>{
    const before=structuredClone(state.entitlements.get(uid));
    assert.equal((await sendBillingEvent(implementation,{userId:uid,planId:'pro'})).body.applied,false);
    assert.deepEqual(state.entitlements.get(uid),before);
  });
  test(implementation.name+' denies recreation during awaited provider subscription resolution',async()=>{
    const before=structuredClone(state.entitlements.get(uid));state.onSubscriptionRead=async()=>{state.authCreationTime=1200;};
    assert.equal((await sendBillingEvent(implementation,{userId:uid,planId:'pro',uraiAccountIncarnation:incarnationId},{readback:true})).body.applied,false);
    assert.deepEqual(state.entitlements.get(uid),before);
  });
  for(const [action,hook] of [['checkout','onCustomerRead'],['portal','onConfigurationRead']])test(implementation.name+' denies '+action+' dispatch after current binding withdrawal during provider verification',async()=>{
    state[hook]=async()=>state.accountDocs.delete(billingPath);
    assert.equal((await implementation.run(action)).status,409);assert.equal(state.checkoutWrites.length,0);assert.equal(state.portalWrites.length,0);
  });
  for(const action of ['checkout','portal'])test(implementation.name+' suppresses '+action+' URL and acceptance after same-UID recreation during provider creation',async()=>{
    state[action==='checkout'?'onCheckoutCreate':'onPortalCreate']=async()=>{state.authCreationTime=1200;};
    const result=await implementation.run(action);assert.equal(result.status,409);assert.equal(result.body.url,undefined);
    assert.equal(state.accountDocs.has('users/'+uid+'/stripeCheckoutSessions/cs_source'),false);
  });
  test(implementation.name+' checks provider customer identity and incarnation before portal dispatch',async()=>{
    state.providerIncarnation='inc_previous_provider_002';
    assert.equal((await implementation.run('portal')).status,500);assert.equal(state.portalWrites.length,0);
  });
  test(implementation.name+' refuses LIVE checkout before any provider read or create',async()=>{
    process.env.URAI_STRIPE_MODE='production';process.env.STRIPE_SECRET_KEY=['sk','live','source_fixture'].join('_');
    assert.equal((await implementation.run('checkout')).status,503);
    assert.equal(state.priceReads.length,0);assert.equal(state.customerReads.length,0);assert.equal(state.customerCreates.length,0);assert.equal(state.checkoutWrites.length,0);
  });
  test(implementation.name+' refuses correctly declared LIVE callbacks before provider resolution or financial writes',async()=>{
    process.env.URAI_STRIPE_MODE='production';process.env.STRIPE_SECRET_KEY=['sk','live','source_fixture'].join('_');
    let reads=0;state.onSubscriptionRead=async()=>{reads++;};const before=structuredClone(state.entitlements.get(uid));
    const result=await sendBillingEvent(implementation,{userId:uid,planId:'pro',uraiAccountIncarnation:incarnationId},{readback:true,livemode:true});
    assert.equal(result.status,503);assert.equal(reads,0);assert.deepEqual(state.entitlements.get(uid),before);
  });
}
