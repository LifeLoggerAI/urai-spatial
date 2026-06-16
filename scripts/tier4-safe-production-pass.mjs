import fs from 'node:fs';
import path from 'node:path';

function write(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
  console.log(`wrote ${file}`);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, json) {
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + '\n');
  console.log(`updated ${file}`);
}

const branch = process.env.BRANCH_NAME || '';
if (!branch.includes('tier4')) {
  console.error(`Refusing to run Tier4 implementation outside a tier4 branch. Current branch: ${branch}`);
  process.exit(1);
}

write('urai-tier1/src/lib/tier4-production-contract.ts', `export type Tier4CapabilityStatus =
  | "local-verified"
  | "provider-gated"
  | "credential-blocked"
  | "disabled-until-validated";

export type Tier4Capability = {
  id: string;
  label: string;
  status: Tier4CapabilityStatus;
  route: string;
  api: string;
  dataSource: string;
  externalDependency: string;
  privacyBoundary: string;
  fallback: string;
  verification: string[];
};

export const tier4Capabilities: Tier4Capability[] = [
  {
    id: "tier4-command-center",
    label: "Tier 4 Command Center",
    status: "local-verified",
    route: "/tier4",
    api: "/api/system/tier4",
    dataSource: "Static contract plus repo evidence",
    externalDependency: "None for local fallback",
    privacyBoundary: "No private user records or raw memory data are rendered.",
    fallback: "Static readiness matrix remains usable without providers.",
    verification: ["typecheck", "production-build", "route-smoke", "copy-gate"],
  },
  {
    id: "tier4-system-contract",
    label: "System-of-systems contract",
    status: "provider-gated",
    route: "/tier4",
    api: "/api/system/tier4",
    dataSource: "Contract documentation and existing system APIs",
    externalDependency: "urai-studio, analytics, content, jobs, and asset pipeline are contract-only until connected and validated.",
    privacyBoundary: "External providers must be consent-gated and must not expose secrets or private memory.",
    fallback: "Missing providers are represented as gated dependencies, not active capabilities.",
    verification: ["contract-test", "source-integrity", "spatial-copy"],
  },
  {
    id: "tier4-commerce-entitlement",
    label: "Commerce and entitlement boundary",
    status: "credential-blocked",
    route: "/tier4",
    api: "/api/entitlement",
    dataSource: "Existing entitlement and Stripe route surfaces",
    externalDependency: "Stripe/Firebase credentials and production permissions",
    privacyBoundary: "Entitlement data must be server-governed and never client-escalated.",
    fallback: "Unavailable credentials keep the surface in read-only readiness mode.",
    verification: ["firebase-rules-check", "protected-api-smoke"],
  },
  {
    id: "tier4-xr-provider-boundary",
    label: "XR/provider release boundary",
    status: "disabled-until-validated",
    route: "/spatial/ar-vr",
    api: "/api/xr/signaling",
    dataSource: "Existing launch boundary and XR release matrix",
    externalDependency: "Device/provider validation and compatible browser proof",
    privacyBoundary: "No unsupported immersive, wearable, or body-signal provider is described as active.",
    fallback: "Unsupported provider paths remain disabled or fallback-safe.",
    verification: ["xr-release-matrix", "launch-boundary-contract", "browser-e2e-when-runtime-available"],
  },
];

export const tier4ReleaseBoundary = {
  tier: "tier4",
  status: "production-gated",
  liveDeploymentClaimed: false,
  browserProofClaimed: false,
  publicRoute: "/tier4",
  systemApi: "/api/system/tier4",
  lowerTierProtection: ["tier1", "tier2", "tier3"],
  releaseRules: [
    "Tier 1, Tier 2, and Tier 3 gates must stay passing before Tier 4 is locked.",
    "Unavailable providers must degrade to explicit gated or fallback states.",
    "No raw private data, secrets, service accounts, tokens, or privileged provider details may render publicly.",
    "Live deployment requires Firebase credentials, project permission, deploy output, and live smoke evidence.",
    "Browser E2E is only claimed when Playwright runs successfully in a compatible environment.",
  ],
};

export function getTier4SystemContract() {
  return {
    ...tier4ReleaseBoundary,
    capabilities: tier4Capabilities,
    summary:
      "Tier 4 is implemented as a safe production-gated system surface with explicit fallback, entitlement, integration, and provider boundaries.",
  };
}
`);

write('urai-tier1/src/app/api/system/tier4/route.ts', `import { NextResponse } from "next/server";
import { getTier4SystemContract } from "@/lib/tier4-production-contract";

export const dynamic = "force-static";

export function GET() {
  return NextResponse.json(getTier4SystemContract());
}
`);

