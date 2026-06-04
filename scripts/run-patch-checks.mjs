#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const steps = [
  {
    name: "Verify production routes",
    command: ["node", "scripts/check-production-route-exposure.mjs"],
  },
  {
    name: "Verify privacy defaults",
    command: ["node", "scripts/run-pnpm.mjs", "firebase:rules:check"],
  },
  {
    name: "Run unit tests if available",
    command: ["node", "scripts/run-pnpm.mjs", "test:unit"],
    optional: true,
  },
  {
    name: "Run smoke test",
    command: ["node", "scripts/run-pnpm.mjs", "smoke"],
    optional: true,
  },
  {
    name: "Run build",
    command: ["node", "scripts/run-pnpm.mjs", "build"],
    skipWhen: () => process.env.URAI_PATCH_CHECK_SKIP_BUILD === "true",
  },
];

let failed = false;

for (const step of steps) {
  if (step.skipWhen?.()) {
    console.log(`Skipping: ${step.name}`);
    continue;
  }

  console.log(`Running: ${step.name}`);
  const [cmd, ...args] = step.command;
  const result = spawnSync(cmd, args, { stdio: "inherit" });

  if (result.status === 0) {
    continue;
  }

  if (step.optional) {
    console.warn(`Optional patch check did not pass: ${step.name}`);
    continue;
  }

  failed = true;
  console.error(`Patch check failed: ${step.name}`);
  break;
}

if (failed) {
  process.exit(1);
}

console.log("Patch checks complete.");
