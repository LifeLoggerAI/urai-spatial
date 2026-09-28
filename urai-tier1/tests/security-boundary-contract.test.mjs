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
const lifeMapSeed = fs.readFileSync(new URL("../scripts/seed-life-map.mjs", import.meta.url), "utf8");
const deployGuide = fs.readFileSync(new URL("../../docs/DEPLOY_GUIDE.md", import.meta.url), "utf8");
const lifeMapChecklist = fs.readFileSync(new URL("../docs/LIFEMAP_QA_CHECKLIST.md", import.meta.url), "utf8");
const envExample = fs.readFileSync(new URL("../.env.example", import.meta.url), "utf8");
const rootEnvExample = fs.readFileSync(new URL("../../.env.example", import.meta.url), "utf8");
const productionSecretsGuide = fs.readFileSync(new URL("../../docs/PRODUCTION_SECRETS.md", import.meta.url), "utf8");
const deploymentGuide = fs.readFileSync(new URL("../../DEPLOYMENT.md", import.meta.url), "utf8");
const productionAudit = fs.readFileSync(new URL("../../docs/PRODUCTION_AUDIT.md", import.meta.url), "utf8");
const releaseManagerRunbook = fs.readFileSync(new URL("../../docs/release/URAI_SPATIAL_RELEASE_MANAGER_RUNBOOK.md", import.meta.url), "utf8");
const productionReadiness = fs.readFileSync(new URL("../../docs/PRODUCTION_READINESS.md", import.meta.url), "utf8");

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


test("Life Map seed rejects long-lived Google credentials before Firestore writes", () => {
  assert.match(lifeMapSeed, /assertExternalAccountAdc\(\)/);
  assert.match(lifeMapSeed, /record\.type !== 'external_account'/);
  assert.match(lifeMapSeed, /FIREBASE_SERVICE_ACCOUNT_JSON/);
  assert.match(lifeMapSeed, /GOOGLE_APPLICATION_CREDENTIALS/);
  assert.match(lifeMapSeed, /applicationDefault\(\)/);
});


test("WIF operator documentation matches the file-backed external-account runtime guard", () => {
  for (const source of [deployGuide, lifeMapChecklist, envExample, rootEnvExample, productionSecretsGuide, deploymentGuide, productionAudit, releaseManagerRunbook, productionReadiness]) {
    assert.match(source, /external[_ -]account/i);
    assert.doesNotMatch(source, /provider-managed ADC/i);
  }
  assert.match(lifeMapChecklist, /GOOGLE_APPLICATION_CREDENTIALS=\/path\/to\/protected-external-account\.json/);
  assert.doesNotMatch(lifeMapChecklist, /FIREBASE_PROJECT_ID=<project-id> pnpm seed:lifemap/);
  assert.match(deploymentGuide, /GOOGLE_APPLICATION_CREDENTIALS=\/path\/to\/protected-external-account\.json/);
  assert.doesNotMatch(deploymentGuide, /FIREBASE_SERVICE_ACCOUNT_JSON/);
  assert.doesNotMatch(productionAudit, /Add `FIREBASE_SERVICE_ACCOUNT_JSON`/);
  assert.doesNotMatch(productionAudit, /FIREBASE_SERVICE_ACCOUNT_JSON must be valid JSON/);
  assert.match(productionSecretsGuide, /Metadata-backed implicit ADC is not supported/);
  assert.doesNotMatch(releaseManagerRunbook, /managed ADC|provider-managed ADC/i);
  assert.doesNotMatch(productionReadiness, /managed ADC|provider-managed ADC/i);
  assert.match(releaseManagerRunbook, /file-backed external-account Workload Identity Federation/);
  assert.match(productionReadiness, /file-backed external-account Workload Identity Federation/);
  assert.match(rootEnvExample, /GOOGLE_APPLICATION_CREDENTIALS=/);
  assert.match(rootEnvExample, /file-backed external_account Workload Identity Federation/);
  assert.doesNotMatch(rootEnvExample, /managed ADC|provider-managed ADC/i);
});
