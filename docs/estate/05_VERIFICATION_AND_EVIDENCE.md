# Exact-source test and log provenance - do not transfer green

| Checkpoint | Source SHA | Recorded execution | Interpretation |
|---|---|---|---|
| R849 Spatial original `genesis-r799-exact-head-acceptance.sh` | `ad0dcf7412e6c6f84724b030660275f29ef4dfee` | Frozen install, Functions build/test, Rules static/native, Tier1 tests/type/build, four Auth/Firestore/Storage/Functions emulators all PASS; `firebase_four` 43/43 | Native synthetic/negative pass; `production_go` deliberately BLOCKED exit 2; private positive playback false |
| R852 original browser E2E | `b3e517693a574772fc730854aefca37619e742b5` | Clean native runner reached browser, failed `Expected data-scene-mode=home, received null` | Legacy test target, not missing Home |
| R855 route-owner browser E2E | `e0448b857ac49f9515948d27db2af855b0a89a7d` | 6/7 scenarios PASS; selected Focus inspector hidden, hydration warning | Genuine failures preserved |
| R861 original `pnpm lock:e2e` | `c2bd556129a6357680c581a582373bac25d542fb` | Clean Node22/pnpm10, frozen install, typecheck, optimized Next build; original 8/8 browser-gate tests; real Chromium 7/7 PASS, no fatal console | Browser sample navigation only, mobile touch emulated; NOT physically certified |
| R862 Privacy + Jobs original unchanged 16-stage native | Privacy `5daa194...`; Jobs `ea8f016...` | 16/16 original stages with four Firebase emulators and fail-closed consent | Independent parallel negative/review-only issuer evidence; `productionGrant=false render=false` |
| Other worker Jobs/Studio | Jobs `ea8f016...`, Studio `153d6c3...` | Real localhost Studio client -> Jobs handler four demo emulators; ten fail-closed checks | No authorized private movie output |

R849 original failure `memory-media-playback-emulator-proof.cjs:128:91`: expected accepted fictional Captured Reality entry `available === true`, got false without demo-only `URAI_ENABLE_CAPTURED_REALITY`. Narrow isolated stage environment repair proved 43/43 without changing production denial. R855 hidden inspector and R860 screenshot-induced caret hydration were separately resolved before R861 real seven-suite pass.

R849 stage log hashes and R861 exact wrapper log hashes are in original GitHub PR comments; R861 browser log SHA256 `c0c095ba66b7716f143cb1bdced3392a2adb5440674b5c54210cb6ee0004b1a5`. THIS WORKER READ THE SOURCE-PINNED GITHUB RECEIPTS, NOT THE COMPLETE ORIGINAL POD RAW LOG BYTES. Do not claim independent SHA256 rehashing. R861 JSON report has `head:null`; separate clean checkout wrapper pinned source, not the JSON field.

Evidence links: https://github.com/LifeLoggerAI/urai-spatial/pull/2069#issuecomment-6702429023 ; https://github.com/LifeLoggerAI/urai-spatial/pull/2071#issuecomment-6703273396 ; https://github.com/LifeLoggerAI/urai-spatial/pull/2071#issuecomment-6703425065 .

Current container cannot resolve `github.com` for a full Git clone (`Could not resolve host: github.com`). No new native build, Firebase emulator, Chromium or physical-device test was executed in this documentation pass. Existing authenticated GitHub source enumeration and readback succeeded; no paid compute was launched.
