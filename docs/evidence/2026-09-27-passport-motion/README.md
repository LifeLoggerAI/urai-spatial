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

Fifteen behavioral tests exercise the real transpiled component modules using deterministic hook/auth/service fixtures (not browser or authenticated backend certification). Six of the first eight vault cases and all three consent regression cases failed against the original modules. Positive controls confirm current-owner downloads and consent changes still work. All 117 focused suites, runtime TypeScript, and the production build passed locally. The repository's declared lint implementation is runtime TypeScript; that command passes. The build still warns about protobuf dynamic dependency resolution and the absent Next ESLint plugin. No independent ESLint rule coverage is claimed.

The Passport browser workflow now includes this stacked PR base and runs the lifecycle and Home motion behavior tests. Browser acceptance adds system motion, review-query hydration and portrait/landscape/narrow reflow coverage. Fresh exact-head remote proof is required; earlier workflows do not certify this successor.

Current evidence limits: the supported cloud browser rejects the workspace loopback preview. GitHub Actions remains the available exact-candidate rendering path. Active Home and Reference Estate captures are pending; no visual or whole-experience acceptance is inferred. New deterministic asset handoff candidates remain candidate-only, without final material/texture/likeness acceptance. No real private reconstructed scene, AAA+++ promotion, independent approval, merge, deployment or live acceptance is established by these repairs.
