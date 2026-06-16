export type Tier5ReadinessStatus =
  | "local-verified"
  | "contract-gated"
  | "credential-blocked"
  | "disabled-until-validated";

export type Tier5Capability = {
  id: string;
  label: string;
  status: Tier5ReadinessStatus;
  route: string;
  api: string;
  source: string;
  dependency: string;
  privacyBoundary: string;
  fallback: string;
  verification: string[];
};

export const tier5Capabilities: Tier5Capability[] = [
  {
    id: "tier5-command-surface",
    label: "Tier 5 command surface",
    status: "local-verified",
    route: "/tier5",
    api: "/api/system/tier5",
    source: "Static release contract and repo evidence",
    dependency: "None for fallback-safe local display",
    privacyBoundary: "No private user records, secrets, or raw personal data are rendered.",
    fallback: "Read-only readiness matrix remains available without external services.",
    verification: ["contract-test", "typecheck", "production-build", "route-smoke"],
  },
  {
    id: "tier5-replay-lock",
    label: "Replay Tier 5 lock",
    status: "local-verified",
    route: "/replay",
    api: "/api/system/tier5",
    source: "Existing replay lock tests and release evidence",
    dependency: "Browser E2E proof is environment dependent",
    privacyBoundary: "Replay surfaces must use public-safe or fallback-safe data only.",
    fallback: "Replay routes stay available through static/fallback experiences.",
    verification: ["test:replay-tier5", "production-build", "release:p1"],
  },
  {
    id: "tier5-legacy-mirror",
    label: "Legacy and mirror spatial release boundary",
    status: "contract-gated",
    route: "/spatial/legacy",
    api: "/api/system/tier5",
    source: "Existing legacy, mirror, dream, ascent, council, and spatial route surfaces",
    dependency: "Full provider wiring remains outside this local fallback release",
    privacyBoundary: "No external provider state is represented as active.",
    fallback: "Routes remain static, read-only, or provider-gated until verified.",
    verification: ["tier5:check", "urai:tier5", "copy-gate"],
  },
  {
    id: "tier5-ecosystem-contracts",
    label: "System-of-systems contract boundary",
    status: "contract-gated",
    route: "/tier5",
    api: "/api/system/tier5",
    source: "Docs and integration contract files",
    dependency: "URAI app/core, jobs, content, asset factory, studio, analytics, business portal",
    privacyBoundary: "External systems require explicit consent, auth, entitlement, and deployment review.",
    fallback: "Unavailable systems are listed as blocked or contract-only, not active.",
    verification: ["integration-doc", "release-evidence", "source-integrity"],
  },
  {
    id: "tier5-commerce-provider-boundary",
    label: "Commerce, entitlement, and provider boundary",
    status: "credential-blocked",
    route: "/api/entitlement",
    api: "/api/system/tier5",
    source: "Existing entitlement and protected API surfaces",
    dependency: "Firebase, Stripe, provider credentials, and production permission",
    privacyBoundary: "Privileged mutation must remain server-governed.",
    fallback: "Credential-free mode remains read-only and does not activate paid capability.",
    verification: ["firebase-rules-check", "protected-api-smoke", "deploy-smoke-when-credentials-exist"],
  },
];

export const tier5ReleaseBoundary = {
  tier: "tier5",
  status: "production-gated",
  publicRoute: "/tier5",
  systemApi: "/api/system/tier5",
  lowerTierProtection: ["tier1", "tier2", "tier3", "tier4"],
  deploymentClaimed: false,
  browserE2EClaimed: false,
  releaseRules: [
    "Tier 1 through Tier 4 checks must stay passing before Tier 5 is locked.",
    "Unavailable external systems must remain disabled, blocked, or fallback-safe.",
    "No private records, secrets, tokens, service accounts, or raw personal data may be rendered.",
    "Deployment requires credentials, deploy output, a live URL, and live smoke evidence.",
    "Browser E2E is claimed only when Playwright runs successfully in CI or a compatible runtime.",
  ],
};

export function getTier5SystemContract() {
  return {
    ...tier5ReleaseBoundary,
    capabilities: tier5Capabilities,
    summary:
      "Tier 5 is implemented as a production-gated final release surface with explicit lower-tier protection, replay lock, system contract, entitlement, and deployment boundaries.",
  };
}
