# Tier 4 Studio Handoff Live Check Fix Evidence

Generated: 2026-06-16T20:32:15.895Z

## Fixed blocker

The Studio to Spatial handoff contract now contains the release-validation terms required by `live:check`:

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

## Safety boundary

This fix records contract vocabulary only. It does not claim live Studio sync, live WebXR, Quest VR, VisionOS, handheld AR, biometric, memory-grounded, marketplace, B2B, autonomous, or provider-backed capability.

## Required verification

- `pnpm live:check`
- `pnpm tier4:production:check`
- `pnpm release:p1`
- production build
