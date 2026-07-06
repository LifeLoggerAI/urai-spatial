#!/usr/bin/env node

import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const requiredFiles = [
  "src/kernel/eventBus.ts",
  "src/kernel/SimulationEngine.ts",
  "src/memory/MemoryGraphPlugin.ts",
  "src/memory/ReplayEngine.ts",
  "src/prediction/PredictionEngine.ts",
  "src/xr/XRRuntime.ts",
  "src/kernel/SystemLoop.ts",
  "src/smoke/systemLoopSmoke.ts"
];

const missing = requiredFiles.filter((file) => !existsSync(file));
if (missing.length > 0) {
  console.error("SystemLoop runtime check failed. Missing files:");
  for (const file of missing) console.error(`- ${file}`);
  process.exit(1);
}

const args = [
  "exec",
  "tsc",
  "--noEmit",
  "--target",
  "ES2022",
  "--module",
  "NodeNext",
  "--moduleResolution",
  "NodeNext",
  "--strict",
  "--esModuleInterop",
  "--skipLibCheck",
  "--types",
  "node",
  "src/smoke/systemLoopSmoke.ts"
];

const tsc = spawnSync("pnpm", args, {
  stdio: "inherit",
  shell: process.platform === "win32"
});

if (tsc.status !== 0) {
  console.error("SystemLoop TypeScript check failed.");
  process.exit(tsc.status ?? 1);
}

console.log("SystemLoop runtime check passed.");
