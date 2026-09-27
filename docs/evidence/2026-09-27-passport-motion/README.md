# Physical Home Passport reduced-motion repair

Base: `d551dcfaa53a6840c62775bc1095984a85b29d53` (Spatial #1348).
Main observed: `4b3c7bd982865324510eb9581d9f324bd4ad6e93`.

The physical Passport previously shortened two opening timers based only on the
system media query. Its frame callback still articulated both covers, including
while focused; the in-app reduced-motion setting was ignored.

The component now consumes the existing shared system/in-app preference hook,
keeps covers at their closed resting pose when reduced motion is selected, and
captures the return origin before requesting Passport travel without decorative
opening timers. Normal motion retains its original cover interpolation and
220/700 ms stages. The existing Home capture records the resolved preference and
rejects reduced-motion continuity captures if the Passport did not honor it.

## Observed local verification

- Six component behavior tests pass. Five fail against the unchanged base with
  real motion/preference/activation assertion failures; normal activation passes
  on both versions. The harness executes the runtime component and shared hook,
  with mocked browser/React/render lifecycle, not a real rendered browser.
- All 116 focused contract suites pass, including the new behavior test.
- Runtime TypeScript check passes with incremental compilation disabled.
- Production Next build exits 0. It reports protobuf dynamic-require warnings
  and an ESLint configuration diagnostic; this is not a lint pass.
- Home capture syntax, workflow YAML parsing and diff whitespace checks pass.
- Runtime: Node 24.19.0. Existing dependency installation reused read-only; its
  lockfile SHA-256 equals this candidate's
  `3e745a2a1100eeb7fd76182512cd69b11a6bbb3ef8baf3518b12ff5b05f426e3`.
  Fresh remote Node 22/frozen-lockfile proof remains required.

## Evidence boundaries

This is an isolated child, not a replacement for active pixel or asset branches.
Live /home shows an older threshold presentation and cannot certify this branch.
The cloud browser rejected the local preview URL with ERR_BLOCKED_BY_CLIENT.
The Home State Proof workflow is enabled for this stacked base to retain fresh
exact-head browser evidence. Earlier screenshots and predecessor CI are not
transferred as acceptance for this change.

No production assets were promoted. Asset PR #1343 explicitly identifies its
new deterministic GLBs as candidates, not final AAA+++ art. No provider spend,
production merge, deployment, independent approval or whole-experience visual
certification is claimed. Remaining art, asset, accessibility, performance and
release gates require their actual exact-head evidence.


## Owner lifecycle continuation

The successor also repairs the canonical Passport vault and its public-good consent card. Auth changes clear owner records, job rows, confirmations and pending UI state. Every async response and collection callback checks the current Firebase identity and auth generation; late signed downloads cannot navigate after sign-out. Keyboard Home preserves editable controls and Escape requests the canonical origin return. Vault motion uses the same system/in-app hook as the physical Home Passport. URL review state resolves after hydration, and offline status is explicit in demonstration and private modes.

Sixteen behavioral tests exercise the real transpiled component modules using deterministic hook/auth/service fixtures (not browser or authenticated backend certification). Six of the first eight vault cases and all three consent regression cases failed against the original modules. Positive controls confirm current-owner downloads and consent changes still work. All 117 focused suites, runtime TypeScript, and the production build passed locally. The repository's declared lint implementation is runtime TypeScript; that command passes. The build still warns about protobuf dynamic dependency resolution and the absent Next ESLint plugin. No independent ESLint rule coverage is claimed.

The Passport browser workflow now includes this stacked PR base and runs the lifecycle and Home motion behavior tests. Browser acceptance adds system motion, review-query hydration and portrait/landscape/narrow reflow coverage. Fresh exact-head remote proof is required; earlier workflows do not certify this successor.

Current evidence limits: the supported cloud browser rejects the workspace loopback preview. GitHub Actions remains the available exact-candidate rendering path. Active Home and Reference Estate captures are pending; no visual or whole-experience acceptance is inferred. New deterministic asset handoff candidates remain candidate-only, without final material/texture/likeness acceptance. No real private reconstructed scene, AAA+++ promotion, independent approval, merge, deployment or live acceptance is established by these repairs.

The final full-suite rerun exposed one syntactic security-contract mismatch: it required `params.get` literally, while hydration-safe query initialization now uses `params?.get` before mount. The contract accepts either access syntax while retaining exact `demo=1`, empty initial snapshot and explicit-demo branch requirements. Added behavioral coverage verifies absent/false/non-1 flags stay signed out without sample records, explicit demo activates only after hydration, no private subscriptions start, and offline sensitive operations remain disabled.

### Retained browser checkpoint

Passport workflow 36282925445 passed on ce47c793db25dcccb6befc15bbbba7ef5d83fe75. Artifact 10919397733 has SHA-256 cd1aa8286176cd17bd14d6e2d4672a3f1b98945e4c8b9dc679a97f912441d1a8. Six browser scenarios passed; retained desktop, portrait, landscape, 320px, signed-out and WebGL fallback frames were inspected. All six runtime logs contain no console/page errors or failed requests. This is no-secrets local static browser proof, not authenticated backend or production acceptance.

Cancelled predecessor Home run 36281802902 retained diagnostic artifact 10919133498 (SHA-256 1e1f4b935232947cde355741b77d863ea7dc225cde4801f26276202c601b74a4). Its desktop Home/Passport return case passed, but reduced-motion Orb conversation visibility failed before cancellation. Later connection-refused failures followed server teardown and cannot independently diagnose runtime defects. Home's literal frame still shows coarse faceted Orb housing, sparse landscape and unfinished material composition; pixel/AAA+++ acceptance is withheld. A scoped reduced-motion keyboard browser case now retains control geometry and visibility evidence to isolate the earlier failure.

Current local full rerun: all 117 focused suites pass after the explicit-demo assertion repair. Runtime boundary, 71-route classification/20 critical routes, Firestore boundaries, release-security path guard, accessibility/performance source contract and static performance budget pass. Asset references resolve (77, zero missing); the final asset receipt explicitly remains STALE — NOT RELEASE EVIDENCE with one placeholder final entry. No source-contract pass is represented as measured frame-time or final asset acceptance.

On 3635c2e4c1cb45903736fa65609e35f7e44f1a13, all seven scoped browser scenarios passed in run 36283249111 (artifact 10919373345, SHA-256 d48d7b377a051971f5ea9134f51e13677934d9e10d9271c3598ef0e5aebe0ea2). This includes reduced-motion Home Orb keyboard conversation and Escape focus return; the earlier long-run failure was not reproduced in isolation. Ten observed workflows passed; Home and Reference Estate remained active.

The Reference Estate harness still expected slashless Passport URLs and used browser history for an exact-origin claim. It now accepts the canonical static trailing slash, activates the visible Return to origin control, and checks that the stored Home frame is consumed. Partial capture receipts are checkpointed after each case and remain explicitly incomplete. The scoped browser case also exercises reduced-motion Home → Passport → origin return. These successor changes require fresh workflow proof.

Verification coverage correction: canonical Main Journey now triggers on Passport and HomeAAAVisualRepair changes; the existing accessibility/performance and release-security workflows include this stacked base. Their exact-head checkouts, test bodies and protected production boundaries are unchanged. Inspection of the short Orb screenshot showed it ran before the 3D Home was ready, so the scoped browser case now waits for loaded Home assets and bodyless first-person state before exercising Orb and Passport. Its earlier pass alone does not resolve the loaded-world failure.

### UI continuation: loaded-world evidence and Orb rendering

Fresh ab9f1289 evidence: canonical journey run 36283590333 passed, artifact 10919656870 (SHA-256 1dbf3cb7c7fab52b778e5b8bbbb4188ae59ffd421e73a6ef4fc0723fa5fbdb93). Literal inspection rejects its initial/return Home frames as visual acceptance because they show the forming overlay. The successor capture waits for loaded assets and input readiness on both arrival and return.

Passport run 36283590319 failed its final five-second poll; six other scenarios passed. Artifact 10919627051 (SHA-256 4418ab48d44283264bb84cfbec5813e2c58b0cfafc182025fe08d4e765b1d34d) shows a loaded Home. Trace call@66 returned null after 8.34 seconds, establishing that the saved frame was consumed but the software-rendered browser response exceeded the poll limit. This is not proof of a stale return-frame defect. The strict browser assertion is retained for the successor.

The successor disables rendering of the invisible fallback Orb materials, preserving actual Three raycast intersections and restoring original material visibility on cleanup. Previously colorWrite=false and opacity=0 still submitted transmissive meshes. Home and the visible reliquary now use the shared system/in-app reduced-motion preference. The shell welds duplicate triangle vertices before recalculating normals, preserving its silhouette, weathering colors, triangle count and open interior while removing unintended flat facets. This is an unaccepted visual candidate until new pixels are inspected; no asset promotion, independent approval or deployment is claimed.

Targeted geometry/lifetime regressions pass (seven cases). Runtime TypeScript and the production build pass; the existing protobuf and Next ESLint-plugin warnings remain. A broad legacy Home-test glob also exposed older source-marker/retired-owner failures, so it is not claimed green; the declared focused suite and current-head CI remain separately reported. Gaussian PR #1324 remains a separate draft with no trained scene in its current source; its compute lane is untouched.

### Settings identity and reference-camera continuation

On 38dc448623b4584228c7d31f1ecac391839e6d74 (tree 8f7db4e91cc58baa3014d770fcf735b7b5c4a1a6), Main Journey run 36285054088 passed. Artifact 10920591735 (SHA-256 e29208e38bed8eaab5bbb4d55e8c4115d7f28c017c6742b309c20db168cc5999) was inspected across all 31 retained desktop, reduced-motion and mobile frames. Home arrival and return now show the loaded world. The smoothed Orb shell is visible, but coarse sanctuary materials, terrain and Orb composition remain unaccepted. Passport run 36285054039 still failed its strict return poll; artifact 10920022673 (SHA-256 52b2548c9f7651cd07025623e79e1922ce3d54c8441d3ec8c66fbbd9172d851c) was inspected. This is not whole-experience acceptance.

This successor guards Settings Google status, connect and disconnect responses by current auth generation and identity, including delayed tokens, same-user re-login, unmount and late redirect handling. Five behavioral cases pass; all five fail against the parent module. Sensory switches now have distinct accessible names and 48px label targets. A browser scenario checks keyboard activation on mobile, Settings-to-Home navigation and in-app motion propagation to the loaded Orb and physical Passport.

Cancelled ab9f Reference Estate artifact 10920571119 (SHA-256 63a76af884d344508af8714d3537ae51575df7d5f52daf6301898af463bbc12e) retained 15 captures and two failed Passport reference sheets. The sheets were behind the current first-person camera; their review-only positions now derive from that camera. Production Passport placement is unchanged. The full reference estate is divided across four jobs with explicit planned IDs and incomplete checkpoints. Every existing case remains. A shard alone cannot establish complete-estate proof; all sibling receipts, failures and the union of captured IDs must be inspected. Two shard-distribution regressions pass.

All 118 declared focused contract suites, runtime TypeScript and the production build pass locally. These source and behavior checks do not replace fresh successor rendering. The existing warnings and legacy-test limits above remain. Gaussian compute, private captures, provider activation, payments and launch-disabled realms are untouched. No independent approval, merge, deployment or current live acceptance is claimed.

### Isolated Settings scrolling repair

Literal inspection of d30a21dc artifact 10921578557 exposed clipped Settings content: only the top part painted inside the fixed-height spatial shell, followed by a large blank area in the full-page screenshot. Settings now owns a viewport-height vertical scroll container, and its supporting-link grid fits 320px screens. The browser scenario must scroll to the bottom privacy link at 390px and 320px, prove it is in the viewport, and retain bottom screenshots. Existing motion, account-lifecycle and loaded-Home assertions remain. This is isolated from ongoing PR #1351 Passport return changes.

The d30a21 retry trace call@66 started at 280308.594 ms and returned null at 288280.791 ms: 7.972197 seconds. The failed five-second poll does not establish that the source key remained. Runtime responsiveness remains unresolved and the strict test is retained. All four d30a21 reference shards were inspected: 28/132 planned captures retained, one Passport handoff timeout, all incomplete after successor cancellation. The two repaired first-person Passport reference sheets are visible. No complete-estate acceptance.

Direct live browser inspection was rejected by automatic approval review because workspace credits are exhausted. No workaround or new charge was attempted. Live verification needs restored browser access; private Gaussian integration still needs its authorized real scene. This repair is not merged, deployed, independently accepted or AAA+++ certified.

### Reduced-motion idle rendering continuation

Fresh parent Home run 36290272471 at 6b926f15986d255c5fa35644ace5972d8954df29 completed with two genuine browser failures: normal-motion Orb response visibility (20 seconds) and reduced-motion conversation-summary visibility (10 seconds). Artifact 10922223179 SHA-256 7b3a5db9c139a783f0814c5223224142ab73eba465b09f04225713466bcc2644 is retained. These are separate from the Passport five-second response timeout and remain unaccepted.

The isolated successor addresses unnecessary repeated idle draws in reduced-motion Home. Previously demand mode still scheduled a new full scene draw every 280 ms after the previous draw finished, even when the scene and camera were at rest. The cadence now stops at rest, wakes on input/state revisions, and continues while movement keys, touch input, dragging, a navigation transition, a walking target or residual velocity need frames. Normal-motion software pacing stays unchanged. Reduced-motion camera FOV takes its target directly, avoiding an idle decorative zoom. Eight cadence regressions pass, including sleep/resume/settle, timer ownership and disposal. Fresh browser/journey evidence must establish actual improvement; no timeout or assertion is relaxed.

PR #1352 remains frozen so its whole-estate capture can continue. This Home repair is an isolated child and does not overwrite active parent return work or alter private Gaussian compute. Current visual art acceptance, normal-motion failures, final assets, independent review, merge and deployment remain outstanding.


The follow-up atmosphere correction explicitly invalidates weather, five-minute time updates and sky focus changes. Reduced-motion weather/time/fog/focus and local Orb atmosphere reach their targets in one frame; normal-motion interpolation is preserved. Ten cadence/actual-atmosphere-callback tests, all 118 focused suites, runtime TypeScript and the production build pass locally. This closes a source regression introduced by sleeping at rest; successor pixels and responsiveness are still pending.

### Completed Settings-head reference estate

PR #1352 stayed frozen at e15a3b4cf9931d3419440c575a3985c0ec7cc813 until run 36289842442 finished all 132 cases. Four complete receipts retain 129 screenshots and three failures: WEATHER-006 screenshot/font wait timeout, PASSPORTPHYS-008 and PASSPORTPHYS-011 vault visibility timeouts. Artifacts: 10923075549 (33 captures, SHA-256 32d742af2cba22dc108c464b57ec7fb0dcdb808dc205d0d6efc019f6e16b5119); 10922910061 (32 captures, ad29a35ea8a1f3b25fc9ace1c0e2c5cc0fc82f79df8c67b571cbc987f18742a5); 10922815583 (32 captures, de56927f8b47caee00a73c53bf394c16306d9946b60aa530b36b984f57142ea2); 10922800878 (32 captures, 88a26c1ef35f4ec894c6efc0ae1c6110e1127c3c532f0f2b57592ff7b4eb19c4).

All 129 retained images were opened in contact sheets. Ritual review labels are oversized/clipped; Council has primitive T-pose placeholders; Legacy shelves and Mirror scenery remain coarse/dark. Home material and mobile Orb framing remain unfinished. Some nominally successful captures show loading overlays, including Council-008, Legacy-006 and desktop onboarding, so capture success does not certify a loaded world. These are specific unaccepted implementation/art findings, not final acceptance. Deferred realms remain disabled in production. No merge, deployment or live verification occurred.
