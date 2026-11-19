# R1538 NVIDIA hardware guest Home splat visual evidence

Source inspected: `23f81450d3a7f5a82eba640e33b0c53e7845801c` (Spatial PR #2133; unchanged).
Protected hosted preview: deployment `dpl_AHxjBAEFZT5z2rVSKU515zsC78rv`, https://urai-genesis-private-app-review-r1193-m4x76pbxz.vercel.app (SSO-protected).

These two screenshots were captured from the exact hosted preview on Runpod RTX PRO 4000 Blackwell with Chromium 148 WebGL2 ANGLE Vulkan. The static cinematic picture and gradient DOM layers were temporarily hidden in test-browser DOM to expose the underlying Gaussian WebGL canvas. Screenshots are diagnostic, **NOT the normal combined user experience**. Only synthetic public-safe visuals appear.

| Evidence | Screenshot | SHA-256 | Short frame sample |
| --- | --- | --- | --- |
| Desktop 1024x576, reduced motion | `hosted-nvidia-desktop-isolated.jpg` | `1c326add9e49be3bbdf4739fd7236e8b9b2eb408ca22f067ea975a4e6635ad30` | 79 frames / 1.3045 sec = ~61 fps |
| Mobile-sized viewport 390x844, reduced motion | `hosted-nvidia-mobile-isolated.jpg` | `b560332ed18fd5f853611d1dc7fd1a41ec4b7ba57cbe69095d046bad08789b2d` | 91 frames / 1.50 sec = ~61 fps |

Both runs: source preview banner matched `23f8145`; .splat HTTP 200 and request finished; decoded 2,667,520 bytes; no browser page errors, no texSubImage2D dimension warnings. Actual renderer: `ANGLE (NVIDIA, Vulkan 1.4.329 (NVIDIA NVIDIA RTX PRO 4000 Blackwell (0x00002C34)), NVIDIA)`.

**Earlier failure**: protected Vercel asset served Brotli-compressed bytes without Content-Length, so the strict parser rejected it. The exact-source Home adapter now normalizes decoded response length only for this deterministic public-safe file; private Captured Reality streaming remains unchanged.

**Not passed**: visual Gold Master/AAA+++ quality (low-fidelity noisy procedural fixture); real-phone device GPU, sustained frame-time tails, full accessibility, signed-in privacy lifecycle, external reviewer approval. Software SwiftShader gave ~1 fps and stalled screenshots but does not represent NVIDIA GPU performance. Keep source PR #2133 DRAFT, production HOLD/NO-GO, private-memory writes DISABLED.
