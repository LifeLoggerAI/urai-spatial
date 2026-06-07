# URAI Studio to URAI Spatial Handoff Contract

Status: canonical cross-repo handoff contract
Owner repo: `LifeLoggerAI/urai-spatial`
Producer repo: `LifeLoggerAI/urai-studio`
Consumer repo: `LifeLoggerAI/urai-spatial`
Contract version: `0.1.0`

This contract defines how URAI Studio exports spatial scenes and how URAI Spatial consumes them. It is intentionally conservative: Studio may produce richer creative packages, but Spatial must only claim live runtime support for fields validated by this contract and by the Tier/XR release matrix.

## 1. Handoff goal

URAI Studio should be able to export a scene package that URAI Spatial can load as a launch-safe web-spatial experience without exposing private user data, unsupported AR/VR/XR claims, or unvalidated provider dependencies.

## 2. Producer responsibilities: URAI Studio

Studio must produce a `StudioSpatialExport` object with:

- `contractVersion`
- `producer = urai-studio`
- `consumer = urai-spatial`
- `exportId`
- `projectId`
- `tenantId`
- `createdAt`
- `sceneManifest`
- `assetManifest`
- `consentReceipt`
- `safetyBoundaries`
- `runtimeTargets`

Studio must ensure:

- all assets are referenced by URI plus metadata;
- no raw private user data is embedded in the scene manifest;
- every generated asset has a tenant/user scope;
- every export includes a consent receipt;
- every sensitive visual layer is marked as reflective pattern support, not diagnosis or objective certainty;
- AR, VR, XR, Quest, VisionOS, handheld AR, biometric, and provider claims remain disabled unless validation evidence exists.

## 3. Consumer responsibilities: URAI Spatial

Spatial must validate before rendering:

- `contractVersion` is supported;
- `consumer` equals `urai-spatial`;
- `runtimeTargets` includes `web-spatial` for live web rendering;
- all assets use approved URI schemes and safe MIME types;
- consent receipt exists;
- unsupported XR targets are disabled;
- fallback-safe rendering exists when an asset is unavailable.

Spatial must not:

- render private raw data;
- assume provider availability from a Studio export alone;
- claim live WebXR, Quest VR, VisionOS, handheld AR, biometric, or memory-grounded provider status unless release evidence validates it;
- let a Studio export override the Tier/XR release matrix.

## 4. Required StudioSpatialExport shape

```ts
type StudioSpatialExport = {
  contractVersion: '0.1.0';
  producer: 'urai-studio';
  consumer: 'urai-spatial';
  exportId: string;
  projectId: string;
  tenantId: string;
  createdAt: string;
  sceneManifest: UraiSpatialSceneManifest;
  assetManifest: UraiSpatialAssetManifest;
  consentReceipt: UraiSpatialConsentReceipt;
  safetyBoundaries: UraiSpatialSafetyBoundary[];
  runtimeTargets: UraiSpatialRuntimeTarget[];
};
```

## 5. Runtime targets

Allowed values:

- `web-spatial`
- `webxr-disabled`
- `quest-vr-disabled`
- `visionos-disabled`
- `ar-handheld-disabled`

Only `web-spatial` may be assumed live by default.

## 6. Scene manifest minimum

A scene manifest must include:

- `sceneId`
- `title`
- `worldType`
- `cameraRig`
- `lightingProfile`
- `groundLayer`
- `skyLayer`
- `orbLayer`
- `weatherLayer`
- `memoryStarLayers`
- `fallbackState`

## 7. Asset manifest minimum

An asset manifest must include:

- `assetId`
- `kind`
- `uri`
- `mimeType`
- `checksum`
- `scope`
- `fallbackUri`

Allowed `kind` values:

- `texture`
- `mesh`
- `audio`
- `subtitle`
- `scene-json`
- `shader`
- `sprite`
- `particle-config`

Allowed `scope` values:

- `public-demo`
- `tenant-scoped`
- `user-scoped`

## 8. Consent receipt minimum

A consent receipt must include:

- `receiptId`
- `tenantId`
- `userId`
- `purpose`
- `grantedCategories`
- `createdAt`
- `retentionPolicyId`

## 9. Safety boundaries

Each export must declare whether it contains:

- mood reflection layers;
- relationship reflection layers;
- recovery reflection layers;
- legacy or identity reflection layers;
- biometric fallback surfaces;
- memory-grounding fallback surfaces.

If any are present, the export must include `requiredLanguage = pattern_support_not_diagnosis` or `requiredLanguage = uncertainty`.

## 10. Spatial validation result

Spatial validation should produce:

```ts
type UraiSpatialHandoffValidation = {
  ok: boolean;
  acceptedRuntimeTargets: string[];
  rejectedRuntimeTargets: string[];
  warnings: string[];
  errors: string[];
};
```

## 11. Release gate

The URAI Spatial release gate must fail if this contract is missing or if these terms disappear:

- `StudioSpatialExport`
- `producer = urai-studio`
- `consumer = urai-spatial`
- `web-spatial`
- `webxr-disabled`
- `quest-vr-disabled`
- `visionos-disabled`
- `ar-handheld-disabled`
- `consentReceipt`
- `safetyBoundaries`
- `pattern_support_not_diagnosis`
- `UraiSpatialHandoffValidation`

## 12. Live claim boundary

A Studio export may prepare future XR content, but URAI Spatial may only claim live support for the targets validated in `release/tier-xr-release-matrix.json` and the live release manifest.
