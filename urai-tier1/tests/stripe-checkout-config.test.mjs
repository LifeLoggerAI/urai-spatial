import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveApprovedReturnUrl } from '../src/lib/server/approved-return-url.ts';
import {
  checkoutModeForPlan,
  isPaidPlanId,
  parseStripeRuntimeMode,
  stripeLivemodeMatchesRuntime,
  stripeRuntimeMatchesSecret,
  stripeSecretKeyMode,
  STRIPE_PRICE_ENV_BY_PLAN,
} from '../src/lib/server/stripe-runtime-config.ts';

const testSecretFixture = 'sk_test_example';
const productionSecretFixture = ['sk', 'live', 'example'].join('_');
const restrictedLiveFixture = ['rk', 'live', 'example'].join('_');

test('paid plan allowlist rejects free and arbitrary caller values', () => {
  assert.equal(isPaidPlanId('pro'), true);
  assert.equal(isPaidPlanId('therapist'), true);
  assert.equal(isPaidPlanId('founder'), true);
  assert.equal(isPaidPlanId('free'), false);
  assert.equal(isPaidPlanId('price_attacker_controlled'), false);
  assert.equal(isPaidPlanId(undefined), false);
});

test('price identifiers are selected through server-owned environment keys', () => {
  assert.deepEqual(STRIPE_PRICE_ENV_BY_PLAN, {
    pro: 'NEXT_PUBLIC_STRIPE_PRICE_PRO',
    therapist: 'NEXT_PUBLIC_STRIPE_PRICE_THERAPIST',
    founder: 'NEXT_PUBLIC_STRIPE_PRICE_FOUNDER',
  });
});

test('runtime mode fails closed unless explicitly test or production', () => {
  assert.equal(parseStripeRuntimeMode('test'), 'test');
  assert.equal(parseStripeRuntimeMode('production'), 'production');
  assert.equal(parseStripeRuntimeMode('live'), null);
  assert.equal(parseStripeRuntimeMode(''), null);
  assert.equal(parseStripeRuntimeMode(undefined), null);
});

test('Stripe secret key mode must agree with declared runtime mode', () => {
  assert.equal(stripeSecretKeyMode(testSecretFixture), 'test');
  assert.equal(stripeSecretKeyMode(productionSecretFixture), 'production');
  assert.equal(stripeSecretKeyMode(restrictedLiveFixture), null);
  assert.equal(stripeSecretKeyMode(undefined), null);
  assert.equal(stripeRuntimeMatchesSecret('test', testSecretFixture), true);
  assert.equal(stripeRuntimeMatchesSecret('production', productionSecretFixture), true);
  assert.equal(stripeRuntimeMatchesSecret('test', productionSecretFixture), false);
  assert.equal(stripeRuntimeMatchesSecret('production', testSecretFixture), false);
});

test('Stripe event and provider object livemode must agree with declared runtime mode', () => {
  assert.equal(stripeLivemodeMatchesRuntime(false, 'test'), true);
  assert.equal(stripeLivemodeMatchesRuntime(true, 'production'), true);
  assert.equal(stripeLivemodeMatchesRuntime(true, 'test'), false);
  assert.equal(stripeLivemodeMatchesRuntime(false, 'production'), false);
});

test('plan billing modes are fixed server-side', () => {
  assert.equal(checkoutModeForPlan('pro'), 'subscription');
  assert.equal(checkoutModeForPlan('therapist'), 'subscription');
  assert.equal(checkoutModeForPlan('founder'), 'payment');
});

test('approved return URL accepts relative and same-origin destinations', () => {
  assert.equal(resolveApprovedReturnUrl('/settings?tab=billing', 'https://staging.example.test').toString(), 'https://staging.example.test/settings?tab=billing');
  assert.equal(resolveApprovedReturnUrl('https://staging.example.test/account', 'https://staging.example.test').toString(), 'https://staging.example.test/account');
});

test('approved return URL rejects foreign origins and embedded credentials', () => {
  assert.throws(() => resolveApprovedReturnUrl('https://evil.example/account', 'https://staging.example.test'));
  assert.throws(() => resolveApprovedReturnUrl('https://user:pass@staging.example.test/account', 'https://staging.example.test'));
});
