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
