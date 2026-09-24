function clone(value) {
  return structuredClone(value);
}

export class LocalFirstQueue {
  #items = [];
  #seen = new Set();

  enqueue(event) {
    if (!event?.eventId || !event?.subjectId || !event?.idempotencyKey) {
      throw new Error("eventId, subjectId and idempotencyKey are required");
    }
    if (this.#seen.has(event.idempotencyKey)) {
      return { accepted: false, reason: "DUPLICATE_IDEMPOTENCY_KEY" };
    }

    const item = {
      ...clone(event),
      state: "queued",
      attempts: 0,
      queuedAt: event.queuedAt ?? new Date(0).toISOString(),
    };
    this.#seen.add(event.idempotencyKey);
    this.#items.push(item);
    return { accepted: true, reason: "QUEUED" };
  }

  snapshot() {
    return clone(this.#items);
  }

  purgeSubject(subjectId) {
    const before = this.#items.length;
    const removedKeys = this.#items
      .filter((x) => x.subjectId === subjectId)
      .map((x) => x.idempotencyKey);
    this.#items = this.#items.filter((x) => x.subjectId !== subjectId);
    for (const key of removedKeys) this.#seen.delete(key);
    return before - this.#items.length;
  }

  async flush({ online, executor, maxAttempts = 2 }) {
    if (!online) {
      return { flushed: 0, retained: this.#items.length, reason: "OFFLINE" };
    }
    if (typeof executor !== "function") throw new Error("executor required");

    const retained = [];
    const receipts = [];

    for (const item of this.#items) {
      let final = null;
      const limit = Math.max(1, Math.min(Number(maxAttempts) || 1, 3));

      for (let attempt = 1; attempt <= limit; attempt += 1) {
        item.attempts += 1;
        try {
          const result = await executor(clone(item));
          if (result?.conflict === true) {
            final = { eventId:item.eventId, outcome:"conflict", strategy:"retain_for_review" };
            break;
          }
          final = { eventId:item.eventId, outcome:"committed", receipt:result?.receipt ?? null };
          break;
        } catch (error) {
          if (error?.transient !== true || attempt === limit) {
            final = { eventId:item.eventId, outcome:"retry_later", reason:error?.code ?? "EXECUTOR_ERROR" };
            break;
          }
        }
      }

      receipts.push(final);
      if (final.outcome !== "committed") retained.push(item);
    }

    this.#items = retained;
    return {
      flushed: receipts.filter((x) => x.outcome === "committed").length,
      retained: retained.length,
      receipts,
    };
  }
}

export function degradedCapabilityState({ online, webgl, localAssets, storageHealthy }) {
  return {
    network: online ? "online" : "offline",
    rendering: webgl ? "webgl" : "static-fallback",
    assets: localAssets ? "local-ready" : "limited",
    storage: storageHealthy ? "healthy" : "degraded",
    canQueueWrites: Boolean(storageHealthy),
    canReadLocalPrivacyControls: true,
    canReadLocalPassport: Boolean(localAssets && storageHealthy),
    cloudOnlyFeaturesAvailable: Boolean(online),
  };
}
