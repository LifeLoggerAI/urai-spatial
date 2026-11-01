# UrAi Genesis Day 1 — original native motion capture (internal HOLD)

**Status: ENGINEERING CAPTURE ONLY. NOT A COMPLETED FILM. NOT A RELEASE OR ACCEPTANCE.**

This additive draft-PR capture tool does not change the original consumer application or the live deployed application. The original compiled static consumer export is fetched from GitHub Actions artifact `12145312224`, SHA-256 `241902126b0f3a73e0a26b59e303bfc8d90289a008e9b3d4e2f238518f284fbe`, and its internal manifest verifies 1,525 files / 144,192,602 bytes from `94c8a2cf68a436a0c49e80b3a09578935df12d48`.

The isolated draft PR #1850 (`parallel/digital-human-performance-20261018`) is the only CI trigger. The standard `ubuntu-24.04` GitHub-hosted runner is used. No Vercel sandbox or paid larger runner is provisioned. The workflow uses source-pinned Playwright Chromium and FFmpeg (both available in earlier native visual-proof run `39151092683`). It serves only the compiled app via `127.0.0.1:4173` and blocks browser requests outside this origin. Demo/sample fixtures are explicitly disclosed, and no synthetic account, private content, or consent authority is granted.

## Important route correction

The original `/ascent/` path is a compatibility redirect to `/home/`, **not** actual ascent. The runner opens the original Home route, uses the exact `scripts/home-sky-ascent-proof.mjs` source blob `8d688bfaabf9efc1dbb3d3f6b64e67ae2f451568`, physically clicks original Home sky pixels, and requires real ascending PlayerRig camera telemetry and a source-identical LifeMap arrival. It refuses Ascent if this interaction cannot be proven.

LifeMap, Focus and Replay readiness is checked against original application data attributes and first-frame WebGL evidence instead of fixed sleeps or on-screen marketing copy. Replay must actually enter the original sample-playing state via the `Continue memory` control. Failures preserve the route, in-app readiness data and browser errors in a JSON receipt.

## Canonical continuous-journey recorder

The second runner, `scripts/genesis-original-canonical-motion-hold.mjs`, invokes the existing original `scripts/capture-canonical-journey-proof.mjs` without changing its committed source. Both canonical source proof scripts are Git blob pinned to the October 18 application revision. This runner supplies a recording-enabled Playwright context for the desktop browser, observes source-owned screenshot/interaction milestones in the existing canonical proof, and retains one real uninterrupted WebM of the actual application journey. It includes a verified original `Continue memory` playback interval and a real Orb click after the recorded Home return. Seven source-motion clips are extracted from that one Chromium recording using FFmpeg and their measured elapsed times. The editor may reorder the *Orb-after-return* segment into the final film, but it must not claim Orb originally occurred before Ascent.

The interval helper `scripts/genesis-original-motion-intervals.mjs` rejects missing, duplicate, reversed or too-short event intervals. Every segment must decode and exhibit changing native video frames; each is sealed separately before any public-repository artifact upload. The permanent continuous-journey proof remains the existing canonical proof: camera height and sky entry, disclosed demo memory selection, Focus, Replay, reverse transitions and final Home. If any required original runtime action fails, its stage is not accepted and no final film is certified. The other two canonical proof variants (mobile touch and reduced-motion keyboard) still run for independent diagnostics but are not silently treated as desktop film acceptance.

If canonical continuity fails, the first `genesis-original-native-motion-hold.mjs` runner runs as a diagnostic fallback. Its independent route clips (with a newly repaired genuine Home sky ascent) cannot certify the uninterrupted forward journey. Its `journeyContinuityAccepted` remains explicitly false, and no completed film can be declared from that fallback alone.

**Important:** Neither runner has yet executed in the authorized GitHub Actions browser in this continuation. There are still **zero verified new native motion clips**. The new code and its nine static/invariant tests are not substituted for a runtime recording.

## Transport and custody

The canonical and diagnostic runners write raw `.webm` to temporary runner storage for decoding and motion inspection. It uploads **only** `.sealed` AES-256-GCM / RSA-OAEP ciphertext and bounded source/diagnostic receipts, not unencrypted video. GitHub Actions artifacts from a public repository can be downloaded by others; therefore **never upload original or unencrypted media, private keys, credentials or actual customer information**.

The RSA *public* key is intentionally committed in the workflow. The corresponding *private* recovery key is not committed, embedded in the workflow, logged, or included in any source archive. If the private key is unavailable, uploaded ciphertext cannot be decrypted. Keep the private key separately under owner-controlled custody.

## Local non-browser tests

```
node --check scripts/genesis-original-native-motion-hold.mjs
node --check scripts/genesis-original-canonical-motion-hold.mjs
node --check scripts/genesis-original-motion-intervals.mjs
node --test tests/genesis-original-native-motion-hold.test.mjs tests/genesis-original-motion-intervals.test.mjs
node scripts/genesis-original-native-motion-hold.mjs --verify-only --original ORIGINAL_EXTRACT --output VERIFICATION_OUTPUT
```

Running the recording requires the authorized GitHub Actions Chromium/WebGL runner and the complete exact original archive. Review `artifacts/genesis-native-motion-hold/native-capture-receipt.json` and verify exact clip hashes before making any new media. Do not convert screenshot proof into fake motion or use the live `748e50398d85effeaa4ed17aaf78d4076dddbb45` revision without separate provenance.

**Release: NO-GO/HOLD. Private media: disabled. Public publishing: HOLD. Native dispatch: disabled.**

## Next action / current connector boundary

The engineering package is prepared but the GitHub write through the connected tool was declined by a safety check. Do not claim a commit, Actions run, native clip or verified film yet. An authorized maintainer may review the file list in this HOLD package and apply a single non-force commit to the existing draft PR #1850 only after rereading its actual branch head and confirming no concurrent changes. The workflow is `pull_request` synchronize-only for that draft PR, standard public GitHub Actions runner, no Vercel deployment. Recheck the result and SHA after native readback. No public social publishing or provider activation is permitted.

## Conflicted draft PR execution recovery (2026-11-01)

GitHub reported draft PR #1850 as `mergeable_state: dirty` and did not schedule the new `pull_request` capture workflow after commit `99285045f083bb311934d4dd0c2f84bfabfd6d7a`. To avoid modifying the release-controller branch or weakening draft custody, the workflow now also admits a **push solely to** `parallel/digital-human-performance-20261018`. Before any browser work, the runner performs a live read-only GitHub PR API check: exact PR #1850, owner-repository head, exact triggering SHA, open draft, and unchanged target branch. Any mismatch fails closed. The `pull_request` trigger and its original constraints remain intact. No automatic production deployment, provider dispatch, or publishing occurs.
