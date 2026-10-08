import assert from "node:assert/strict";
import { AdapterRegistry } from "./runtime.mjs";
import { DeterministicMockAdapter } from "./simulator.mjs";

const manifest = {
  version: "1.0.0",
  integrationId: "mock.workspace",
  family: "productivity",
  authority: "synthetic test authority",
  capabilities: {
    read: true, write: true, stream: false, notify: false, record: false,
    vibrate: false, locate: false, call: false, message: true,
  },
  permissions: ["workspace.synthetic"],
  dataClasses: ["synthetic"],
  jurisdictions: ["test"],
  retentionRestrictions: ["none"],
  latencyClass: "interactive",
  costClass: "none",
  availability: "gated",
};

const featureGate = {
  canonicalId: "ewi.mock.workspace",
  defaultEnabled: false,
  launchVisibility: "hidden",
  killSwitchOwner: "URAI Admin",
};

const grant = {
  version: "1.0.0",
  grantId: "grant-test-0001",
  subjectId: "subject-1",
  resource: "mock.workspace",
  capabilities: ["workspace.read", "workspace.send"],
  purposes: ["synthetic_test"],
  allowedActionClasses: ["silent_auto", "ask_first", "strong_confirmation"],
  issuedAt: "2026-09-23T00:00:00.000Z",
  expiresAt: "2027-09-23T00:00:00.000Z",
  status: "active",
  processing: { locations: ["local"], recipients: ["self"] },
  retention: { mode: "none" },
};

function request(overrides = {}) {
  return {
    version: "1.0.0",
    requestId: "request-test-0001",
    subjectId: "subject-1",
    actor: { type: "user", id: "subject-1" },
    integrationId: "mock.workspace",
    capability: "workspace.read",
    purpose: "synthetic_test",
    actionClass: "silent_auto",
    confirmation: { state: "not_required" },
    permissionRefs: ["grant-test-0001"],
    createdAt: "2026-09-23T00:00:00.000Z",
    payload: { secretContent: "must-never-appear-in-receipt" },
    ...overrides,
  };
}

const registry = new AdapterRegistry({ clock: () => "2026-09-23T12:00:00.000Z" });
const adapter = new DeterministicMockAdapter({
  integrationId: manifest.integrationId,
  transientFailures: 1,
});

registry.register({ manifest, adapter, featureGate });

let receipt = await registry.dispatch({ request: request(), grants: [grant] });
assert.equal(receipt.outcome, "denied");
assert.equal(receipt.reason, "FEATURE_GATE_OFF");

registry.enableSynthetic(manifest.integrationId);
receipt = await registry.dispatch({ request: request(), grants: [grant] });
assert.equal(receipt.reason, "ADAPTER_NOT_INITIALIZED");

await registry.initialize(manifest.integrationId);
receipt = await registry.dispatch({
  request: request(),
  grants: [grant],
  maxAttempts: 2,
});
assert.equal(receipt.outcome, "synthetic_success");
assert.equal(receipt.attempts, 2);
assert.equal(receipt.payloadLogged, false);
assert.equal(JSON.stringify(receipt).includes("must-never-appear-in-receipt"), false);

receipt = await registry.dispatch({
  request: request({ purpose: "ungranted" }),
  grants: [grant],
});
assert.equal(receipt.reason, "PURPOSE_NOT_GRANTED");

receipt = await registry.dispatch({
  request: request({ capability: "workspace.delete" }),
  grants: [grant],
});
assert.equal(receipt.reason, "CAPABILITY_NOT_GRANTED");

receipt = await registry.dispatch({
  request: request({
    actionClass: "ask_first",
    confirmation: { state: "pending" },
  }),
  grants: [grant],
});
assert.equal(receipt.reason, "CONFIRMATION_REQUIRED");

receipt = await registry.dispatch({
  request: request({ actionClass: "never_autonomous" }),
  grants: [{ ...grant, allowedActionClasses: [...grant.allowedActionClasses, "never_autonomous"] }],
});
assert.equal(receipt.reason, "NEVER_AUTONOMOUS");

receipt = await registry.dispatch({
  request: request(),
  grants: [{ ...grant, status: "revoked" }],
});
assert.equal(receipt.reason, "GRANT_NOT_ACTIVE");

registry.kill(manifest.integrationId, "synthetic_test");
receipt = await registry.dispatch({ request: request(), grants: [grant] });
assert.equal(receipt.reason, "FEATURE_GATE_OFF");

registry.clearSyntheticKill(manifest.integrationId);
registry.enableSynthetic(manifest.integrationId);

const controller = new AbortController();
controller.abort();
receipt = await registry.dispatch({
  request: request(),
  grants: [grant],
  signal: controller.signal,
});
assert.equal(receipt.outcome, "cancelled");

await registry.shutdown(manifest.integrationId);
assert.equal(registry.list()[0].runtimeEnabled, false);

console.log("EWI synthetic conformance: PASS");
