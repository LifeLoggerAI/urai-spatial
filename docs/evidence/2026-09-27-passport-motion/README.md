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
