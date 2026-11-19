# R1546 bounded hardware probe

Result: NVIDIA hardware WebGL 1 and WebGL 2 contexts verified, using synthetic clear/readPixels only. This is internal same-task execution, not independent certification or application visual acceptance.

- Pod: 9c1hr1flmzla2m. GPU: NVIDIA RTX PRO 4000 Blackwell.
- nvidia-smi driver: 595.112.07. ANGLE driver: 595.112.7.0.
- Chromium: 148.0.7778.96; Playwright: 1.60.0.
- Browser path: /tmp/urai-r1438-gpu/browsers/chromium-1223/chrome-linux64/chrome.
- Successful probe UTC: 2026-11-19T06:54:23.500Z.
- Renderer: ANGLE (NVIDIA, Vulkan 1.4.329 (NVIDIA NVIDIA RTX PRO 4000 Blackwell (0x00002C34)), NVIDIA).
- Both contexts returned RGBA [255,0,255,255], GL error 0.

Launch on pod:

```sh
DEBUG=pw:browser node /tmp/urai-r1546-hardware-f3r61G/probe-v2.mjs vulkan
```

Full actual Chromium command is the first line of vulkan-v2-browser.log. Uses headless ANGLE Vulkan, enable-gpu, ignore-gpu-blocklist, disable-software-rasterizer. Playwright default enable-unsafe-swiftshader was explicitly removed. Playwright uses no-sandbox in this root container and a remote-debugging pipe, not an open TCP port. This does not establish browser sandbox security.

OpenGL attempt failed: ANGLE error 12289, Could not open the default X display; EGL_NOT_INITIALIZED. No DISPLAY was configured. Vulkan succeeds without X; /etc/vulkan/icd.d/nvidia_icd.json already exists. Driver installation is unnecessary for this probe. D-Bus errors remain in stderr, but no GL error or GPU process crash was reported in the successful receipt. Chromium reports its separate native Vulkan feature disabled while ANGLE's renderer explicitly uses Vulkan; preserve this distinction.

The initial Vulkan probe already identified NVIDIA and read pixels [64,127,191,255] without GL errors, but its strict intermediate-color comparison expected green 128 and returned false. V2 uses exact endpoint colors to avoid quantization ambiguity; original receipts are retained.

No application URL was loaded. Existing clean-source HEAD was 56b171ee1074999025b98bb6f2f6eeb4910f2259, not R1545. No app build, source edit, dependency or driver install, pod restart/stop, existing-process termination, remote commit or publication occurred. Only isolated probe files and browser profiles were created; probe browsers closed normally. Existing servers and archived changes were untouched. Next action for parent: reuse this Vulkan launch configuration for separately authorized exact-source scene acceptance.

manifest.json records SHA-256 values of original pod files. Receipts and browser logs are preserved alongside this report.
