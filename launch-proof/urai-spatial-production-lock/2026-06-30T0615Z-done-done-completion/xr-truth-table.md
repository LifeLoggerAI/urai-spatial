# XR truth table — DONE-DONE completion pass

Starting SHA: `01702862d81da8708611dd5f1a5499397bbcc460`
Ending SHA: recorded in final response after proof commits land.
Branch: `main`
Evidence level: source + custom-domain fallback copy. No physical device proof.

| XR item | Status | Verdict |
| --- | --- | --- |
| `immersive-vr` source path | Resolver supports `immersive-vr`; overlay calls `requestSession(state.targetMode)`. | Source-present, unverified live/headset. |
| `immersive-ar` source path | Resolver can select `immersive-ar`; AR features include `hit-test`. | Source-present, unverified. |
| Capability detection | `navigator.xr.isSessionSupported(state.targetMode)` exists in overlay; runtime/gate code checks WebXR support. | Source-present real. |
| `requestSession` | `navigator.xr.requestSession(...)` exists. | Source-present, no physical success proof. |
| Unsupported fallback | Custom domain says headset entry remains gated and Enter VR hidden when unsupported. | Live custom-domain partial PASS. |
| Desktop fallback | Custom domain says 3D Home stays normal until real VR is supported. | Live custom-domain partial PASS. |
| Mobile fallback | Expected spatial-web fallback. | Unverified device-specific. |
| Quest Browser | Requires physical Quest Browser proof. | BLOCKED/unverified. |
| No-WebXR devices | Button should be hidden/disabled and fallback copy visible. | Source/custom-domain partial, needs browser QA proof. |
| Fake DOM VR | No fake DOM-only VR implementation was added in this pass. | PASS. |

## Public XR claim lock

Allowed: `WebXR foundation exists`, `XR is progressive enhancement`, `unsupported devices use spatial-web fallback`.

Forbidden until physical proof: `Quest supported`, `VR live`, `AR live`, `headset mode works`, `hand tracking/controller locomotion verified`.
