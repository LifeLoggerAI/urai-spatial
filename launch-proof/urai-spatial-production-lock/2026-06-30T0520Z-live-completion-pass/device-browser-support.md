# Device / browser support matrix — URAI Spatial live completion pass

| Device / browser | Expected behavior | XR availability | Verification status | Blocker |
| --- | --- | --- | --- | --- |
| Chrome desktop, no WebXR immersive runtime | Render spatial web Home/Life Map/Ground. Hide or disable Enter VR. | No immersive XR. | Partially verified through live custom-domain fallback copy; not device-screenshot verified. | Need browser QA screenshot and console log. |
| Edge desktop, no WebXR immersive runtime | Same as Chrome desktop fallback. | No immersive XR. | Unverified. | Need browser QA. |
| Safari desktop | Spatial web fallback only. | No production immersive XR claim. | Unverified. | Need Safari QA. |
| Chrome Android phone | Spatial web fallback. | Usually no headset immersive session unless runtime exposes WebXR. | Unverified. | Need mobile QA. |
| Safari iOS | Spatial web fallback. | No production immersive XR claim. | Unverified. | Need iOS QA. |
| Meta Quest Browser | Candidate beta target. Should show Enter VR only if `immersive-vr` support is returned and consent/session request succeeds. | Candidate `immersive-vr`. | Unverified. | Need physical Quest validation. |
| Unsupported/no-WebXR devices | Truthful fallback copy; no fake headset support. | None. | Custom domain copy partially verifies the intended behavior. | Need automated/live fallback smoke proof. |
| WebXR-capable desktop VR runtime | Candidate beta target. | Candidate `immersive-vr`. | Unverified. | Need physical headset/runtime proof. |

## Current public behavior observed

`https://urai.app` currently presents truthful fallback language: private data, autonomous actions, and headset entry remain gated unless support and consent proof passes. The root/home surface also states Enter VR is hidden when the browser/device does not report `immersive-vr` support.

`https://urai-4dc1d.web.app` currently fails freshness because it serves stale launch placeholder copy.

## Support statement for public copy

Recommended support statement until Quest proof exists:

> URAI Spatial is live as a desktop/mobile spatial web preview. WebXR is an experimental progressive enhancement and only appears on browsers/devices that report real immersive session support. Quest/browser support is not publicly guaranteed until device validation is complete.
