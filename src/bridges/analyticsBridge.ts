import type { CommunicationPacket } from "./communicationsBridge";

export const ANALYTICS_SCHEMA_VERSION = 1 as const;

export const ANALYTICS_EVENT_DICTIONARY = Object.freeze({
  "system.loop.initialized": "runtime_initialized",
  "system.loop.completed": "runtime_cycle_completed",
  "system.tick": "runtime_tick",
  "system.started": "runtime_started",
  "system.stopped": "runtime_stopped",
  "memory.ready": "memory_runtime_ready",
  "memory.recorded": "memory_event_recorded",
  "memory.snapshot": "memory_snapshot_created",
  "prediction.generated": "prediction_generated",
  "xr.frame.rendered": "xr_frame_rendered",
  "smoke.boot": "runtime_smoke_boot"
} as const);

export const ANALYTICS_PROHIBITED_FIELDS = Object.freeze([
  "raw",
  "payload",
  "memory",
  "transcript",
  "prompt",
  "freeText",
  "preciseLocation",
  "health",
  "bodySignal",
  "biometric",
  "secret",
  "token",
  "directIdentifier",
  "deviceTelemetry"
] as const);

type ApprovedPacketType = keyof typeof ANALYTICS_EVENT_DICTIONARY;
export type AnalyticsEventName = (typeof ANALYTICS_EVENT_DICTIONARY)[ApprovedPacketType];
export type AnalyticsEnvironment = "development" | "test" | "staging" | "production";
export type AnalyticsConsent = "granted" | "denied";
export type AnalyticsDropReason =
  | "disabled"
  | "consent-denied"
  | "unknown-event"
  | "invalid-payload"
  | "invalid-configuration";

export interface AnalyticsEvent {
  id: string;
  type: AnalyticsEventName;
  schemaVersion: typeof ANALYTICS_SCHEMA_VERSION;
  timestamp: number;
  environment: AnalyticsEnvironment;
  appVersion: string;
  releaseSha: string;
  metrics: Record<string, number>;
}

export type AnalyticsBridgeOptions = {
  enabled?: boolean;
  consent?: AnalyticsConsent;
  environment?: AnalyticsEnvironment;
  appVersion?: string;
  releaseSha?: string;
};

type DropCounts = Record<AnalyticsDropReason, number>;

const ANALYTICS_ENVIRONMENTS = new Set<AnalyticsEnvironment>([
  "development",
  "test",
  "staging",
  "production"
]);

