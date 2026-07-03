# URAI Provider Status

Last verified: 2026-07-03

Provider presence in source code or a secret name does not prove that a provider is live. A live claim requires a bounded authenticated request, expected result, failure behavior, timestamp, environment, and cost authorization where applicable.

| Provider area | Repository | Source status | Live proof status | Claim boundary |
| --- | --- | --- | --- | --- |
| Image generation/rendering | `asset-factory` | Provider-backed V1/V2 workflows and evidence formats exist | Paid generation not initiated during this pass | Assets already promoted may be described by their recorded provenance; no new paid proof claimed |
| Jobs callbacks | `asset-factory`, `urai-jobs` | Callback authentication and allowed-origin guard exist | `URAI_JOBS_CALLBACK_ALLOWED_ORIGIN` configuration not verified | Do not enable callbacks until exact approved origin is configured |
| Studio integrations | `urai-studio` | Health/provider readiness scripts exist | Current production endpoints and credentials unverified | Placeholder/local health is not production proof |
| Content providers | `urai-content` | Provider evidence checks exist | Deployment intentionally blocked | Keep provider-dependent features blocked |
| Narration/TTS | Storytime and spatial narration surfaces | Source hooks or models may exist | Paid/live request unverified | Do not claim live narration provider |
| OpenAI/AI services | Multiple supporting repos | Environment names and client code may exist | Current authenticated production proof unverified | Do not infer availability from environment-variable names |
| Billing/Stripe | Storytime and business surfaces | Models/configuration references may exist | Billing, prices, and production transactions unverified | No paid or billing claim |
| Firebase | Multiple repos | Project configuration exists | Runtime-specific evidence varies | Firebase presence is not proof of correct target, rules, auth, or persistence |

## Required provider evidence

1. Exact repository and commit.
2. Environment and endpoint.
3. Secret names used, never values.
4. Bounded non-destructive request.
5. Expected authenticated response.
6. Negative-path and timeout behavior.
7. Rate and concurrency controls.
8. Cost ceiling or explicit approval for paid work.
9. Monitoring and alert path.
10. Rollback or disable procedure.
