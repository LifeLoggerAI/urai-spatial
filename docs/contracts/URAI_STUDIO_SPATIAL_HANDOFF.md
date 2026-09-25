# URAI Studio Spatial Handoff Contract

## Release boundary

This contract describes preview-safe handoff behavior between Studio and Spatial.

A handoff package is not proof that an advanced runtime or external service is live.

A handoff package cannot override the gated release matrix.

## Allowed handoff content

A handoff package may include:

- public-safe scene metadata
- labels
- preview-safe asset references
- tier flags
- fallback rendering hints
- non-secret configuration hints

## Blocked handoff content

A handoff package must not include:

- private raw user data
- secrets
- credentials
- unrestricted service tokens
- unsupported service claims
- unsupported device claims
- unsupported advanced runtime claims

## Runtime rule

If a required service or runtime is missing, the app must render fallback-safe web content instead of claiming unavailable behavior.

## Production rule

Production release claims must be based on deployment evidence, integration evidence, consent boundaries, and smoke-test results.

## Studio to Spatial release validation contract

This section is intentionally present for `pnpm live:check`. It documents the handoff vocabulary without claiming that provider sync is live.

Required release-validation terms:

- StudioSpatialExport
- producer: 'urai-studio'
- consumer: 'urai-spatial'
- web-spatial
- webxr-disabled
- quest-vr-disabled
- visionos-disabled
- ar-handheld-disabled
- consentReceipt
- safetyBoundaries
- releaseEvidence
- pattern_support_not_diagnosis
- UraiSpatialHandoffValidation

```ts
export type UraiSpatialHandoffValidation = {
  producer: 'urai-studio';
  consumer: 'urai-spatial';
  runtimeTarget: 'web-spatial';
  webxr: 'webxr-disabled';
  questVr: 'quest-vr-disabled';
  visionOs: 'visionos-disabled';
  arHandheld: 'ar-handheld-disabled';
  consentReceipt: {
    required: true;
    status: 'required-before-provider-sync';
  };
  safetyBoundaries: [
    'pattern_support_not_diagnosis',
    'no_raw_private_memory',
    'no_secret_or_service_account_export',
    'fallback_safe_when_provider_missing'
  ];
};

export type StudioSpatialExport = {
  contractVersion: '0.2.0';
  producer: 'urai-studio';
  consumer: 'urai-spatial';
  validation: UraiSpatialHandoffValidation;
  releaseEvidence: {
    studioBuildSha: string;
    spatialBuildSha: string;
    validatorName: string;
    validatorVersion: '0.2.0';
    validatedAt: string;
    liveSmokeUrl: string;
  };
};
```

Release boundary:

- This is a contract validation surface only.
- Studio exports are not live provider sync until provider wiring, consentReceipt validation, fallback behavior, tests, deploy output, and live smoke evidence exist.
- WebXR, Quest VR, VisionOS, handheld AR, biometric, wearable, memory-grounded, marketplace, B2B, autonomous, analytics, enterprise, and real-time provider capabilities remain disabled or blocked until verified.
- `pattern_support_not_diagnosis` means supportive pattern language only; no medical, clinical, diagnostic, or treatment claim is made.


## 0.2.0 compatibility decision

Version 0.2.0 is a breaking wire-contract revision because `releaseEvidence` is now required by both producer and consumer validators. A 0.1.0 payload is not silently promoted to 0.2.0. This contract remains validation-only and grants no XR, provider, deployment, or live-runtime authority.
