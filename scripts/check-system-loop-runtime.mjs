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
  "tsconfig.runtime.json",
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

const tsc = spawnSync(
  "pnpm",
  ["exec", "tsc", "-p", "tsconfig.runtime.json", "--noEmit"],
  {
    stdio: "inherit",
    shell: process.platform === "win32",
  },
);

if (tsc.status !== 0) {
  console.error("SystemLoop TypeScript check failed.");
  process.exit(tsc.status ?? 1);
}

console.log("SystemLoop runtime check passed.");