const emptyDropCounts = (): DropCounts => ({
  disabled: 0,
  "consent-denied": 0,
  "unknown-event": 0,
  "invalid-payload": 0,
  "invalid-configuration": 0
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const finiteNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const booleanMetric = (value: unknown): number | null =>
  typeof value === "boolean" ? (value ? 1 : 0) : null;

const arrayCount = (value: unknown): number | null =>
  Array.isArray(value) ? value.length : null;

const normalizeEnabled = (value: unknown) => value === true;

const normalizeConsent = (value: unknown): AnalyticsConsent =>
  value === "granted" ? "granted" : "denied";

const normalizeEnvironment = (value: unknown): AnalyticsEnvironment | null =>
  typeof value === "string" && ANALYTICS_ENVIRONMENTS.has(value as AnalyticsEnvironment)
    ? (value as AnalyticsEnvironment)
    : null;

const normalizeVersion = (value: unknown, fallback: string) =>
  typeof value === "string" && /^[A-Za-z0-9._-]{1,64}$/.test(value) ? value : fallback;

const normalizeReleaseSha = (value: unknown) =>
  typeof value === "string" && /^[0-9a-f]{40}$/.test(value) ? value : "unverified";

const requireMetrics = (
  payload: unknown,
  readers: Record<string, (record: Record<string, unknown>) => number | null>
): Record<string, number> | null => {
  if (!isRecord(payload)) return null;

  const allowedKeys = new Set(Object.keys(readers));
  const suppliedKeys = Object.keys(payload);
  if (suppliedKeys.some((key) => !allowedKeys.has(key))) return null;
  if (suppliedKeys.length !== allowedKeys.size) return null;

  const metrics: Record<string, number> = {};
  for (const [name, read] of Object.entries(readers)) {
    const value = read(payload);
    if (value === null) return null;
    metrics[name] = value;
  }
  return metrics;
};

const extractApprovedMetrics = (
  type: ApprovedPacketType,
  payload: unknown
): Record<string, number> | null => {
  switch (type) {
    case "system.loop.initialized":
      return requireMetrics(payload, {
        replayLimit: (record) => finiteNumber(record.replayLimit),
        restoredRuns: (record) => finiteNumber(record.restoredRuns)
      });
    case "system.loop.completed":
      return requireMetrics(payload, {
        tick: (record) => finiteNumber(record.tick),
        totalRuns: (record) => finiteNumber(record.totalRuns),
        packetCount: (record) => finiteNumber(record.packets),
        analyticsEventCount: (record) => finiteNumber(record.analyticsEvents)
      });
    case "system.tick":
      return requireMetrics(payload, {
        tick: (record) => finiteNumber(record.tick),
        running: (record) => booleanMetric(record.running)
      });
    case "system.started":
      return requireMetrics(payload, {
        tick: (record) => finiteNumber(record.tick),
        intervalMs: (record) => finiteNumber(record.intervalMs)
      });
    case "system.stopped":
      return requireMetrics(payload, {
        tick: (record) => finiteNumber(record.tick)
      });
    case "memory.ready":
      return requireMetrics(payload, {
        totalNodes: (record) => finiteNumber(record.totalNodes)
      });
    case "memory.recorded":
      return requireMetrics(payload, {
        totalNodes: (record) => finiteNumber(record.totalNodes),
        totalEdges: (record) => finiteNumber(record.totalEdges)
      });
    case "memory.snapshot":
      return requireMetrics(payload, {
        totalNodes: (record) => finiteNumber(record.totalNodes),
        totalEdges: (record) => finiteNumber(record.totalEdges)
      });
    case "prediction.generated":
      return requireMetrics(payload, {
        candidateCount: (record) => arrayCount(record.candidates),
        hasTopCandidate: (record) => (record.topCandidate === undefined ? 0 : 1)
      });
    case "xr.frame.rendered":
      return requireMetrics(payload, {
        tick: (record) => finiteNumber(record.tick),
        objectCount: (record) => finiteNumber(record.objectCount),
        hasDominantPrediction: (record) => (record.dominantPrediction === undefined ? 0 : 1)
      });
    case "smoke.boot":
      return requireMetrics(payload, {});
  }
};

export class AnalyticsBridge {
  private buffer: AnalyticsEvent[] = [];
  private readonly enabled: boolean;
  private consent: AnalyticsConsent;
  private readonly environment: AnalyticsEnvironment;
  private readonly appVersion: string;
  private readonly releaseSha: string;
  private readonly configurationValid: boolean;
  private readonly dropCounts: DropCounts = emptyDropCounts();
  private sequence = 0;

  constructor(options: AnalyticsBridgeOptions = {}) {
    const runtimeOptions = isRecord(options) ? options : {};
    const normalizedEnvironment = normalizeEnvironment(runtimeOptions.environment);

    this.enabled = normalizeEnabled(runtimeOptions.enabled);
    this.consent = normalizeConsent(runtimeOptions.consent);
    this.environment = normalizedEnvironment ?? "development";
    this.appVersion = normalizeVersion(runtimeOptions.appVersion, "unversioned");
    this.releaseSha = normalizeReleaseSha(runtimeOptions.releaseSha);
    this.configurationValid = !this.enabled || normalizedEnvironment !== null;
  }

  ingest(packet: CommunicationPacket): AnalyticsEvent | null {
    if (!this.enabled) return this.drop("disabled");
    if (this.consent !== "granted") return this.drop("consent-denied");
    if (!this.configurationValid) return this.drop("invalid-configuration");
    if (
      this.environment === "production" &&
      (this.releaseSha === "unverified" || this.appVersion === "unversioned")
    ) {
      return this.drop("invalid-configuration");
    }
    if (!isRecord(packet) || typeof packet.type !== "string" || finiteNumber(packet.timestamp) === null) {
      return this.drop("invalid-payload");
    }

    const approvedType = packet.type as ApprovedPacketType;
    const eventName = ANALYTICS_EVENT_DICTIONARY[approvedType];
    if (!eventName) return this.drop("unknown-event");

    const metrics = extractApprovedMetrics(approvedType, packet.payload);
    if (metrics === null) return this.drop("invalid-payload");

    this.sequence += 1;
    const event: AnalyticsEvent = {
      id: `analytics-${packet.timestamp}-${this.sequence}`,
      type: eventName,
      schemaVersion: ANALYTICS_SCHEMA_VERSION,
      timestamp: packet.timestamp,
      environment: this.environment,
      appVersion: this.appVersion,
      releaseSha: this.releaseSha,
      metrics
    };

    this.buffer.push(event);
    return event;
  }

  setConsent(consent: AnalyticsConsent): number {
    this.consent = normalizeConsent(consent);
    return this.consent !== "granted" ? this.clearBufferedEvents() : 0;
  }

  clearBufferedEvents(): number {
    const removed = this.buffer.length;
    this.buffer = [];
    return removed;
  }

  flush(): AnalyticsEvent[] {
    const out = [...this.buffer];
    this.buffer = [];
    return out;
  }

  peek(): AnalyticsEvent[] {
    return [...this.buffer];
  }

  getDropCounts(): DropCounts {
    return { ...this.dropCounts };
  }

  summarize(events = this.buffer) {
    return {
      totalEvents: events.length,
      dominantTypes: this.topTypes(events),
      dropped: this.getDropCounts()
    };
  }

  private drop(reason: AnalyticsDropReason): null {
    this.dropCounts[reason] += 1;
    return null;
  }

  private topTypes(events: AnalyticsEvent[]) {
    const map = new Map<AnalyticsEventName, number>();
    for (const event of events) {
      map.set(event.type, (map.get(event.type) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }
}