write('urai-tier1/src/app/tier4/page.tsx', `import { getTier4SystemContract } from "@/lib/tier4-production-contract";

export const metadata = {
  title: "URAI Spatial Tier 4",
  description: "Production-gated Tier 4 readiness surface with explicit provider and deployment boundaries.",
};

export default function Tier4Page() {
  const contract = getTier4SystemContract();

  return (
    <main className="min-h-screen bg-[#05030b] px-6 py-10 text-white">
      <section className="mx-auto max-w-6xl">
        <p className="text-sm uppercase tracking-[0.35em] text-cyan-200/80">URAI Spatial</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-6xl">
          Tier 4 production gate
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-white/72">
          Tier 4 is wired as a safe readiness layer: contracts, entitlement boundaries,
          integration seams, fallback states, and release evidence stay visible without
          claiming unavailable providers or live deployment.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
            <p className="text-sm text-white/55">Release status</p>
            <strong className="mt-2 block text-2xl">{contract.status}</strong>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
            <p className="text-sm text-white/55">Live deployment claimed</p>
            <strong className="mt-2 block text-2xl">{contract.liveDeploymentClaimed ? "yes" : "no"}</strong>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
            <p className="text-sm text-white/55">Browser proof claimed</p>
            <strong className="mt-2 block text-2xl">{contract.browserProofClaimed ? "yes" : "no"}</strong>
          </div>
        </div>

        <section className="mt-10 grid gap-5">
          {contract.capabilities.map((capability) => (
            <article
              key={capability.id}
              className="rounded-3xl border border-white/10 bg-white/[0.045] p-6 shadow-2xl shadow-cyan-950/20"
              data-tier4-capability={capability.id}
              data-tier4-status={capability.status}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-cyan-200/70">{capability.status}</p>
                  <h2 className="mt-2 text-2xl font-semibold">{capability.label}</h2>
                </div>
                <code className="rounded-full border border-white/10 px-3 py-1 text-sm text-white/70">
                  {capability.route}
                </code>
              </div>

              <dl className="mt-5 grid gap-4 md:grid-cols-2">
                <div>
                  <dt className="text-sm text-white/45">Data source</dt>
                  <dd className="mt-1 text-white/78">{capability.dataSource}</dd>
                </div>
                <div>
                  <dt className="text-sm text-white/45">External dependency</dt>
                  <dd className="mt-1 text-white/78">{capability.externalDependency}</dd>
                </div>
                <div>
                  <dt className="text-sm text-white/45">Privacy boundary</dt>
                  <dd className="mt-1 text-white/78">{capability.privacyBoundary}</dd>
                </div>
                <div>
                  <dt className="text-sm text-white/45">Fallback</dt>
                  <dd className="mt-1 text-white/78">{capability.fallback}</dd>
                </div>
              </dl>
            </article>
          ))}
        </section>

        <section className="mt-10 rounded-3xl border border-amber-200/20 bg-amber-200/[0.06] p-6">
          <h2 className="text-2xl font-semibold">Release rules</h2>
          <ul className="mt-4 space-y-3 text-white/76">
            {contract.releaseRules.map((rule) => (
              <li key={rule}>• {rule}</li>
            ))}
          </ul>
        </section>
      </section>
    </main>
  );
}
`);

write('urai-tier1/tests/tier4-production-contract.test.mjs', `import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const contract = fs.readFileSync(new URL('../src/lib/tier4-production-contract.ts', import.meta.url), 'utf8');
const page = fs.readFileSync(new URL('../src/app/tier4/page.tsx', import.meta.url), 'utf8');
const route = fs.readFileSync(new URL('../src/app/api/system/tier4/route.ts', import.meta.url), 'utf8');

test('Tier4 contract exposes safe production-gated capability matrix', () => {
  for (const id of [
    'tier4-command-center',
    'tier4-system-contract',
    'tier4-commerce-entitlement',
    'tier4-xr-provider-boundary',
  ]) {
    assert.match(contract, new RegExp(id), \`missing capability \${id}\`);
  }

  assert.match(contract, /status: "production-gated"/);
  assert.match(contract, /liveDeploymentClaimed: false/);
  assert.match(contract, /browserProofClaimed: false/);
  assert.match(contract, /lowerTierProtection: \\["tier1", "tier2", "tier3"\\]/);
});

test('Tier4 route and page are wired without private data assumptions', () => {
  assert.match(route, /getTier4SystemContract/);
  assert.match(route, /NextResponse\\.json/);
  assert.match(page, /Tier 4 production gate/);
  assert.match(page, /data-tier4-capability/);
  assert.match(page, /Live deployment claimed/);
  assert.doesNotMatch(page, /process\\.env/);
  assert.doesNotMatch(page, /serviceAccount|private_key|secret/i);
});

test('Tier4 copy keeps provider and deployment claims gated', () => {
  assert.match(contract, /Unavailable providers must degrade/);
  assert.match(contract, /Live deployment requires Firebase credentials/);
  assert.match(contract, /Browser E2E is only claimed when Playwright runs successfully/);
  assert.doesNotMatch(contract, /live AR|live WebXR|live XR|production XR/i);
  assert.doesNotMatch(page, /live AR|live WebXR|live XR|production XR/i);
});
`);

