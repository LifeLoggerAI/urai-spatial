import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const voiceRoute = fs.readFileSync(new URL("../src/app/api/voice/elevenlabs/route.ts", import.meta.url), "utf8");
const narratorRoute = fs.readFileSync(new URL("../src/app/api/urai/narrator/elevenlabs/route.ts", import.meta.url), "utf8");
const voiceBoundary = fs.readFileSync(new URL("../src/lib/server/elevenlabs-synthesis.ts", import.meta.url), "utf8");
const providerBoundary = fs.readFileSync(new URL("../src/lib/server/provider-boundary.ts", import.meta.url), "utf8");
const narratorClient = fs.readFileSync(new URL("../src/spatial/narrator/elevenlabsClient.ts", import.meta.url), "utf8");
const narratorPlayback = fs.readFileSync(new URL("../src/spatial/narrator/narratorPlayback.ts", import.meta.url), "utf8");
const checkoutRoute = fs.readFileSync(new URL("../src/app/api/stripe/create-checkout-session/route.ts", import.meta.url), "utf8");
const firebaseUser = fs.readFileSync(new URL("../src/lib/server/firebase-user.ts", import.meta.url), "utf8");
const approvedReturnUrl = fs.readFileSync(new URL("../src/lib/server/approved-return-url.ts", import.meta.url), "utf8");

for (const [name, route, mode] of [["voice", voiceRoute, "voice"], ["narrator", narratorRoute, "narrator"]]) {
  test(`${name} proxy delegates only to the shared hardened provider boundary`, () => {
    assert.match(route, /handleElevenLabsSynthesis/);
    assert.ok(route.includes(`'${mode}'`));
    assert.doesNotMatch(route, /ELEVENLABS_API_KEY/);
    assert.doesNotMatch(route, /NEXT_PUBLIC_ELEVENLABS/);
  });
}

test("shared voice boundary requires identity, saved consent, bounded input, durable throttling, timeout and private streaming", () => {
  assert.match(voiceBoundary, /verifyFirebaseUser/);
  assert.match(voiceBoundary, /authorizeExternalProviderRequest/);
  assert.match(providerBoundary, /privacyPolicy\/current/);
  assert.match(providerBoundary, /fully-enforced/);
  assert.match(voiceBoundary, /MAX_BODY_BYTES/);
  assert.match(voiceBoundary, /MAX_ESTIMATED_DURATION_SECONDS/);
  assert.match(voiceBoundary, /consumeProviderRateLimit/);
  assert.match(voiceBoundary, /boundedAbortSignal/);
  assert.match(voiceBoundary, /private, no-store, max-age=0/);
  assert.match(voiceBoundary, /encodeURIComponent\(voiceId\)/);
  assert.match(voiceBoundary, /ELEVENLABS_ALLOWED_VOICE_IDS/);
  assert.doesNotMatch(voiceBoundary, /NEXT_PUBLIC_ELEVENLABS/);
});

test("active narrator client and controller fail closed until session consent and avoid persistent browser audio caching", () => {
  assert.match(narratorClient, /externalProcessingConsent = false/);
  assert.match(narratorClient, /if \(!externalProcessingConsent \|\| !firebasePublicEnvReady \|\| signal\?\.aborted\) return null/);
  assert.match(narratorClient, /getAuth\(app\)\.currentUser/);
  assert.match(narratorClient, /getIdToken\(\)/);
  assert.match(narratorClient, /Authorization/);
  assert.match(narratorClient, /externalProcessingConsent: true/);
  assert.match(narratorPlayback, /private externalVoiceConsent = false/);
  assert.match(narratorPlayback, /setExternalVoiceConsent/);
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
