# Tier 5 Scope Matrix

Generated from the Tier 5 safe production-gated implementation pass.

## Scope

Tier 5 is implemented as a final release readiness layer. It does not activate external systems, payments, device-specific immersive runtime, private data sync, analytics, business portal, or provider capability without credentials, consent, tests, deployment output, and smoke evidence.

| Feature | Route / API | Status | Source | Dependency | Privacy boundary | Test coverage | Deployment readiness |
|---|---|---:|---|---|---|---|---|
| Tier 5 command surface | `/tier5`, `/api/system/tier5` | local-verified | static contract and repo evidence | none for fallback | no private records or secrets rendered | contract test, build | ready for configured deploy |
| Replay Tier 5 lock | `/replay`, replay tests | local-verified | existing replay lock tests | browser proof depends on environment | public-safe and fallback-safe replay only | replay tier test | blocked for full lock until browser E2E passes |
| Legacy and mirror spatial boundary | `/spatial/legacy`, `/mirror`, `/dream`, `/ascent`, `/council` | contract-gated | existing route surfaces | provider wiring not assumed | no active external state shown | tier lock and build | fallback-safe only |
| Ecosystem contracts | docs/contracts and `/api/system/tier5` | contract-gated | docs and API contract | URAI app/core, jobs, content, asset factory, studio, analytics, business portal | auth, consent, entitlement, and privacy review required | docs plus contract test | blocked until external services prove readiness |
| Commerce and entitlement | `/api/entitlement` | credential-blocked | existing protected API surface | Firebase/Stripe credentials and permissions | server-governed only | rules check and protected smoke | blocked without credentials |

## Release decision

Tier 5 may be called locally implemented only after the verification ladder passes. Full production release requires browser E2E, deploy output, live URL, and live smoke evidence.
