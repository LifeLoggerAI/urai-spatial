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
const environmentKeys = ['URAI_STRIPE_MODE', 'URAI_STRIPE_COMMERCE_ENABLED', 'STRIPE_SECRET_KEY',
  'NEXT_PUBLIC_APP_URL', 'NEXT_PUBLIC_STRIPE_PRICE_PRO', 'GOOGLE_APPLICATION_CREDENTIALS',
  'URAI_FIREBASE_STATIC_EXPORT', 'FIREBASE_SERVICE_ACCOUNT_JSON', 'FIREBASE_PRIVATE_KEY',
  'FIREBASE_CLIENT_EMAIL', 'FIREBASE_TOKEN'];
const priorEnvironment = new Map(environmentKeys.map(key => [key, process.env[key]]));
const uid = 'owned-session-fixture';
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
        this.customers = { retrieve: async id => { s.customerReads.push(id); await s.onCustomerRead?.(); return { id, livemode: false }; } };
        this.checkout = { sessions: { create: async value => { s.checkoutWrites.push(value); await s.onCheckoutCreate?.(); return { id: 'cs_source', url: 'https://checkout.stripe.com/source-fixture' }; } } };
        this.billingPortal = { sessions: { create: async value => { s.portalWrites.push(value); await s.onPortalCreate?.(); return { id: 'bps_source', url: 'https://billing.stripe.com/source-fixture' }; } } };
      } }`;
    } else if (kind === 'firebase-admin/app') {
      source = 'export const getApps = () => [{}]; export const initializeApp = () => ({}); export const applicationDefault = () => ({});';
    } else if (kind === 'firebase-admin/auth') {
      source = `export const getAuth = () => ({ verifyIdToken: (...args) => globalThis.__uraiStripeAuthorityFixture.verify(...args) });`;
    } else if (kind === 'firebase-admin/firestore') {
      source = 'export const getFirestore = () => globalThis.__uraiStripeAuthorityFixture.db;';
    } else if (kind === 'firebase-functions/v1') {
      source = 'export const https = { onRequest: handler => handler }; export const config = () => ({});';
    } else if (kind === 'firebase-admin') {
      source = `export const apps = [{}]; export const initializeApp = () => ({});
        export const auth = () => ({ verifyIdToken: (...args) => globalThis.__uraiStripeAuthorityFixture.verify(...args) });
        export const firestore = () => globalThis.__uraiStripeAuthorityFixture.db;`;
    } else throw Error('Unexpected fixture boundary: ' + kind);
    return { format: 'module', source, shortCircuit: true };
  },
});

beforeEach(() => {
  state = {
    currentUid: uid, authChecks: [], reads: [], customerReads: [], checkoutWrites: [], portalWrites: [],
    async verify(token, checkRevoked) {
      this.authChecks.push(checkRevoked);
      assert.equal(token, 'owned-fixture-token');
      assert.equal(checkRevoked, true);
      if (!this.currentUid) throw Error('Source fixture token revoked');
      return { uid: this.currentUid };
    },
  };
  state.db = { collection(collection) { return { doc(id) { return { async get() {
    state.reads.push([collection, id]);
    await state.onEntitlementRead?.();
    return { exists: true, data: () => ({ userId: uid, planId: 'pro', stripeCustomerId: 'cus_owned_source',
      stripeSubscriptionId: 'sub_owned_source', subscriptionStatus: 'active', updatedAt: 0 }) };
  } }; } }; } };
  globalThis.__uraiStripeAuthorityFixture = state;
  Object.assign(process.env, { URAI_STRIPE_MODE: 'test', URAI_STRIPE_COMMERCE_ENABLED: 'true',
    STRIPE_SECRET_KEY: 'sk_test_source_fixture', NEXT_PUBLIC_APP_URL: 'https://urai.app',
    NEXT_PUBLIC_STRIPE_PRICE_PRO: 'price_source_fixture', GOOGLE_APPLICATION_CREDENTIALS: adcPath });
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
const { getStripeEntitlement, createStripeCheckout, createStripeCustomerPortal } = await import('../../apps/functions/src/stripeEntitlements.ts');

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
