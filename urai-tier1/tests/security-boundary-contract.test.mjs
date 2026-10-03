import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const providerFunctions = fs.readFileSync(new URL("../../apps/functions/src/providerFunctions.ts", import.meta.url), "utf8");
const adamFunctions = fs.readFileSync(new URL("../../apps/functions/src/adamPresenceFunctions.ts", import.meta.url), "utf8");
const staticProviderRoutes = [
  new URL("../src/app/api/voice/elevenlabs/route.ts", import.meta.url),
  new URL("../src/app/api/urai/narrator/elevenlabs/route.ts", import.meta.url),
  new URL("../src/app/api/urai/orb/openai/route.ts", import.meta.url),
  new URL("../src/app/api/urai/adam/conversation/route.ts", import.meta.url),
  new URL("../src/app/api/urai/adam/voice/route.ts", import.meta.url),
];
const narratorClient = fs.readFileSync(new URL("../src/spatial/narrator/elevenlabsClient.ts", import.meta.url), "utf8");
const narratorPlayback = fs.readFileSync(new URL("../src/spatial/narrator/narratorPlayback.ts", import.meta.url), "utf8");
const checkoutRoute = fs.readFileSync(new URL("../src/app/api/stripe/create-checkout-session/route.ts", import.meta.url), "utf8");
const firebaseUser = fs.readFileSync(new URL("../src/lib/server/firebase-user.ts", import.meta.url), "utf8");
const approvedReturnUrl = fs.readFileSync(new URL("../src/lib/server/approved-return-url.ts", import.meta.url), "utf8");
const stripeFunctions = fs.readFileSync(new URL("../../apps/functions/src/stripeEntitlements.ts", import.meta.url), "utf8");
const staticHosting = JSON.parse(fs.readFileSync(new URL("../../firebase.static.json", import.meta.url), "utf8")).hosting;

test("static provider paths cannot shadow authenticated Firebase rewrites", () => {
  for (const route of staticProviderRoutes) assert.equal(fs.existsSync(route), false);
});

test("Firebase provider functions require revoked-token checks, saved consent, durable throttling and private responses", () => {
  assert.match(providerFunctions, /verifyIdToken\([^,]+, true\)/);
  assert.match(providerFunctions, /privacyPolicy\/current/);
  assert.match(providerFunctions, /fully-enforced/);
  assert.match(providerFunctions, /providerRateLimits/);
  assert.match(providerFunctions, /defineSecret\('OPENAI_API_KEY'\)/);
  assert.match(providerFunctions, /defineSecret\('ELEVENLABS_API_KEY'\)/);
  assert.match(providerFunctions, /private, no-store, max-age=0/);
  assert.doesNotMatch(providerFunctions, /NEXT_PUBLIC_(OPENAI|ELEVENLABS)/);
  assert.match(adamFunctions, /verifyIdToken\([^,]+, true\)/);
  assert.match(adamFunctions, /privacyPolicy\/current/);
  assert.match(adamFunctions, /providerRateLimits/);
  assert.match(adamFunctions, /ADAM_PRESENCE_ENABLED/);
  assert.match(adamFunctions, /FOUNDER_VOICE_ENABLED/);
  assert.match(adamFunctions, /FOUNDER_ELEVENLABS_VOICE_ID/);
  assert.doesNotMatch(adamFunctions, /NEXT_PUBLIC_(OPENAI|ELEVENLABS)/);
});

test("active narrator client and controller fail closed until session consent", () => {
  assert.match(narratorClient, /externalProcessingConsent = false/);
  assert.match(narratorClient, /signal\?\.aborted/);
  assert.match(narratorClient, /getAuth\(app\)\.currentUser/);
  assert.match(narratorClient, /getIdToken\(\)/);
  assert.match(narratorClient, /Authorization/);
  assert.match(narratorPlayback, /private externalVoiceConsent = false/);
  assert.match(narratorPlayback, /setExternalVoiceConsent/);
  assert.doesNotMatch(narratorClient, /caches\.open/);
  assert.doesNotMatch(narratorClient, /cache\.put/);
});

test("Firebase bearer verification checks revoked tokens through external-account ADC", () => {
  assert.match(firebaseUser, /verifyIdToken\(token, true\)/);
  assert.match(firebaseUser, /assertExternalAccountAdc\(\)/);
  assert.match(firebaseUser, /applicationDefault\(\)/);
  assert.doesNotMatch(firebaseUser, /SERVICE_ACCOUNT_JSON/);
});

test("Stripe checkout permits only the configured application origin", () => {
  assert.match(checkoutRoute, /resolveApprovedReturnUrl/);
  assert.match(checkoutRoute, /Invalid return URL/);
  assert.match(checkoutRoute, /withStripeResult/);
  assert.match(approvedReturnUrl, /resolved\.origin !== approvedOrigin\.origin/);
  assert.match(approvedReturnUrl, /resolved\.username \|\| resolved\.password/);
  assert.doesNotMatch(checkoutRoute, /const redirectBase = returnUrl \|\| appUrl/);
});


test("static production topology exposes authenticated Stripe lifecycle only through governed Firebase functions", () => {
  assert.match(stripeFunctions, /verifyIdToken\(token, true\)/);
  assert.match(stripeFunctions, /URAI_STRIPE_COMMERCE_ENABLED === 'true'/);
  assert.match(stripeFunctions, /ENTITLEMENT_COLLECTION = 'userEntitlements'/);
  assert.match(stripeFunctions, /event\.livemode !== \(mode === 'production'\)/);
  assert.match(stripeFunctions, /applyOrderedEntitlement/);
  assert.match(stripeFunctions, /billingPortal\.sessions\.create/);
  assert.match(stripeFunctions, /checkout\.sessions\.create/);
  assert.match(stripeFunctions, /Cache-Control.*private, no-store, max-age=0/);
  const rewrites = new Map(staticHosting.rewrites.map((entry) => [entry.source, entry.function?.functionId]));
  assert.equal(rewrites.get('/api/stripe/create-checkout-session'), 'createStripeCheckout');
  assert.equal(rewrites.get('/api/stripe/customer-portal'), 'createStripeCustomerPortal');
  assert.equal(rewrites.get('/api/entitlement'), 'getStripeEntitlement');
  assert.equal(rewrites.get('/api/stripe/webhook'), 'handleStripeWebhook');
  assert.equal([...rewrites.keys()].some((source) => source === '**' || source === '/**'), false);
});
