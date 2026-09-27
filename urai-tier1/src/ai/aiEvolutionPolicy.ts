"use client";

export type EvolutionContext = {
  historyLength: number;
  branchCount: number;
  density: number;
  anomalyScore?: number;
  time?: number;
};

export type EvolutionAction =
  | { type: "none" }
  | { type: "fork"; index: number }
  | { type: "merge"; a: string; b: string }
  | { type: "synthesize" };

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

const finiteNumber = (value: unknown, fallback = 0) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const nonNegativeInteger = (value: unknown) =>
  Math.max(0, Math.trunc(finiteNumber(value)));

const boundedLabel = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 128) return null;
  return trimmed;
};

/**
 * Normalize all model-facing evolution inputs before inference or fallback logic.
 * This keeps NaN, infinities, negative counts and out-of-range normalized signals
 * from entering either the external model request or the deterministic policy.
 */
export function normalizeEvolutionContext(ctx: EvolutionContext): EvolutionContext {
  const normalized: EvolutionContext = {
    historyLength: nonNegativeInteger(ctx?.historyLength),
    branchCount: nonNegativeInteger(ctx?.branchCount),
    density: clamp01(finiteNumber(ctx?.density)),
    anomalyScore: clamp01(finiteNumber(ctx?.anomalyScore)),
  };

  if (typeof ctx?.time === "number" && Number.isFinite(ctx.time)) {
    normalized.time = ctx.time;
  }

  return normalized;
}

/**
 * Convert untrusted model output into the narrow EvolutionAction contract.
 * Unknown action types, invalid indexes and unbounded merge labels are rejected.
 */
export function validateEvolutionAction(
  value: unknown,
  ctx: EvolutionContext
): EvolutionAction | null {
  if (!value || typeof value !== "object") return null;

  const candidate = value as Record<string, unknown>;

  switch (candidate.type) {
    case "none":
      return { type: "none" };
    case "synthesize":
      return { type: "synthesize" };
    case "fork": {
      const index = candidate.index;
      if (
        typeof index !== "number" ||
        !Number.isInteger(index) ||
        index < 0 ||
        index >= ctx.historyLength
      ) {
        return null;
      }
      return { type: "fork", index };
    }
    case "merge": {
      const a = boundedLabel(candidate.a);
      const b = boundedLabel(candidate.b);
      if (!a || !b) return null;
      return { type: "merge", a, b };
    }
    default:
      return null;
  }
}

/**
 * Credential-free deterministic fallback used whenever external inference is
 * unavailable or returns data that does not satisfy the runtime contract.
 */
export function deterministicEvolutionPolicy(
  rawCtx: EvolutionContext
): EvolutionAction {
  const ctx = normalizeEvolutionContext(rawCtx);
  const { historyLength, branchCount, density, anomalyScore = 0 } = ctx;

  const pressure = historyLength / 25;
  const instability = branchCount / 5;
  const chaos = density + anomalyScore;

  if (pressure > 1.0 && chaos < 0.7) {
    return {
      type: "fork",
      index: Math.max(0, historyLength - 5),
    };
  }

  if (instability > 1 && chaos > 0.5) {
    return {
      type: "merge",
      a: "auto",
      b: "auto",
    };
  }

  if (anomalyScore > 0.8) {
    return { type: "synthesize" };
  }

  return { type: "none" };
}

/**
 * AI POLICY LAYER
 *
 * Primary path: external model inference API.
 * Fallback path: deterministic heuristic policy.
 *
 * The external response is untrusted. Only contract-valid actions can enter
 * the reasoning state; all malformed, unsupported or out-of-bounds responses
 * fail closed to the deterministic policy.
 */
export async function aiEvolutionPolicy(
  rawCtx: EvolutionContext
): Promise<EvolutionAction> {
  const ctx = normalizeEvolutionContext(rawCtx);

  try {
    const res = await fetch("/api/model/infer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        task: "evolution_policy",
        context: ctx,
      }),
    });

    if (res.ok) {
      const action = validateEvolutionAction(await res.json(), ctx);
      if (action) return action;
    }
  } catch {
    // Fail closed to the deterministic policy below.
  }

  return deterministicEvolutionPolicy(ctx);
}
