# Tier 4 Integration Contract

## Purpose

Tier 4 coordinates the URAI Spatial product layer with external system surfaces while preserving safe fallbacks.

## Local surfaces

- Public page: `/tier4`
- System API: `/api/system/tier4`
- Existing entitlement boundary: `/api/entitlement`
- Existing provider boundary: `/api/system/launch-boundary`
- Existing XR boundary: `/api/xr/signaling`

## External dependencies

| Dependency | Tier 4 expectation | Current release posture |
|---|---|---|
| urai-studio | Contracted handoff only until provider wiring is verified | provider-gated |
| analytics | Aggregate-only readiness; no private raw stream exposed | provider-gated |
| urai-content | Content pipeline contract only until connected | provider-gated |
| urai-jobs | Job orchestration contract only until connected | provider-gated |
| asset-factory | Deferred and gated asset pipeline contract only | provider-gated |
| B2B / enterprise surfaces | Contract-only until auth, tenancy, billing, and privacy review pass | credential-blocked |
| Firebase / Firestore | Server-governed entitlement and consent boundaries | credential-blocked without deploy credentials |
| Stripe | Entitlement updates through protected server routes only | credential-blocked without secrets |

## Fallback rules

- Missing providers must return explicit fallback or gated status.
- No unsupported immersive, wearable, body-signal, private-memory, or asset pipeline capability is represented as active.
- No service accounts, tokens, secrets, or private memory data may be committed or rendered.
- Live deployment requires Firebase project permissions, deploy output, live URL, and live smoke evidence.
