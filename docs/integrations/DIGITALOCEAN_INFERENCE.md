# DigitalOcean Serverless Inference Integration

Status: source integration candidate. Live provider execution remains disabled until a scoped model access key is created, stored in Google Secret Manager / Firebase Functions secrets, the feature flag is enabled, and a bounded live canary is verified.

## Role

DigitalOcean is an optional UrAi provider lane for synthetic provider-health verification and future low-risk, capability-specific inference. It is not a mandatory dependency and does not replace the existing OpenAI, ElevenLabs, Firebase, or other provider lanes.

The initial integration is deliberately synthetic-only. It does not accept user memories, health information, biometrics, private voice, captured-reality media, precise location, legal/private documents, credentials, or private communications.

## Runtime path

UrAi authenticated client -> /api/urai/providers/canary -> Firebase Hosting rewrite -> providerCanaryRouter -> DigitalOcean adapter -> https://inference.do-ai.run/v1/chat/completions -> normalized synthetic result.

The canary sends a fixed synthetic prompt. No user-authored prompt or conversation context is forwarded to DigitalOcean.

## Provider identity and configuration

- Provider ID: digitalocean
- Feature flag: URAI_ENABLE_DIGITALOCEAN
- Secret: DIGITALOCEAN_MODEL_ACCESS_KEY
- Default model: openai-gpt-oss-20b
- Base URL: https://inference.do-ai.run/v1
- Endpoint: /chat/completions
- Server request timeout: 10 seconds
- Function timeout: 20 seconds
- Durable per-user rate limit: 4 canaries per minute
- Response cache policy: private, no-store, max-age=0

The model access key must be scoped to only the model or models required by UrAi. Do not use an all-model key when a single-model key is sufficient. Do not expose the key through NEXT_PUBLIC variables.

## Privacy boundary

DigitalOcean documents that it does not store model inputs or outputs on DigitalOcean infrastructure. For DigitalOcean-hosted models, requests remain on DigitalOcean infrastructure and are not sent back to the original model creator for training. This integration remains synthetic-only until a separate privacy/product approval expands its data classification.

The Files API, batch inference, model synthesis, and third-party commercial models are outside this canary's authority.

## Failure behavior

The adapter normalizes missing configuration, timeout, network failure, auth failure, rate limits, upstream failure, invalid responses, and canary mismatches. Core UrAi remains independent of this lane, and the canary is not mounted into the normal Orb conversation path.

## Cost controls

Serverless Inference is prepaid and usage-based. Keep DigitalOcean auto-reload off. The canary uses openai-gpt-oss-20b with output bounded to 32 completion tokens. Do not create persistent Droplets or GPU deployments for this integration.

## Enable procedure

1. In DigitalOcean Inference -> Manage, create a model access key scoped only to openai-gpt-oss-20b.
2. Store the one-time secret value as DIGITALOCEAN_MODEL_ACCESS_KEY in the canonical Google Secret Manager / Firebase Functions secret path.
3. Keep URAI_ENABLE_DIGITALOCEAN=false until the secret binding and deployment are confirmed.
4. Deploy providerCanaryRouter through the governed Firebase deployment path.
5. Set URAI_ENABLE_DIGITALOCEAN=true.
6. From an authenticated UrAi account with saved model-processing consent, invoke the same-origin canary client.
7. Verify HTTP 200, X-URAI-Provider: digitalocean, synthetic: true, bounded usage, telemetry, and current DigitalOcean billing.
8. Run a disabled-provider negative test and restore the intended flag state.

## Disable and rollback

Set URAI_ENABLE_DIGITALOCEAN=false. The canary then fails closed before an upstream request. If credential compromise is suspected, regenerate or delete the model access key in DigitalOcean and replace the Secret Manager value. Core UrAi routes remain operational because no normal product route depends on this canary.

## Incident response

- Keep prompt and output logging disabled.
- Rotate the model access key immediately if exposure is suspected.
- Review aggregate providerTelemetry/digitalocean only; it stores no prompt or generated text.
- Confirm the DigitalOcean prepaid balance and spend alert.
- Keep auto-reload off.
