# Shadow graphics-denial fallback repair

Parent: PR #1368, `e243a20f04b24ee8b2c1a99f8b660d54db2afb11`.

`SpatialRealmRuntime.detectWebGL` caught cleanup errors but not canvas/context
creation errors. A browser throwing from `getContext` escaped the mount effect
instead of setting capability to false and reaching the existing semantic
fallback. The new regression failed against that exact parent implementation.

The runtime now uses the parent's shared `probeWebGLSupport`. No realm enablement,
navigation, visual assets, timeouts, release gates or provider settings change.
Shadow remains behind `URAI_ENABLE_POST_LAUNCH_REALMS`; this repair does not enable
the realm in production.

Validation:

- Seven executable graphics-probe tests pass: throwing context creation, server
  and unavailable contexts, repeated WebGL1/WebGL2 cleanup, missing cleanup
  extension, extension access error, and cleanup error.
- Shadow route and canonical route compatibility tests pass (11 tests total).
- Realm canon, Replay contract, runtime boundary/authority and source integrity
  checks pass; `git diff --check` passes.
- Runtime TypeScript and production Next build pass with pinned pnpm 10.0.0.
  Local Node is 24.19.0; CI's required Node 22 remains separate evidence.
  Build emits existing protobuf dynamic-dependency and ESLint plugin warnings.
- Local Playwright browser download returned an invalid zero-byte ZIP. No
  rendered browser acceptance or screenshot is claimed.

Current external observations: direct HTTPS HEAD to `https://urai.app` returned
404. PR #1370 had no independent reviews, and its required verification runs
were queued. Repository Actions reported 126 queued runs and eight in progress.
These observations do not establish the cause of the public outage.

Status: implemented and locally tested. Fresh exact-head CI, rendered fallback
inspection, parent integration, independent acceptance, governed release and
public verification remain required. No merge, deployment, AAA+++ acceptance,
whole-estate completion or certification is asserted.
