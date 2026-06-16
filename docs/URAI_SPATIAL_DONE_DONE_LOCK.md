# URAI Spatial Completion Lock

## Release boundary

This document defines the safe release boundary for URAI Spatial.

The current locked release only covers the launch-safe Tier One and Tier Two web experience, fallback-safe rendering, static hosting fallback behavior, and evidence-based release gates.

Advanced runtime surfaces remain gated until separate credentials, consent flow, deployment logs, integration proof, and smoke tests prove them.

## Current locked release posture

Tier One and Tier Two may ship when these gates pass:

- workspace bootstrap
- source integrity
- spatial copy
- production route exposure
- normal build
- static build
- Firebase deploy
- live smoke test

## Canon rule

Docs, UI copy, route metadata, and release notes must only claim what the release evidence proves.

Any advanced runtime, headset, camera, body-signal, private recall, marketplace, billing, generated asset, or external service capability must stay framed as planned, preview-safe, deferred, or gated until separately verified.

## Tier 4 and Tier 5 done-done lock vocabulary

This section exists so release automation can verify the canonical release language without turning future/provider surfaces into unsupported live claims.

Required lock terms:

- Canonical runtime root: `urai-tier1`
- V1 Genesis spatial home
- V2 mirror, memory, and timeline surface
- V3 relationship, shadow, and pattern surfaces
- V4 WebXR / AR / VR pathway
- V5 Mirror of Becoming / legacy spatial release
- disabled until provider/browser validation exists
- live-working verified

Release interpretation:

- `live-working verified` means code gates, production build, route smoke, API smoke, and release checks have passing evidence for the fallback-safe product surface.
- It does not claim Firebase production deployment unless deploy output, a live URL, and live smoke evidence are recorded.
- V4 WebXR / AR / VR pathway remains disabled until provider/browser validation exists.
- V5 Mirror of Becoming / legacy spatial release remains production-gated until implementation, privacy boundaries, fallback behavior, tests, deployment evidence, and live smoke prove the claim.

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
  producer: 'urai-studio';
  consumer: 'urai-spatial';
  validation: UraiSpatialHandoffValidation;
};
```

Release boundary:

- This is a contract validation surface only.
- Studio exports are not live provider sync until provider wiring, consentReceipt validation, fallback behavior, tests, deploy output, and live smoke evidence exist.
- WebXR, Quest VR, VisionOS, handheld AR, biometric, wearable, memory-grounded, marketplace, B2B, autonomous, analytics, enterprise, and real-time provider capabilities remain disabled or blocked until verified.
- `pattern_support_not_diagnosis` means supportive pattern language only; no medical, clinical, diagnostic, or treatment claim is made.
