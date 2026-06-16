import { spawnSync } from "node:child_process";

const forbidden = [
  "tests/replay-tier5-lock.mjs",
  "playwright",
  "next dev",
  "urai:tier5",
];

const steps = [
  ["tier5 contract test", "node", ["urai-tier1/tests/tier5-production-contract.test.mjs"]],
  ["tier5 governance", "node", ["scripts/check-tier5-governance.mjs"]],
];

for (const word of forbidden) {
  const joined = steps.map(([, command, args]) => [command, ...args].join(" ")).join("\n");
  if (joined.includes(word)) {
    console.error(`tier5-local-production: forbidden browser/full-lock dependency found: ${word}`);
    process.exit(1);
  }
}

for (const [name, command, args] of steps) {
  console.log(`\n=== ${name} ===`);
  const result = spawnSync(command, args, { stdio: "inherit", env: process.env });
  const code = result.status ?? 1;
  console.log(`=== ${name}: ${code} ===`);

  if (code !== 0) {
    console.error("tier5-local-production: failed");
    process.exit(code);
  }
}

console.log("tier5-local-production: passed");
