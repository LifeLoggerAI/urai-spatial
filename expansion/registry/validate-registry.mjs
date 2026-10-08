import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const path = new URL("./expansion-registry.json", import.meta.url);
const registry = JSON.parse(await readFile(path, "utf8"));

const required = [
  "canonicalId","humanName","owningSystem","owningRepository","roadmapGeneration","status",
  "activationState","featureGate","defaultEnabled","launchVisibility","dependencies",
  "requiredAssets","requiredProvider","requiredPermission","privacyClassification",
  "accessibilityClassification","securityClassification","legalResearchDependency",
  "hardwareDependency","activationCriteria","evidenceRequirements","testSuite","rolloutClass",
  "killSwitchOwner","rollbackProcedure"
];

assert.equal(registry.version, "1.0.0");
assert.ok(Array.isArray(registry.capabilities) && registry.capabilities.length >= 28);

const ids = new Set();
for (const entry of registry.capabilities) {
  for (const key of required) {
    assert.ok(Object.hasOwn(entry, key), (entry.canonicalId ?? "unknown") + " missing " + key);
  }
  assert.equal(entry.defaultEnabled, false, entry.canonicalId + " must be hard-off by default");
  assert.equal(entry.launchVisibility, "hidden", entry.canonicalId + " must stay hidden from V1 launch");
  assert.ok(registry.activationStates.includes(entry.activationState), entry.canonicalId + " invalid activation state");
  assert.ok(entry.featureGate.startsWith("expansion."), entry.canonicalId + " feature gate namespace invalid");
  assert.equal(ids.has(entry.canonicalId), false, "duplicate canonicalId " + entry.canonicalId);
  ids.add(entry.canonicalId);
}

for (const id of [
  "wearable.federation","context.location","communications.gateway","creator.marketplace",
  "replay.trust-v2","v10.long-horizon"
]) {
  const entry = registry.capabilities.find((x) => x.canonicalId === id);
  assert.ok(entry, "missing gated entry " + id);
  assert.equal(entry.defaultEnabled, false);
  assert.equal(entry.launchVisibility, "hidden");
}

console.log("Expansion registry: PASS (" + registry.capabilities.length + " hard-off capabilities)");
