import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  ANALYTICS_PROHIBITED_FIELDS,
  AnalyticsBridge,
  type AnalyticsConsent,
  type AnalyticsEnvironment
} from "../bridges/analyticsBridge";
import { PersistenceManager } from "../kernel/PersistenceManager";
import { createSystemLoop, type SystemLoopState } from "../kernel/SystemLoop";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const isInsideRepository = (targetPath: string) => {
  const relative = path.relative(process.cwd(), path.resolve(targetPath));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
};

const analyticsOptions = {
  enabled: true,
  consent: "granted" as const,
  environment: "test" as const,
  appVersion: "system-loop-smoke",
  releaseSha: "791416e7cee781d482ef8225e3bef1097532a64d"
};

async function main() {
  const defaultPersistence = new PersistenceManager<SystemLoopState>();
  assert(!isInsideRepository(defaultPersistence.getPath()), "Default runtime persistence path must remain outside the repository.");

  const disabled = new AnalyticsBridge();
  const disabledResult = disabled.ingest({
    id: "packet-disabled",
    type: "system.tick",
    timestamp: Date.now(),
    payload: { tick: 1, running: false, secret: "must-not-survive" }
  });
  assert(disabledResult === null, "Analytics must fail closed when activation and consent are absent.");
  assert(disabled.getDropCounts().disabled === 1, "Disabled analytics attempt must be counted without retaining payload data.");

  const invalidEnabled = new AnalyticsBridge({
    enabled: "true" as unknown as boolean,
    consent: "granted",
    environment: "test",
    appVersion: "invalid-enabled-smoke",
    releaseSha: analyticsOptions.releaseSha
  });
  assert(
    invalidEnabled.ingest({ id: "packet-invalid-enabled", type: "system.tick", timestamp: Date.now(), payload: { tick: 1, running: false } }) === null,
    "Only literal boolean true may activate analytics at runtime."
  );
  assert(invalidEnabled.getDropCounts().disabled === 1, "Invalid runtime enabled values must fail closed as disabled.");

  const consentDenied = new AnalyticsBridge({ enabled: true, consent: "denied", environment: "test" });
  assert(
    consentDenied.ingest({ id: "packet-denied", type: "system.tick", timestamp: Date.now(), payload: { tick: 1, running: false } }) === null,
    "Analytics must reject events when consent is denied."
  );
  assert(consentDenied.getDropCounts()["consent-denied"] === 1, "Consent-denied attempt must be counted.");

  const productionWithoutIdentity = new AnalyticsBridge({ enabled: true, consent: "granted", environment: "production" });
  assert(
    productionWithoutIdentity.ingest({ id: "packet-production", type: "system.tick", timestamp: Date.now(), payload: { tick: 1, running: false } }) === null,
    "Production analytics must reject events without an exact release SHA and app version."
  );
  assert(productionWithoutIdentity.getDropCounts()["invalid-configuration"] === 1, "Invalid production configuration must be counted.");

  const missingEnvironment = new AnalyticsBridge({
    enabled: true,
    consent: "granted",
    appVersion: "missing-environment-smoke",
    releaseSha: analyticsOptions.releaseSha
  });
  assert(
    missingEnvironment.ingest({ id: "packet-missing-environment", type: "system.tick", timestamp: Date.now(), payload: { tick: 1, running: false } }) === null,
    "Enabled analytics must require an explicit valid runtime environment."
  );
  assert(missingEnvironment.getDropCounts()["invalid-configuration"] === 1, "Missing runtime environment must be counted as invalid configuration.");

  const invalidEnvironment = new AnalyticsBridge({
    enabled: true,
    consent: "granted",
    environment: "production-preview" as AnalyticsEnvironment,
    appVersion: "invalid-environment-smoke",
    releaseSha: analyticsOptions.releaseSha
  });
  assert(
    invalidEnvironment.ingest({ id: "packet-invalid-environment", type: "system.tick", timestamp: Date.now(), payload: { tick: 1, running: false } }) === null,
    "Unknown runtime environments must not bypass production identity checks."
  );
  assert(invalidEnvironment.getDropCounts()["invalid-configuration"] === 1, "Unknown runtime environment must be counted as invalid configuration.");

  const nullEnvironment = new AnalyticsBridge({
    enabled: true,
    consent: "granted",
    environment: null as unknown as AnalyticsEnvironment,
    appVersion: "null-environment-smoke",
    releaseSha: analyticsOptions.releaseSha
  });
  assert(
    nullEnvironment.ingest({ id: "packet-null-environment", type: "system.tick", timestamp: Date.now(), payload: { tick: 1, running: false } }) === null,
    "Null runtime environments must not silently default to development."
  );
  assert(nullEnvironment.getDropCounts()["invalid-configuration"] === 1, "Null runtime environment must be counted as invalid configuration.");

  const unknownEvent = new AnalyticsBridge(analyticsOptions);
  assert(
    unknownEvent.ingest({ id: "packet-unknown", type: "memory.private-text", timestamp: Date.now(), payload: { transcript: "sensitive" } }) === null,
    "Unknown event types must be rejected."
  );
  assert(unknownEvent.getDropCounts()["unknown-event"] === 1, "Unknown event attempt must be counted.");

  const tainted = new AnalyticsBridge(analyticsOptions);
  assert(
    tainted.ingest({
      id: "packet-tainted",
      type: "system.tick",
      timestamp: Date.now(),
      payload: { tick: 2, running: true, transcript: "must-not-survive", preciseLocation: "must-not-survive" }
    }) === null,
    "Approved event names must still reject undeclared or prohibited payload properties."
  );
  assert(tainted.getDropCounts()["invalid-payload"] === 1, "Tainted allowlisted event must be counted as an invalid payload.");
  assert(tainted.peek().length === 0, "Rejected analytics payload must never enter the buffer.");

  const invalidTimestamp = new AnalyticsBridge(analyticsOptions);
  assert(
    invalidTimestamp.ingest({ id: "packet-invalid-time", type: "system.tick", timestamp: Number.NaN, payload: { tick: 2, running: true } }) === null,
    "Analytics must reject non-finite packet timestamps."
  );
  assert(invalidTimestamp.getDropCounts()["invalid-payload"] === 1, "Invalid packet timestamps must be counted as invalid payloads.");

  const minimized = new AnalyticsBridge(analyticsOptions);
  const minimizedEvent = minimized.ingest({
    id: "packet-minimized",
    type: "system.tick",
    timestamp: Date.now(),
    payload: { tick: 2, running: true }
  });
  assert(minimizedEvent !== null, "Approved event with exact allowlisted metrics should be accepted.");
  const minimizedJson = JSON.stringify(minimizedEvent);
  for (const prohibitedField of ANALYTICS_PROHIBITED_FIELDS) {
    assert(!minimizedJson.includes(`\"${prohibitedField}\"`), `Accepted analytics event must not retain prohibited field ${prohibitedField}.`);
  }
  assert(!minimizedJson.includes("packet-minimized"), "Accepted analytics event must not retain the communication packet identifier.");
  assert(!("raw" in minimizedEvent), "Accepted analytics event must never expose a raw packet field.");

  const revoked = new AnalyticsBridge(analyticsOptions);
  assert(
    revoked.ingest({ id: "packet-before-revocation", type: "system.tick", timestamp: Date.now(), payload: { tick: 3, running: true } }) !== null,
    "Consented analytics event should be buffered before revocation."
  );
  assert(revoked.peek().length === 1, "Expected one buffered event before revocation.");
  assert(revoked.setConsent("denied") === 1, "Revocation must clear buffered analytics events.");
  assert(revoked.peek().length === 0, "No buffered analytics event may survive revocation.");
  assert(
    revoked.ingest({ id: "packet-after-revocation", type: "system.tick", timestamp: Date.now(), payload: { tick: 4, running: true } }) === null,
    "Analytics must reject new events after consent revocation."
  );

  const unexpectedConsent = new AnalyticsBridge(analyticsOptions);
  assert(
    unexpectedConsent.ingest({ id: "packet-before-invalid-consent", type: "system.tick", timestamp: Date.now(), payload: { tick: 5, running: true } }) !== null,
    "Expected one buffered event before invalid runtime consent."
  );
  assert(
    unexpectedConsent.setConsent("unexpected-runtime-value" as AnalyticsConsent) === 1,
    "Any runtime consent value other than explicit granted must clear buffered analytics events."
  );
  assert(unexpectedConsent.peek().length === 0, "Invalid runtime consent must leave no buffered analytics events.");
  assert(
    unexpectedConsent.ingest({ id: "packet-after-invalid-consent", type: "system.tick", timestamp: Date.now(), payload: { tick: 6, running: true } }) === null,
    "Invalid runtime consent must reject later analytics events."
  );

  const tempDirectory = mkdtempSync(path.join(tmpdir(), "urai-v50-smoke-"));
  try {
    const loop = await createSystemLoop({ tickIntervalMs: 1000, replayLimit: 25, analytics: analyticsOptions });
    await loop.engine.emit("smoke.boot", { startedAt: Date.now(), purpose: "system-loop-runtime-smoke", transcript: "must-not-survive" }, "system-loop-smoke");
    const result = await loop.runOnce();
    assert(result.snapshot.totalNodes > 0, "Expected memory graph nodes.");
    assert(result.timeline.totalFrames > 0, "Expected replay frames.");
    assert(result.prediction.id, "Expected prediction id.");
    assert(result.frame.id, "Expected XR frame id.");
    assert(result.packets.length > 0, "Expected communication packets.");
    assert(result.analyticsEvents.length > 0, "Expected explicitly enabled, consented analytics events.");
    assert(result.analyticsEvents.every((event) => !("raw" in event)), "Runtime analytics events must not retain raw packets.");
    assert(!JSON.stringify(result.analyticsEvents).includes("system-loop-runtime-smoke"), "Runtime analytics output must not retain smoke payload text.");
    assert(result.analyticsDropCounts["invalid-payload"] > 0, "Runtime must reject allowlisted event names whose payload contains undeclared properties.");
    assert(!("lastAnalyticsEvents" in result.state), "Persistable SystemLoop state must not retain analytics events.");
    assert(!("lastPackets" in result.state), "Persistable SystemLoop state must not retain raw communication packets.");

    const persistencePath = path.join(tempDirectory, "runtime-state.json");
    const persistence = new PersistenceManager<SystemLoopState>({ filePath: persistencePath });
    persistence.save(result.state);
    const persistedSource = readFileSync(persistencePath, "utf8");
    assert(!persistedSource.includes("lastAnalyticsEvents"), "Persisted runtime state must not contain analytics event history.");
    assert(!persistedSource.includes("lastPackets"), "Persisted runtime state must not contain raw packet history.");
    assert(!persistedSource.includes("system-loop-runtime-smoke"), "Persisted runtime state must not contain raw smoke payload text.");
    assert(!persistedSource.includes("must-not-survive"), "Persisted runtime state must not contain sensitive smoke payload content.");
    const persisted = persistence.load();
    assert(persisted !== null, "Expected persisted state.");
    assert(persisted.totalRuns === result.state.totalRuns, "Persisted run count mismatch.");

    const restored = await createSystemLoop({ tickIntervalMs: 1000, replayLimit: 25, initialState: persisted, analytics: analyticsOptions });
    const restoredResult = await restored.runOnce();
    assert(restoredResult.state.totalRuns === result.state.totalRuns + 1, "Restored run count did not continue.");
    assert(!("lastAnalyticsEvents" in restoredResult.state), "Restored runtime state must not recreate persisted analytics history.");
    assert(!("lastPackets" in restoredResult.state), "Restored runtime state must not recreate raw packet history.");
    loop.stop();
    restored.stop();

    console.log("SystemLoop smoke passed", {
      memoryNodes: result.snapshot.totalNodes,
      replayFrames: result.timeline.totalFrames,
      predictionCandidates: result.prediction.candidates.length,
      xrObjects: result.frame.objects.length,
      analyticsEvents: result.analyticsEvents.length,
      analyticsDrops: result.analyticsDropCounts,
      persistedRuns: persisted.totalRuns,
      restoredRuns: restoredResult.state.totalRuns,
      persistenceOutsideRepository: !isInsideRepository(defaultPersistence.getPath()),
    });
  } finally {
    rmSync(tempDirectory, { recursive: true, force: true });
  }
}

void main().catch((error) => { console.error("SystemLoop smoke failed", error); process.exitCode = 1; });
