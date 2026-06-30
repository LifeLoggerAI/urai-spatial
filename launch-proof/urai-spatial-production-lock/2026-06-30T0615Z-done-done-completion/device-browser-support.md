# Device/browser support — DONE-DONE completion pass

Starting SHA: `01702862d81da8708611dd5f1a5499397bbcc460`
Ending SHA: recorded in final response after proof commits land.
Branch: `main`
Evidence level: source/custom-domain live text; no device lab.

| Device/browser | Expected behavior | Verification status | XR availability | Blocker |
| --- | --- | --- | --- | --- |
| Chrome desktop | Spatial web fallback unless immersive runtime reports support. | Custom-domain fallback copy partially verified. | No claim without support detection. | Need browser QA screenshot/log. |
| Edge desktop | Same as Chrome desktop. | Unverified. | No claim. | Need browser QA. |
| Safari desktop | Spatial web fallback. | Unverified. | No production XR claim. | Need Safari QA. |
| Chrome Android | Spatial web fallback unless runtime exposes WebXR. | Unverified. | No claim. | Need Android QA. |
| Safari iOS | Spatial web fallback. | Unverified. | No production XR claim. | Need iOS QA. |
| Meta Quest Browser | Candidate WebXR target only after physical proof. | Unverified. | Candidate `immersive-vr`. | Need Quest device proof. |
| Unsupported browsers | Truthful fallback, no fake headset support. | Custom-domain text partially verified. | None. | Need automated unsupported-browser test. |
| No-WebXR devices | Enter VR hidden/disabled; spatial web still works. | Custom-domain text partially verified. | None. | Need browser automation proof. |
| WebXR desktop VR runtime | Candidate beta target. | Unverified. | Candidate `immersive-vr`. | Need runtime/headset proof. |

## Conclusion

The public device story must remain conservative: desktop/mobile spatial web preview is live on the custom domain; XR remains a progressive enhancement and is unverified on headset until physical proof is attached.
