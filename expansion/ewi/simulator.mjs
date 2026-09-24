export class DeterministicMockAdapter {
  synthetic = true;

  constructor({
    integrationId,
    responses = {},
    transientFailures = 0,
    latencyMs = 0,
  } = {}) {
    this.integrationId = integrationId;
    this.responses = responses;
    this.transientFailures = transientFailures;
    this.latencyMs = latencyMs;
    this.initialized = false;
    this.dispatchCount = 0;
  }

  async initialize({ manifest, mode }) {
    if (mode !== "synthetic") throw new Error("Mock adapter is synthetic-only");
    if (manifest.integrationId !== this.integrationId) {
      throw new Error("Manifest/adapter integration mismatch");
    }
    this.initialized = true;
  }

  async shutdown() {
    this.initialized = false;
  }

  async dispatch({ request, signal, mode }) {
    if (mode !== "synthetic") throw new Error("Mock adapter cannot perform provider calls");
    if (!this.initialized) throw new Error("Mock adapter is not initialized");
    if (signal?.aborted) {
      throw Object.assign(new Error("aborted"), { code: "ABORTED" });
    }

    this.dispatchCount += 1;

    if (this.latencyMs > 0) {
      await new Promise((resolve, reject) => {
        const id = setTimeout(resolve, this.latencyMs);
        signal?.addEventListener("abort", () => {
          clearTimeout(id);
          reject(Object.assign(new Error("aborted"), { code: "ABORTED" }));
        }, { once: true });
      });
    }

    if (this.dispatchCount <= this.transientFailures) {
      throw Object.assign(new Error("synthetic transient failure"), {
        code: "SYNTHETIC_TRANSIENT",
        transient: true,
      });
    }

    const response = this.responses[request.capability] ?? { accepted: true };
    return {
      receipt: {
        integrationId: this.integrationId,
        capability: request.capability,
        synthetic: true,
        response,
      },
    };
  }
}
