import { createHash } from "node:crypto";

export const ACTION_CLASSES = Object.freeze([
  "silent_auto",
  "reversible_auto",
  "ask_first",
  "strong_confirmation",
  "never_autonomous",
]);

const CONFIRMATION_REQUIRED = new Set(["ask_first", "strong_confirmation"]);

function nowMs(value) {
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) throw new Error("Invalid ISO date: " + value);
  return ms;
}

function major(version) {
  const match = /^(\d+)\./.exec(String(version ?? ""));
  return match ? Number(match[1]) : Number.NaN;
}

function safeDigest(request) {
  const safe = {
    version: request.version,
    requestId: request.requestId,
    subjectId: request.subjectId,
    integrationId: request.integrationId,
    capability: request.capability,
    purpose: request.purpose,
    actionClass: request.actionClass,
    createdAt: request.createdAt,
  };
  return createHash("sha256").update(JSON.stringify(safe)).digest("hex");
}

export function assertCompatibleMajor(contractVersion, supportedVersion = "1.0.0") {
  if (!Number.isFinite(major(contractVersion)) || major(contractVersion) !== major(supportedVersion)) {
    throw new Error("Unsupported EWI major version: " + contractVersion);
  }
}

export function evaluateAction({ request, grant, manifest, feature, now }) {
  const deny = (reason) => ({ allowed: false, reason });

  if (!request || !grant || !manifest || !feature) return deny("MISSING_POLICY_INPUT");
  if (feature.defaultEnabled !== false) return deny("FEATURE_NOT_HARD_OFF_BY_DEFAULT");
  if (feature.runtimeEnabled !== true) return deny("FEATURE_GATE_OFF");
  if (feature.mode !== "synthetic") return deny("PRELAUNCH_SYNTHETIC_ONLY");
  if (feature.killed === true) return deny("KILL_SWITCH_ACTIVE");

  try {
    assertCompatibleMajor(request.version);
    assertCompatibleMajor(grant.version);
    assertCompatibleMajor(manifest.version);
  } catch {
    return deny("UNSUPPORTED_CONTRACT_VERSION");
  }

  if (request.integrationId !== manifest.integrationId) return deny("INTEGRATION_MISMATCH");
  if (grant.subjectId !== request.subjectId) return deny("SUBJECT_MISMATCH");
  if (grant.status !== "active") return deny("GRANT_NOT_ACTIVE");
  if (grant.expiresAt && nowMs(grant.expiresAt) <= nowMs(now)) return deny("GRANT_EXPIRED");
  if (!Array.isArray(request.permissionRefs) || !request.permissionRefs.includes(grant.grantId)) {
    return deny("GRANT_REFERENCE_MISSING");
  }

  const resourceMatches =
    grant.resource === "*" ||
    grant.resource === request.integrationId ||
    grant.resource === request.integrationId + ":" + request.capability;
  if (!resourceMatches) return deny("RESOURCE_MISMATCH");

  if (!grant.capabilities?.includes(request.capability)) return deny("CAPABILITY_NOT_GRANTED");
  if (!grant.purposes?.includes(request.purpose)) return deny("PURPOSE_NOT_GRANTED");
  if (!grant.allowedActionClasses?.includes(request.actionClass)) return deny("ACTION_CLASS_NOT_GRANTED");
  if (request.actionClass === "never_autonomous") return deny("NEVER_AUTONOMOUS");

  if (CONFIRMATION_REQUIRED.has(request.actionClass) && request.confirmation?.state !== "confirmed") {
    return deny("CONFIRMATION_REQUIRED");
  }
  if (request.confirmation?.state === "denied") return deny("CONFIRMATION_DENIED");
  if (!Array.isArray(manifest.permissions) || manifest.permissions.length === 0) {
    return deny("MANIFEST_PERMISSION_DECLARATION_MISSING");
  }

  return { allowed: true, reason: "AUTHORIZED_SYNTHETIC_DISPATCH" };
}

function delayReject(ms, signal) {
  return new Promise((_, reject) => {
    const id = setTimeout(
      () => reject(Object.assign(new Error("EWI dispatch timeout"), { code: "TIMEOUT" })),
      ms,
    );
    signal?.addEventListener("abort", () => {
      clearTimeout(id);
      reject(Object.assign(new Error("EWI dispatch aborted"), { code: "ABORTED" }));
    }, { once: true });
  });
}

async function withTimeout(promise, timeoutMs, signal) {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return promise;
  return Promise.race([promise, delayReject(timeoutMs, signal)]);
}

