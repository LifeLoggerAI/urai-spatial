# Tier 4 Integration Contract

## Purpose

Tier 4 coordinates the URAI Spatial product layer with external system surfaces while preserving safe fallbacks.

## Local surfaces

- Public page: `/tier4`
- System API: `/api/system/tier4`
- Existing entitlement boundary: `/api/entitlement`
- Existing provider boundary: `/api/system/launch-boundary`
- Existing XR boundary: `/api/xr/signaling`

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

## Live release validation terms

This section exists so release automation can verify the Studio to Spatial handoff contract without converting future provider seams into unsupported live claims.

Required terms:

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

### StudioSpatialExport shape

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

### Release interpretation

- This contract does not claim live Studio provider sync.
- This contract does not claim live WebXR, Quest VR, VisionOS, handheld AR, biometric, memory-grounded, marketplace, B2B, or autonomous provider capability.
- Studio exports are accepted only as contract-shaped handoff data until provider wiring, consent, tests, deployment evidence, and live smoke are verified.
- `pattern_support_not_diagnosis` means URAI may display supportive pattern language, not medical, clinical, diagnostic, or treatment claims.

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
