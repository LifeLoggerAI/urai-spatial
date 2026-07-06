#!/usr/bin/env node

import { rmSync } from "node:fs";
import { spawnSync } from "node:child_process";

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32"
  });

  if (result.status !== 0) process.exit(result.status ?? 1);
}

rmSync("dist-runtime", { recursive: true, force: true });
run("pnpm", [
  "exec",
  "tsc",
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
  "--outDir",
  "dist-runtime",
  "--rootDir",
  "src",
  "src/smoke/systemLoopSmoke.ts"
]);
run("node", ["dist-runtime/smoke/systemLoopSmoke.js"]);