export class AdapterRegistry {
  #records = new Map();
  #clock;

  constructor({ clock = () => new Date().toISOString() } = {}) {
    this.#clock = clock;
  }

  register({ manifest, adapter, featureGate }) {
    if (!manifest?.integrationId) throw new Error("manifest.integrationId is required");
    if (!adapter || adapter.synthetic !== true) {
      throw new Error("Prelaunch EWI accepts synthetic adapters only");
    }
    if (!featureGate || featureGate.defaultEnabled !== false) {
      throw new Error("featureGate.defaultEnabled must be false");
    }
    assertCompatibleMajor(manifest.version);

    this.#records.set(manifest.integrationId, {
      manifest: structuredClone(manifest),
      adapter,
      feature: {
        ...structuredClone(featureGate),
        runtimeEnabled: false,
        mode: "synthetic",
        killed: false,
      },
      state: "registered",
    });
  }

  list() {
    return [...this.#records.entries()].map(([integrationId, r]) => ({
      integrationId,
      state: r.state,
      runtimeEnabled: r.feature.runtimeEnabled,
      killed: r.feature.killed,
      availability: r.manifest.availability,
    }));
  }

  enableSynthetic(integrationId) {
    const record = this.#require(integrationId);
    record.feature.runtimeEnabled = true;
    record.feature.mode = "synthetic";
  }

  disable(integrationId) {
    const record = this.#require(integrationId);
    record.feature.runtimeEnabled = false;
  }

  kill(integrationId, reason = "operator_kill") {
    const record = this.#require(integrationId);
    record.feature.killed = true;
    record.feature.runtimeEnabled = false;
    record.feature.killReason = reason;
  }

  clearSyntheticKill(integrationId) {
    const record = this.#require(integrationId);
    record.feature.killed = false;
    delete record.feature.killReason;
  }

  async initialize(integrationId) {
    const record = this.#require(integrationId);
    if (record.state === "initialized") return;
    await record.adapter.initialize?.({
      manifest: structuredClone(record.manifest),
      mode: "synthetic",
    });
    record.state = "initialized";
  }

  async shutdown(integrationId) {
    const record = this.#require(integrationId);
    await record.adapter.shutdown?.({ mode: "synthetic" });
    record.state = "shutdown";
    record.feature.runtimeEnabled = false;
  }

  async dispatch({ request, grants, timeoutMs = 1500, maxAttempts = 1, signal }) {
    const record = this.#require(request?.integrationId);
    const now = this.#clock();
    const matching = (grants ?? []).find((g) => request.permissionRefs?.includes(g.grantId));
    const decision = evaluateAction({
      request,
      grant: matching,
      manifest: record.manifest,
      feature: record.feature,
      now,
    });

    const baseReceipt = {
      receiptVersion: "1.0.0",
      requestId: request?.requestId ?? "unknown",
      integrationId: request?.integrationId ?? "unknown",
      capability: request?.capability ?? "unknown",
      evaluatedAt: now,
      requestMetadataDigest: request ? safeDigest(request) : null,
      payloadLogged: false,
      mode: "synthetic",
    };

    if (!decision.allowed) {
      return { ...baseReceipt, outcome: "denied", reason: decision.reason, attempts: 0 };
    }
    if (record.state !== "initialized") {
      return { ...baseReceipt, outcome: "denied", reason: "ADAPTER_NOT_INITIALIZED", attempts: 0 };
    }

    const attempts = Math.max(1, Math.min(Number(maxAttempts) || 1, 3));
    let lastError;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        const result = await withTimeout(
          Promise.resolve(record.adapter.dispatch({
            request: structuredClone(request),
            signal,
            mode: "synthetic",
          })),
          timeoutMs,
          signal,
        );
        return {
          ...baseReceipt,
          outcome: "synthetic_success",
          reason: "MOCK_ADAPTER_EXECUTED",
          attempts: attempt,
          adapterReceipt: result?.receipt ?? null,
        };
      } catch (error) {
        lastError = error;
        if (signal?.aborted || error?.code === "ABORTED") {
          return { ...baseReceipt, outcome: "cancelled", reason: "ABORTED", attempts: attempt };
        }
        if (error?.transient !== true || attempt === attempts) break;
      }
    }

    return {
      ...baseReceipt,
      outcome: "synthetic_failure",
      reason: lastError?.code ?? "ADAPTER_ERROR",
      attempts,
    };
  }

  #require(integrationId) {
    const record = this.#records.get(integrationId);
    if (!record) throw new Error("Unknown integration: " + integrationId);
    return record;
  }
}
