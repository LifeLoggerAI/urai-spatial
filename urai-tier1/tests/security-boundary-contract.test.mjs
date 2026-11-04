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
const passportVault = fs.readFileSync(new URL("../src/app/passport/PassportVaultClient.tsx", import.meta.url), "utf8");
const consentSanctuary = fs.readFileSync(new URL("../src/app/privacy-controls/ConsentSanctuaryClient.tsx", import.meta.url), "utf8");

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
  assert.match(stripeFunctions, /customers\.retrieve/);
  assert.match(stripeFunctions, /customer\.livemode !== \(mode === 'production'\)/);
  assert.match(stripeFunctions, /billingPortal\.sessions\.create/);
  assert.match(stripeFunctions, /checkout\.sessions\.create/);
  assert.match(stripeFunctions, /Cache-Control.*private, no-store, max-age=0/);
  const rewrites = new Map(staticHosting.rewrites.map((entry) => [entry.source, entry.function?.functionId]));
  assert.equal(rewrites.get('/api/stripe/create-checkout-session'), 'createStripeCheckout');
  assert.equal(rewrites.get('/api/stripe/create-portal-session'), 'createStripeCustomerPortal');
  assert.equal(rewrites.get('/api/entitlement'), 'getStripeEntitlement');
  assert.equal(rewrites.get('/api/stripe/webhook'), 'handleStripeWebhook');
  assert.equal([...rewrites.keys()].some((source) => source === '**' || source === '/**'), false);
});

// R572: source-level guards only; original SSR/hydration and owner transitions require separate runtime verification.
test('Passport unauthenticated first render never asserts synthetic verified ownership', () => {
  assert.match(passportVault, /useState<SnapshotPayload>\(\{\}\)/);
  assert.doesNotMatch(passportVault, /useState<SnapshotPayload>\(\(\) => toDemoPayload\(\)\)/);
  assert.match(passportVault, /if \(explicitDemo\) \{\s*setSnapshot\(toDemoPayload\(\)\)/);
  assert.match(passportVault, /authEpoch\.current \+= 1/);
  assert.match(passportVault, /setSnapshot\(\{\}\)/);
  assert.match(passportVault, /getAuth\(app\)\.currentUser\?\.uid === user\.uid/);
  assert.match(passportVault, /ownerContentAvailable \? sources : \[\]/);
  assert.match(passportVault, /state !== 'loading'/);
  assert.match(passportVault, /Private records are unavailable until your account is authorized/);
});

test('Consent Sanctuary refuses unauthenticated or missing-policy positive grant claims', () => {
  assert.match(consentSanctuary, /useState<ConsentPolicy>\(\(\) => unverifiedPolicy\(\)\)/);
  assert.doesNotMatch(consentSanctuary, /useState<ConsentPolicy>\(\(\) => demoPolicy\(\)\)/);
  assert.match(consentSanctuary, /mode: 'denied', precise: false/);
  assert.match(consentSanctuary, /if \(!snapshot\.exists\(\) \|\| !isConsentPolicy\(rawPolicy, user\.uid\)\)/);
  assert.doesNotMatch(consentSanctuary, /\? rawPolicy : defaultConsentPolicy\(user\.uid\)/);
  assert.match(consentSanctuary, /setLoadState\('unavailable'\)/);
  assert.match(consentSanctuary, /ownerEpoch\.current \+= 1/);
  assert.match(consentSanctuary, /ownerPolicyVisible \? policy\.enforcement\.state : 'unverified'/);
  assert.match(consentSanctuary, /if \(explicitDemo\) \{\s*setPolicy\(demoPolicy\(\)\)/);
});


test('R577: Passport drops offline owner evidence and fences late owner-bound export navigation', () => {
  assert.match(passportVault, /const onOffline = \(\) => \{[\s\S]*?authEpoch\.current \+= 1[\s\S]*?setSnapshot\(\{\}\)[\s\S]*?setExports\(\[\]\)[\s\S]*?setDeletions\(\[\]\)[\s\S]*?setReceipts\(\[\]\)[\s\S]*?setState\('offline'\)/);
  assert.match(passportVault, /setAuthorityEpoch\(\(value\) => value \+ 1\)/);
  assert.match(passportVault, /\}, \[user, explicitDemo, authorityEpoch\]\)/);
  assert.match(passportVault, /const ownerCanDownload = \(uid: string \| undefined, epoch: number\) =>/);
  assert.match(passportVault, /authEpoch\.current === epoch && getAuth\(app\)\.currentUser\?\.uid === uid/);
  assert.match(passportVault, /getOperationalExportDownloadUrl\(\{ jobId: job\.id \}\); if \(!ownerCanDownload\(uid, epoch\)\) return; window\.location\.assign/);
  assert.match(passportVault, /getOperationalExportDownloadUrl\(\{ jobId: job\.id, file: 'runtime', assetId \}\); if \(!ownerCanDownload\(uid, epoch\)\) return; window\.location\.assign/);
  assert.doesNotMatch(passportVault, /getOperationalExportDownloadUrl\([^\n]+\); window\.location\.assign/);
});

test('R577: Consent keeps cached/pending data unverified and rejects late owner download URLs', () => {
  assert.match(consentSanctuary, /snapshot\.metadata\.fromCache \|\| snapshot\.metadata\.hasPendingWrites \|\| !navigator\.onLine/);
  assert.match(consentSanctuary, /setLoadState\('unverified'\)/);
  assert.match(consentSanctuary, /const invalidateOwnerView = \(\) => \{[\s\S]*?ownerEpoch\.current \+= 1[\s\S]*?setPolicy\(unverifiedPolicy\(\)\)[\s\S]*?setReceipts\(\[\]\)[\s\S]*?setExports\(\[\]\)[\s\S]*?setDeletions\(\[\]\)/);
  assert.match(consentSanctuary, /setReconnectEpoch\(\(value\) => value \+ 1\)/);
  assert.match(consentSanctuary, /\}, \[user, explicitDemo, reconnectEpoch\]\)/);
  assert.match(consentSanctuary, /const ownerCanDownload = \(uid: string \| undefined, epoch: number\) =>/);
  assert.match(consentSanctuary, /ownerEpoch\.current === epoch && getAuth\(app\)\.currentUser\?\.uid === uid/);
  assert.match(consentSanctuary, /getOperationalExportDownloadUrl\(\{ jobId: job\.id \}\); if \(!ownerCanDownload\(uid, epoch\)\) return; window\.location\.assign/);
  assert.match(consentSanctuary, /getOperationalExportDownloadUrl\(\{ jobId: job\.id, file: 'runtime', assetId \}\); if \(!ownerCanDownload\(uid, epoch\)\) return; window\.location\.assign/);
  assert.doesNotMatch(consentSanctuary, /getOperationalExportDownloadUrl\([^\n]+\); window\.location\.assign/);
});


