import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const voiceRoute = fs.readFileSync(new URL("../src/app/api/voice/elevenlabs/route.ts", import.meta.url), "utf8");
const narratorRoute = fs.readFileSync(new URL("../src/app/api/urai/narrator/elevenlabs/route.ts", import.meta.url), "utf8");
const narratorClient = fs.readFileSync(new URL("../src/spatial/narrator/elevenlabsClient.ts", import.meta.url), "utf8");
const checkoutRoute = fs.readFileSync(new URL("../src/app/api/stripe/create-checkout-session/route.ts", import.meta.url), "utf8");
const firebaseUser = fs.readFileSync(new URL("../src/lib/server/firebase-user.ts", import.meta.url), "utf8");
const approvedReturnUrl = fs.readFileSync(new URL("../src/lib/server/approved-return-url.ts", import.meta.url), "utf8");

for (const [name, route] of [["voice", voiceRoute], ["narrator", narratorRoute]]) {
  test(`${name} proxy requires identity, consent, bounded input, throttling, timeout, and private caching`, () => {
    assert.match(route, /verifyFirebaseUser/);
    assert.match(route, /status: 401/);
    assert.match(route, /MAX_BODY_BYTES/);
    assert.match(route, /MAX_TEXT_CHARS/);
    assert.match(route, /externalProcessingConsent/);
    assert.match(route, /status: 429/);
    assert.match(route, /AbortSignal\.timeout/);
    assert.match(route, /private, no-store, max-age=0/);
    assert.match(route, /encodeURIComponent\(voiceId\)/);
    assert.doesNotMatch(route, /public, max-age=31536000, immutable/);
    assert.doesNotMatch(route, /private, max-age=31536000, immutable/);
  });
}

test("active narrator client fails closed without consent and avoids persistent browser audio caching", () => {
  assert.match(narratorClient, /externalProcessingConsent = false/);
  assert.match(narratorClient, /if \(!externalProcessingConsent \|\| !firebasePublicEnvReady\) return null/);
  assert.match(narratorClient, /getAuth\(app\)\.currentUser/);
  assert.match(narratorClient, /getIdToken\(\)/);
  assert.match(narratorClient, /Authorization/);
  assert.match(narratorClient, /externalProcessingConsent: true/);
  assert.doesNotMatch(narratorClient, /caches\.open/);
  assert.doesNotMatch(narratorClient, /cache\.put/);
});

test("Firebase bearer verification checks revoked tokens", () => {
  assert.match(firebaseUser, /verifyIdToken\(token, true\)/);
  assert.match(firebaseUser, /FIREBASE_SERVICE_ACCOUNT_JSON/);
});

test("Stripe checkout permits only the configured application origin", () => {
  assert.match(checkoutRoute, /resolveApprovedReturnUrl/);
  assert.match(checkoutRoute, /Invalid return URL/);
  assert.match(checkoutRoute, /withStripeResult/);
  assert.match(approvedReturnUrl, /resolved\.origin !== approvedOrigin\.origin/);
  assert.match(approvedReturnUrl, /resolved\.username \|\| resolved\.password/);
  assert.doesNotMatch(checkoutRoute, /const redirectBase = returnUrl \|\| appUrl/);
});
