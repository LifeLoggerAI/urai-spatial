# XR truth table — URAI Spatial live completion pass

## Source-present XR pieces

| XR item | Classification | Evidence / note |
| --- | --- | --- |
| WebXR dependencies | Source-present real | `three`, `@react-three/fiber`, `@react-three/drei`, and `@react-three/xr` are in `urai-tier1/package.json`. |
| WebXR resolver contract | Source-present real | `resolveWebXREntryStateById` exists and resolves `immersive-vr` or `immersive-ar` target modes. |
| Capability detection | Source-present real | Code checks `navigator.xr.isSessionSupported(targetMode)`. |
| Session request | Source-present partial | `navigator.xr.requestSession(state.targetMode, { optionalFeatures: state.features })` exists. It is not headset-verified in this pass. |
| Fallback copy | Source-present and live on custom domain | `urai.app` says headset entry remains gated unless support and consent proof passes. |
| Unsupported browser behavior | Partial | Overlay disables Enter XR unless support is detected. Need browser QA screenshots/logs. |
| Desktop fallback | Partial/live custom domain | Custom domain states 3D Home stays normal until real VR is supported. |
| Mobile fallback | Partial/unverified | Expected spatial-web fallback; needs device QA. |
| Meta Quest Browser | Unverified | No physical Quest session entry proof. Do not claim Quest support. |
| AR support | Source-present unverified | Resolver can target `immersive-ar`; no AR session proof. |
| Telemetry/logging around XR attempts | Missing/unknown | No verified telemetry receipt for support checks or requestSession results in this pass. |

## Claim policy

Allowed public claims now:

- `3D/spatial web preview is live on supported desktop/mobile browsers.`
- `XR/WebXR foundation exists in source.`
- `XR entry is gated by browser support and consent.`
- `Unsupported browsers/devices remain in spatial-web fallback.`
- `Quest/immersive VR is candidate/beta/unverified until physical validation is complete.`

Forbidden public claims until proof exists:

- `Full VR is live.`
- `Full AR is live.`
- `Quest is supported.`
- `Headset mode works for users.`
- `XR session entry is production-ready.`
- `Hand tracking/controller locomotion is verified in production.`

## Acceptance criteria for XR READY

1. Unsupported browser smoke: prove Enter XR is hidden/disabled and fallback copy is truthful.
2. Desktop WebXR-capable browser smoke: prove detection behavior and error handling.
3. Meta Quest Browser: prove `immersive-vr` supported, requestSession succeeds, scene renders, exit works.
4. Error path: prove denied permission/session failure shows safe fallback.
5. Performance: prove acceptable frame budget on target headset.
6. Proof: store screenshots/video/logs in this proof folder or a subsequent launch proof folder.
