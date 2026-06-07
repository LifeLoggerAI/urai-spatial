import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const repoRoot = process.cwd();
const appRoot = join(repoRoot, "urai-tier1");
const srcRoot = join(appRoot, "src");

const allowedDebugContexts = [
  "dev",
  "debug",
  "demo",
  "test",
  "fallback",
  "admin",
  "storybook",
  "README",
  "docs",
  "UraiV1Experience.tsx",
];

const blockedPhrases = [
  "lorem ipsum",
  "V1 preview",
  "placeholder copy",
  "mock data active",
];

function walk(dir, files = []) {
  if (!existsSync(dir)) return files;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) walk(full, files);
    else if (/\.(ts|tsx|js|jsx|mjs)$/.test(name)) files.push(full);
  }
  return files;
}

function isAllowedContext(file) {
  const normalized = file.replace(/\\/g, "/");
  const lower = normalized.toLowerCase();
  return allowedDebugContexts.some((part) => lower.includes(part.toLowerCase()));
}

for (const file of walk(srcRoot)) {
  if (isAllowedContext(file)) continue;
  const text = readFileSync(file, "utf8");
  for (const phrase of blockedPhrases) {
    assert.equal(
      text.includes(phrase),
      false,
      `${file} contains blocked Genesis-mode debug phrase: ${phrase}`,
    );
  }
}

console.log("URAI no-debug-copy canon passed: blocked Genesis-mode phrases were not found in primary protected source files.");
