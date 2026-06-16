# URAI_STUDIO_SPATIAL_HANDOFF_CONTRACT

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
