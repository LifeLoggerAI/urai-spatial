#!/usr/bin/env node

const host = (process.env.HOST || "https://urai.app").replace(/\/$/, "");

const cases = [
  {
    path: "/",
    expected: ["You are standing at the threshold", "Ground", "Life Map"],
  },
  {
    path: "/home",
    expected: ["Own your life", "Step inside yourself", "Orb companion"],
  },
  {
    path: "/ground",
    expected: ["Your private floor is open", "Privacy sanctuary", "Logistics bay"],
  },
  {
    path: "/life-map",
    expected: ["Your memory constellation is online", "The Quiet Reset", "Enter Focus"],
  },
  {
    path: "/focus?memoryId=quiet-reset",
    expected: ["Selected memory chamber", "The Quiet Reset", "Enter Replay"],
  },
  {
    path: "/replay?memoryId=quiet-reset&manifestId=replay-recovery-thread",
    expected: ["Cinematic memory film", "Replay the thread", "Open Mirror"],
  },
  {
    path: "/mirror",
    expected: ["See the pattern clearly", "Pattern intelligence", "Consent layer"],
  },
  {
    path: "/passport",
    expected: ["Your life stays yours", "Identity", "Provenance", "Portability"],
  },
  {
    path: "/status",
    expected: ["Evidence Control Room", "Production certification pending", "Certification boundary"],
    forbidden: ["World online. Route matrix visible", "Primary Live"],
  },
  {
    path: "/privacy-controls",
    expected: ["URAI Privacy Controls", "Choose what the world can hold", "Model access"],
    forbidden: ["Home threshold", "The ground opens your private real-life world"],
  },
  {
    path: "/location-map",
    expected: ["Location Map", "Emotional weather over private places", "Memory fog"],
  },
  {
    path: "/ascent",
    expected: ["Rise into the Life Map", "sky portal active", "Enter Life Map"],
  },
];

const normalizePath = (value) => {
  const normalized = value.replace(/\/+$/, "");
  return normalized || "/";
};

const results = [];
let failed = false;

for (const testCase of cases) {
  const requested = new URL(testCase.path, `${host}/`);
  const response = await fetch(requested, {
    redirect: "follow",
    headers: {
      accept: "text/html",
      "cache-control": "no-cache",
      "user-agent": "URAI-release-fingerprint-smoke/1.0",
    },
  });
  const body = await response.text();
  const finalUrl = new URL(response.url);

  const missing = testCase.expected.filter((value) => !body.includes(value));
  const forbidden = (testCase.forbidden || []).filter((value) => body.includes(value));
  const pathPreserved = normalizePath(finalUrl.pathname) === normalizePath(requested.pathname);
  const queryPreserved = [...requested.searchParams.entries()].every(
    ([key, value]) => finalUrl.searchParams.get(key) === value
  );
  const passed =
    response.ok &&
    response.status === 200 &&
    missing.length === 0 &&
    forbidden.length === 0 &&
    pathPreserved &&
    queryPreserved;

  if (!passed) failed = true;

  results.push({
    requested: requested.toString(),
    finalUrl: finalUrl.toString(),
    status: response.status,
    passed,
    pathPreserved,
    queryPreserved,
    missing,
    forbidden,
  });
}

console.log(
  JSON.stringify(
    {
      schemaVersion: "urai-live-route-fingerprint-smoke-1",
      host,
      checkedAt: new Date().toISOString(),
      total: results.length,
      passed: results.filter((result) => result.passed).length,
      failed: results.filter((result) => !result.passed).length,
      results,
    },
    null,
    2
  )
);

if (failed) process.exitCode = 1;
