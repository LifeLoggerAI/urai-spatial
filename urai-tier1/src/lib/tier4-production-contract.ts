export type Tier4CapabilityStatus =
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
