import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const voiceRoute = fs.readFileSync(new URL("../src/app/api/voice/elevenlabs/route.ts", import.meta.url), "utf8");
const checkoutRoute = fs.readFileSync(new URL("../src/app/api/stripe/create-checkout-session/route.ts", import.meta.url), "utf8");
const firebaseUser = fs.readFileSync(new URL("../src/lib/server/firebase-user.ts", import.meta.url), "utf8");
const approvedReturnUrl = fs.readFileSync(new URL("../src/lib/server/approved-return-url.ts", import.meta.url), "utf8");

test("voice proxy requires identity, consent, bounded input, throttling, and private caching", () => {
  assert.match(voiceRoute, /verifyFirebaseUser/);
  assert.match(voiceRoute, /status: 401/);
  assert.match(voiceRoute, /MAX_BODY_BYTES/);
  assert.match(voiceRoute, /MAX_TEXT_CHARS/);
  assert.match(voiceRoute, /externalProcessingConsent === true/);
  assert.match(voiceRoute, /status: 429/);
  assert.match(voiceRoute, /AbortSignal\.timeout/);
  assert.match(voiceRoute, /private, no-store, max-age=0/);
  assert.doesNotMatch(voiceRoute, /public, max-age=31536000, immutable/);
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
