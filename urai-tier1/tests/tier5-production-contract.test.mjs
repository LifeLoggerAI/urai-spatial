import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const contract = fs.readFileSync(new URL("../src/lib/tier5-production-contract.ts", import.meta.url), "utf8");
const page = fs.readFileSync(new URL("../src/app/tier5/page.tsx", import.meta.url), "utf8");
const route = fs.readFileSync(new URL("../src/app/api/system/tier5/route.ts", import.meta.url), "utf8");

test("Tier5 contract exposes final release gated capability matrix", () => {
  for (const id of [
    "tier5-command-surface",
    "tier5-replay-lock",
    "tier5-legacy-mirror",
    "tier5-ecosystem-contracts",
    "tier5-commerce-provider-boundary",
  ]) {
    assert.match(contract, new RegExp(id), `missing capability ${id}`);
  }

  assert.match(contract, /status: "production-gated"/);
  assert.match(contract, /deploymentClaimed: false/);
  assert.match(contract, /browserE2EClaimed: false/);
  assert.match(contract, /lowerTierProtection: \["tier1", "tier2", "tier3", "tier4"\]/);
});

test("Tier5 route and page are wired without private data assumptions", () => {
  assert.match(route, /getTier5SystemContract/);
  assert.match(route, /NextResponse\.json/);
  assert.match(page, /Tier 5 final release gate/);
  assert.match(page, /data-tier5-capability/);
  assert.match(page, /Deployment claimed/);
  assert.doesNotMatch(page, /process\.env/);
  assert.doesNotMatch(page, /serviceAccount|private_key|token|secret/i);
});

test("Tier5 copy keeps deployment and provider claims gated", () => {
  assert.match(contract, /Unavailable external systems/);
  assert.match(contract, /Deployment requires credentials/);
  assert.match(contract, /Browser E2E is claimed only when Playwright runs successfully/);
  assert.doesNotMatch(contract, /live AR|live WebXR|live XR|Quest production|VisionOS production/i);
  assert.doesNotMatch(page, /live AR|live WebXR|live XR|Quest production|VisionOS production/i);
});