test('R584: Passport async export/deletion callbacks cannot update a different owner session', () => {
  for (const [handler, service] of [
    ['requestExport', 'createOperationalExportRequest'],
    ['requestDeletion', 'createOperationalDeletionRequest'],
  ]) {
    const start = passportVault.indexOf('const ' + handler + ' = async () => {');
    assert.ok(start >= 0, handler + ' must exist');
    const next = passportVault.indexOf('\n  const ', start + 1);
    const source = passportVault.slice(start, next > start ? next : undefined);
    assert.match(source, /const uid = user\?\.uid;\s*|const uid = user\?\.uid/);
    assert.match(source, /const epoch = authEpoch\.current/);
    assert.match(source, /if \(!ownerCanDownload\(uid, epoch\)\) return/);
    assert.match(source, new RegExp('await ' + service + '[\\s\\S]*?if \\(!ownerCanDownload\\(uid, epoch\\)\\) return'));
    assert.match(source, /catch \{\s*if \(!ownerCanDownload\(uid, epoch\)\) return/);
    assert.match(source, /finally \{ if \(ownerCanDownload\(uid, epoch\)\) setBusy\(false\) \}/);
  }
  assert.match(passportVault, /setConfirmation\(''\)\s*setBusy\(false\)\s*setUser\(nextUser\)/);
});

test('R584: Consent async writes and exports stay fenced across auth transitions', () => {
  for (const [handler, service] of [
    ['confirmChange', 'applyOperationalConsentPolicy'],
    ['requestExport', 'createOperationalExportRequest'],
    ['requestDeletion', 'createOperationalDeletionRequest'],
  ]) {
    const start = consentSanctuary.indexOf('const ' + handler + ' = async () => {');
    assert.ok(start >= 0, handler + ' must exist');
    const next = consentSanctuary.indexOf('\n  const ', start + 1);
    const source = consentSanctuary.slice(start, next > start ? next : undefined);
    assert.match(source, /const uid = user\?\.uid/);
    assert.match(source, /const epoch = ownerEpoch\.current/);
    assert.match(source, new RegExp('await ' + service + '[\\s\\S]*?if \\(!ownerCanDownload\\(uid, epoch\\)\\) return'));
    assert.match(source, /catch \(error\) \{\s*if \(!ownerCanDownload\(uid, epoch\)\) return/);
    if (handler !== 'confirmChange') assert.match(source, /finally \{ if \(ownerCanDownload\(uid, epoch\)\) setOperationBusy\(false\) \}/);
  }
  assert.match(consentSanctuary, /setDeletionConfirmation\(''\)\s*setOperationBusy\(false\)\s*setUser\(nextUser\)/);
});

test('R585: late export download failures and cancel clicks must be tied to the initiating owner epoch', () => {
  for (const [source, epochRef, stateRef, errors] of [
    [passportVault, 'authEpoch', 'state', [
      'Secure export download could not be authorized.',
      'Secure runtime download could not be authorized.']],
    [consentSanctuary, 'ownerEpoch', 'loadState', [
      'Secure download could not be authorized.',
      'Secure runtime download could not be authorized.']],
  ]) {
    const captured = 'onClick={async () => { const uid = user?.uid; const epoch = ' + epochRef + '.current; try {';
    assert.equal(source.split(captured).length - 1, 2, 'both downloads must capture the session outside try');
    for (const message of errors) {
      const guarded = "catch { if (ownerCanDownload(uid, epoch)) setMessage('" + message + "') }";
      assert.equal(source.split(guarded).length - 1, 1, 'late error must not mutate a new owner');
      assert.equal(source.split("catch { setMessage('" + message + "') }").length - 1, 0);
    }
    for (const fn of ['cancelOperationalExportRequest', 'cancelOperationalDeletionRequest']) {
      const guarded = 'if (' + stateRef + " !== 'private' || !ownerCanDownload(uid, epoch)) return; void " + fn + '(job.id)';
      assert.equal(source.split(guarded).length - 1, 1, 'cancellation must require current owner at invocation');
    }
  }
});
