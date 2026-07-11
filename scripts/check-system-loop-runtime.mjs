#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const requiredFiles = [
  "src/index.ts",
  "src/kernel/eventBus.ts",
  "src/kernel/SimulationEngine.ts",
  "src/kernel/SystemLoop.ts",
  "src/kernel/PersistenceManager.ts",
  "src/memory/MemoryGraphPlugin.ts",
  "src/memory/ReplayEngine.ts",
  "src/prediction/PredictionEngine.ts",
  "src/xr/XRRuntime.ts",
  "src/bridges/communicationsBridge.ts",
  "src/bridges/analyticsBridge.ts",
  "src/dashboard/SimulationDashboard.ts",
  "src/smoke/systemLoopSmoke.ts",
  "tsconfig.runtime.json"
];

const missing = requiredFiles.filter((file) => !existsSync(file));
if (missing.length > 0) {
  console.error("SystemLoop runtime check failed. Missing files:");
  for (const file of missing) console.error(`- ${file}`);
  process.exit(1);
}

const runtimeConfig = JSON.parse(readFileSync("tsconfig.runtime.json", "utf-8"));
if (!Array.isArray(runtimeConfig.files) || runtimeConfig.files.length === 0) {
  console.error("SystemLoop runtime check failed: tsconfig.runtime.json must use an explicit files boundary.");
  process.exit(1);
}

const persistenceSource = readFileSync("src/kernel/PersistenceManager.ts", "utf-8");
if (persistenceSource.includes("process.cwd()") || persistenceSource.includes("tmpdir()")) {
  console.error("SystemLoop runtime check failed: default persistence may not write into the repository or an ephemeral temp directory.");
  process.exit(1);
}
if (!persistenceSource.includes("URAI_SIMULATION_STATE_PATH") || !persistenceSource.includes("homedir()")) {
  console.error("SystemLoop runtime check failed: persistence override and durable user-state defaults are required.");
  process.exit(1);
}

const analyticsSource = readFileSync("src/bridges/analyticsBridge.ts", "utf-8");
const analyticsForbidden = [
  /raw\s*:\s*CommunicationPacket/,
  /raw\s*:\s*packet/,
  /payload\s*:\s*packet\.payload/,
  /JSON\.stringify\(packet\.payload/
];
for (const pattern of analyticsForbidden) {
  if (pattern.test(analyticsSource)) {
    console.error(`SystemLoop runtime check failed: analytics retains or serializes raw packet data (${pattern}).`);
    process.exit(1);
  }
}

const analyticsRequired = [
  "ANALYTICS_EVENT_DICTIONARY",
  "ANALYTICS_PROHIBITED_FIELDS",
  "const normalizeEnabled = (value: unknown) => value === true",
  "value === \"granted\" ? \"granted\" : \"denied\"",
  "const normalizeEnvironment = (value: unknown)",
  "const normalizedEnvironment = normalizeEnvironment(runtimeOptions.environment)",
  "this.configurationValid = !this.enabled || normalizedEnvironment !== null",
  "if (!this.configurationValid) return this.drop(\"invalid-configuration\")",
  "unknown-event",
  "invalid-payload",
  "invalid-configuration",
  "setConsent(consent: AnalyticsConsent)",
  "this.consent = normalizeConsent(consent)",
  "return this.consent !== \"granted\" ? this.clearBufferedEvents() : 0",
  "clearBufferedEvents()",
  "getDropCounts()"
];
for (const marker of analyticsRequired) {
  if (!analyticsSource.includes(marker)) {
    console.error(`SystemLoop runtime check failed: analytics fail-closed marker missing: ${marker}`);
    process.exit(1);
  }
}

for (const prohibitedField of [
  "raw",
  "payload",
  "memory",
  "transcript",
  "prompt",
  "preciseLocation",
  "health",
  "bodySignal",
  "biometric",
  "secret",
  "token",
  "directIdentifier",
  "deviceTelemetry"
]) {
  if (!analyticsSource.includes(`\"${prohibitedField}\"`)) {
    console.error(`SystemLoop runtime check failed: prohibited analytics field is not declared: ${prohibitedField}`);
    process.exit(1);
  }
}

const systemLoopSource = readFileSync("src/kernel/SystemLoop.ts", "utf-8");
if (!systemLoopSource.includes("analytics?: AnalyticsBridgeOptions")) {
  console.error("SystemLoop runtime check failed: explicit analytics options are required.");
  process.exit(1);
}
if (!systemLoopSource.includes("event ? [event] : []")) {
  console.error("SystemLoop runtime check failed: rejected analytics packets must be excluded from loop output.");
  process.exit(1);
}
for (const forbiddenStateField of ["lastAnalyticsEvents", "lastPackets"]) {
  if (systemLoopSource.includes(forbiddenStateField)) {
    console.error(`SystemLoop runtime check failed: persistable loop state may not retain ${forbiddenStateField}.`);
    process.exit(1);
  }
}
if (!systemLoopSource.includes("setAnalyticsConsent(consent: AnalyticsConsent)")) {
  console.error("SystemLoop runtime check failed: explicit analytics revocation entry point is required.");
  process.exit(1);
}

const smokeSource = readFileSync("src/smoke/systemLoopSmoke.ts", "utf-8");
for (const marker of [
  "consent: \"granted\"",
  "must not retain raw packets",
  "Only literal boolean true may activate analytics at runtime",
  "Enabled analytics must require an explicit valid runtime environment",
  "Unknown runtime environments must not bypass production identity checks",
  "Null runtime environments must not silently default to development",
  "Analytics must reject non-finite packet timestamps",
  "Unknown event types must be rejected",
  "Revocation must clear buffered analytics events",
  "Any runtime consent value other than explicit granted must clear buffered analytics events",
  "Production analytics must reject events without an exact release SHA",
  "Persistable SystemLoop state must not retain analytics events",
  "Persistable SystemLoop state must not retain raw communication packets",
  "Persisted runtime state must not contain analytics event history",
  "Persisted runtime state must not contain raw packet history",
  "Persisted runtime state must not contain sensitive smoke payload content"
]) {
  if (!smokeSource.includes(marker)) {
    console.error(`SystemLoop runtime check failed: analytics smoke assertion missing: ${marker}`);
    process.exit(1);
  }
}

const tsc = spawnSync("pnpm", ["exec", "tsc", "-p", "tsconfig.runtime.json", "--noEmit"], {
  stdio: "inherit",
  shell: process.platform === "win32"
});

if (tsc.status !== 0) {
  console.error("SystemLoop TypeScript check failed.");
  process.exit(tsc.status ?? 1);
}

console.log("SystemLoop runtime check passed.");