const rootPkg = readJson('package.json');
rootPkg.scripts = rootPkg.scripts || {};
rootPkg.scripts['tier4:production:check'] = 'node urai-tier1/tests/tier4-production-contract.test.mjs && node scripts/run-pnpm.mjs tier4:check && node scripts/run-pnpm.mjs urai:tier4';
writeJson('package.json', rootPkg);

write('docs/tier4/TIER4_COMPLETION_MATRIX.md', `# Tier 4 Completion Matrix

Generated from the Tier 4 safe production-gated implementation pass.

## Scope

Tier 4 is implemented as a production-gated command and contract layer. It does not claim unavailable live providers or deployment that has not been verified.

| Feature | Route / API | Status | Data source | External dependency | Privacy / security boundary | Test coverage | Deployment readiness |
|---|---|---:|---|---|---|---|---|
| Tier 4 Command Center | \`/tier4\`, \`/api/system/tier4\` | local-verified | static contract plus repo evidence | none for fallback | no raw private records rendered | contract test, build | ready for configured deploy |
| System-of-systems contract | \`/api/system/tier4\` | provider-gated | docs and existing APIs | urai-studio, analytics, content, jobs, asset pipeline | providers must be consent-gated and secret-free | contract test, copy gate | blocked until external providers are connected |
| Commerce and entitlement boundary | \`/api/entitlement\` | credential-blocked | existing entitlement/Stripe surfaces | Stripe/Firebase credentials | server-governed entitlement only | protected API smoke, rules check | blocked without production credentials |
| XR/provider boundary | \`/spatial/ar-vr\`, \`/api/xr/signaling\` | disabled-until-validated | launch boundary and release matrix | compatible browser/device/provider validation | unsupported provider claims remain disabled or fallback-safe | release matrix, launch boundary | blocked until real device/browser proof |

## Release decision

Tier 4 can be treated as locally implemented and production-gated only after the verification ladder passes on this branch. Live deployment requires deploy credentials and live smoke evidence.
`);

write('docs/tier4/TIER4_INTEGRATION_CONTRACT.md', `# Tier 4 Integration Contract

## Purpose

Tier 4 coordinates the URAI Spatial product layer with external system surfaces while preserving safe fallbacks.

## Local surfaces

- Public page: \`/tier4\`
- System API: \`/api/system/tier4\`
- Existing entitlement boundary: \`/api/entitlement\`
- Existing provider boundary: \`/api/system/launch-boundary\`
- Existing XR boundary: \`/api/xr/signaling\`

## External dependencies

| Dependency | Tier 4 expectation | Current release posture |
|---|---|---|
| urai-studio | Contracted handoff only until provider wiring is verified | provider-gated |
| analytics | Aggregate-only readiness; no private raw stream exposed | provider-gated |
| urai-content | Content pipeline contract only until connected | provider-gated |
| urai-jobs | Job orchestration contract only until connected | provider-gated |
| asset-factory | Deferred and gated asset pipeline contract only | provider-gated |
| B2B / enterprise surfaces | Contract-only until auth, tenancy, billing, and privacy review pass | credential-blocked |
| Firebase / Firestore | Server-governed entitlement and consent boundaries | credential-blocked without deploy credentials |
| Stripe | Entitlement updates through protected server routes only | credential-blocked without secrets |

## Fallback rules

- Missing providers must return explicit fallback or gated status.
- No unsupported immersive, wearable, body-signal, private-memory, or asset pipeline capability is represented as active.
- No service accounts, tokens, secrets, or private memory data may be committed or rendered.
- Live deployment requires Firebase project permissions, deploy output, live URL, and live smoke evidence.
`);

write('docs/release-evidence/tier4/TIER4_IMPLEMENTATION_EVIDENCE.md', `# Tier 4 Implementation Evidence

Generated: ${new Date().toISOString()}

## Implemented surfaces

- \`/tier4\`
- \`/api/system/tier4\`
- \`urai-tier1/src/lib/tier4-production-contract.ts\`
- \`urai-tier1/tests/tier4-production-contract.test.mjs\`

## Release posture

Tier 4 is implemented as a safe production-gated expansion layer. It does not claim live deployment, browser proof, unavailable providers, private-memory sync, XR provider readiness, enterprise tenancy, or commerce activation without credentials and live smoke evidence.

## Verification

The final command output and log file for this pass are the source of truth for pass/fail status.
`);
