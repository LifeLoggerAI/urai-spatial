import assert from "node:assert/strict";
import fs from "node:fs";

const registry = JSON.parse(
  fs.readFileSync(new URL("../../docs/contracts/ewi/wearable-provider-registry.v1.json", import.meta.url), "utf8"),
);
const integrationRegistry = JSON.parse(
  fs.readFileSync(new URL("../../docs/contracts/ewi/integration-registry.seed.json", import.meta.url), "utf8"),
);

const allowedSignals = ["energy", "motion", "sleep", "steps"];

assert.equal(registry.productionActive, false);
assert.equal(registry.realIngestionAllowed, false);
assert.deepEqual([...registry.normalizedLaunchSignalTypes].sort(), allowedSignals);

const ids = registry.providers.map((provider) => provider.id);
assert.deepEqual(ids.sort(), [
  "android-health-connect",
  "apple-healthkit",
  "fitbit-web-api",
  "garmin-health-api",
  "oura-api",
  "whoop-api",
]);

for (const provider of registry.providers) {
  assert.equal(provider.status, "EXTERNAL_GATE");
  assert.equal(provider.minimumLaunchMode, "read-only");
  assert.equal(provider.requiresProviderDeveloperApp, true);
  assert.equal(provider.requiresHumanAccountAction, true);
  assert.ok(provider.requirements.length >= 4);
  for (const signal of provider.launchDataMapping) assert.ok(allowedSignals.includes(signal));
}

const apple = registry.providers.find((provider) => provider.id === "apple-healthkit");
assert.equal(apple.requiresNativePackage, true);
assert.ok(apple.requirements.includes("HealthKit capability/entitlement"));
assert.ok(apple.requirements.includes("NSHealthShareUsageDescription"));

const android = registry.providers.find((provider) => provider.id === "android-health-connect");
assert.equal(android.requiresNativePackage, true);
assert.ok(android.requirements.includes("Play Console Health apps declaration"));

const oura = registry.providers.find((provider) => provider.id === "oura-api");
assert.deepEqual(oura.requestedScopes, ["daily", "workout"]);
for (const scope of ["email", "personal", "heartrate", "spo2"]) assert.ok(oura.excludedByDefaultScopes.includes(scope));

const whoop = registry.providers.find((provider) => provider.id === "whoop-api");
assert.ok(whoop.requestedScopes.includes("read:sleep"));
assert.ok(whoop.excludedByDefaultScopes.includes("read:profile"));
assert.ok(whoop.excludedByDefaultScopes.includes("read:body_measurement"));

const federation = integrationRegistry.integrations.find(
  (integration) => integration.integrationId === "wearable.federation",
);
assert.equal(federation.availability, "gated");
assert.equal(federation.realIngestionAllowed, false);
assert.equal(federation.clinicalInterpretationAllowed, false);
assert.equal(federation.providerRegistryRef, "docs/contracts/ewi/wearable-provider-registry.v1.json");
assert.deepEqual([...federation.normalizedLaunchSignalTypes].sort(), allowedSignals);

console.log("Wearable provider admission conformance: PASS");
