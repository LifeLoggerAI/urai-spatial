#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const root = process.cwd();
const planPath = path.join(root, "docs/aaa-machine/steering-plan.json");

function exists(p) {
  return fs.existsSync(p);
}

function verdictStatus(file) {
  const p = path.join(root, file);
  if (!exists(p)) return "missing";
  const text = fs.readFileSync(p, "utf8");
  if (/VERDICT:\s*PASS/i.test(text)) return "pass";
  if (/VERDICT:\s*FAIL/i.test(text)) return "fail";
  if (/VERDICT:\s*REVIEW/i.test(text)) return "review";
  return "unknown";
}

if (!exists(planPath)) {
  console.error("Missing docs/aaa-machine/steering-plan.json");
  process.exit(1);
}

const plan = JSON.parse(fs.readFileSync(planPath, "utf8"));
const loops = plan.loops.map((loop) => ({
  id: loop.id,
  title: loop.title,
  runCommand: loop.runCommand,
  verdictFile: loop.verdictFile,
  humanMustJudge: loop.humanMustJudge || [],
  verdict: verdictStatus(loop.verdictFile),
}));

const next = loops.find((loop) => loop.verdict !== "pass") || loops[loops.length - 1];

const report = {
  generatedAt: new Date().toISOString(),
  loops,
  next,
};

console.log("");
console.log("# URAI AAA MACHINE STEERING");
console.log("");
console.log("Loop verdicts:");
for (const loop of loops) console.log(`- ${loop.id}: ${loop.verdict}`);

console.log("");
console.log("NEXT TARGET:");
console.log(`${next.id} — ${next.title}`);

console.log("");
console.log("RUN:");
console.log(next.runCommand);

console.log("");
console.log("HUMAN CHECK AFTER SCREENSHOTS:");
for (const item of next.humanMustJudge) console.log(`- ${item}`);

fs.mkdirSync(path.join(root, "docs/receipts/machine-steering"), { recursive: true });
fs.writeFileSync(
  path.join(root, "docs/receipts/machine-steering/latest.json"),
  JSON.stringify(report, null, 2)
);
