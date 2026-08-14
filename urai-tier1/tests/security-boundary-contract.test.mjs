import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const providerFunctions = fs.readFileSync(new URL("../../apps/functions/src/providerFunctions.ts", import.meta.url), "utf8");
const staticProviderRoutes = [
  new URL("../src/app/api/voice/elevenlabs/route.ts", import.meta.url),
  new URL("../src/app/api/urai/narrator/elevenlabs/route.ts", import.meta.url),
  new URL("../src/app/api/urai/orb/openai/route.ts", import.meta.url),
];
const narratorClient = fs.readFileSync(new URL("../src/spatial/narrator/elevenlabsClient.ts", import.meta.url), "utf8");
const narratorPlayback = fs.readFileSync(new URL("../src/spatial/narrator/narratorPlayback.ts", import.meta.url), "utf8");
const checkoutRoute = fs.readFileSync(new URL("../src/app/api/stripe/create-checkout-session/route.ts", import.meta.url), "utf8");
const firebaseUser = fs.readFileSync(new URL("../src/lib/server/firebase-user.ts", import.meta.url), "utf8");
const approvedReturnUrl = fs.readFileSync(new URL("../src/lib/server/approved-return-url.ts", import.meta.url), "utf8");

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
