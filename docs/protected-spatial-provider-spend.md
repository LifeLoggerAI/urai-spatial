# Spatial protected provider spending

This source donor protects the actual server HTTP leaves for Orb/Adam/person reasoning, their screening calls, narrator/Founder/person voice, and Anthropic/Gemini/xAI/Mistral Council requests. Request authentication, consent, rate limits, voice identity, private person-source authority, correction/revocation rechecks, language validation and output bounds remain required. Their presence does not authorize money.

The isolated source is stacked on the released language owner [Spatial #1668](https://github.com/LifeLoggerAI/urai-spatial/pull/1668), exact `52fd832b983efef081fea10cde23bc1e8b651e05`, whose parent is #1661 `59570fd1eba87c0cbf28c7f931eab6343b136c61`. That lineage retains the original `d67a7e20fe2aa3d0276620f354587f3678e1aa27` candidate. The later #1636/#1656 owner heads remain separate admission dependencies; this donor does not rewrite them or claim that separate source heads form a deployed release.

The shared helper requires the compatible canonical Factory gateway v2 contract, published in donor [Factory #443](https://github.com/LifeLoggerAI/asset-factory/pull/443) at `047c8429626300c9896bc8c4b739b5902575ad38` above immutable #439 `434f56442409f696db4107d819221b2dc6cefb25`. Factory and Spatial retain their distinct exact Git identities. The eventual combined/admitted Factory source may differ from this donor head and must receive its own exact deployment proof. No source donor, CI result, enable flag, rate limit, timeout, client-supplied approval field or successful response grants financial approval or protected-runtime acceptance.

## Protected provisioned inputs

Provide these only through governed server configuration and genuine protected records:

- `URAI_SOURCE_SHA`: the actual Spatial Git head. The helper requires clean tracked enforcement source with that head; runtimes without verifiable provenance stay closed.
- `SPATIAL_PRODUCTION_SPEND_URL`: the HTTPS canonical gateway endpoint ending `/api/worker/production-spend`.
- `SPATIAL_SPEND_GATEWAY_SOURCE_SHA`: the separately verified actual Factory gateway head.
- `SPATIAL_SPEND_WORKER_TOKENS_JSON`: a Function secret mapping protected worker IDs to `{token, gateway_origin}` records. The HTTPS gateway origin must exactly match the secret-bound origin before any credential is sent; legacy token strings fail closed. Every affected Function declares this secret. Tokens must match the gateway's fixed scoped registry; an ID from a request body is never a worker credential.
- `spatialPaidProviderBindings/<locator SHA256>`: server-only metadata locating the canonical protected job, worker and API account. The existing production rules default-deny unmatched collections. No runtime client writes this metadata, an approval or a reservation.

The locator is SHA256 of stable sorted JSON containing `tenant_sha256`, `lane`, `request_sha256` and `source_input_sha256`. Tenant SHA is SHA256 of the authenticated UID. Source-input SHA covers stable JSON `{uid,lane,input:<actual request body>}`. Request SHA covers `POST\n<actual canonical endpoint>\n` followed by the exact frozen provider body bytes. Request size is its decimal byte count. Credentials are hashed from stable JSON of normalized effective `authorization`, `xi-api-key`, `x-api-key` and `x-goog-api-key` headers; all remaining effective headers form the separate semantic-header hash. No plaintext credential enters a job, proof, metadata locator or outcome observation.

For person screening/reasoning, `input` includes the actual request and the loaded `authority_digest`; person voice additionally binds the accepted `render_binding_sha256`. Those values come from the existing protected source/voice authority paths. Their current rights/revocation rechecks and caller cancellation remain independent prerequisites throughout admission and streaming.

Metadata must bind `job_id`, `worker_id`, `account_id`, authenticated tenant SHA, lane, provider, actual executor SHA, exact input/request hashes and credential hash. It only locates a job; the canonical signed approval, independently verified deployment/control proofs, real balances/pricing and atomic global account reservation authorize dispatch.

## Actual call coverage

| Server export | Protected lane(s) |
| --- | --- |
| `openAiOrbProvider` | `orb-moderation`, `orb-reasoning` |
| `elevenLabsVoiceProvider` | `narrator-voice` |
| `adamPresenceProvider` | `adam-moderation`, `adam-reasoning` |
| `adamFounderVoiceProvider` | `founder-voice` |
| `personPresenceProvider` | `person-moderation`, `person-reasoning` |
| `personPresenceVoiceProvider` | `person-voice` |
| `anthropicCouncilProvider` | `council-anthropic` |
| `geminiCouncilProvider` | `council-gemini` |
| `xaiCouncilProvider` | `council-xai` |
| `mistralCouncilProvider` | `council-mistral` |

These are actual dispatched HTTP leaves in the five server modules. The additional Council routes were found from their concrete POST code, rather than configuration labels. Council owner #1658 availability-truth source is not changed by this donor. Other provider adapters outside this bounded lane require their own current-source coverage and protected admission; this table does not certify the whole estate.

The immutable candidate's Council registry/client delegates its OpenAI route to `requestOpenAIOrb`, which reaches the protected Orb screening and reasoning leaves above. Its four external route URLs reach the exported Council Functions in `apps/functions/src/index.ts`; each concrete provider POST now uses the same helper. The authored `local-fallback` route performs no provider POST. Registry admission strings are not evidence of deployed availability, spend approval or current runtime readiness. This donor leaves the Council owner's public availability wording and configuration untouched.

## Reservation and uncertain outcomes

Preflight is non-authorizing. The helper verifies its protected job against actual worker/source/tenant/account/model/endpoint/body/header/credential/input fields, fresh account credential mapping and protected deployment/cap controls, then reserves exactly once. `envelope.protected_pricing` must bind provider/account/model/request plus the four actual credential/header/input/content fingerprints, trusted fresh readback, a nonempty receipt and exact fresh signed budget rates. Missing, stale or mismatched pricing rejects before reserve. Account/controls/pricing freshness and actual clean source/input fixity are checked again after reserve and before dispatch; drift retains the hold without a provider POST. A lost reservation response never triggers a provider call or an automatic retry. Factory successor #445 requires `admission_expires_at` on both replies and `reserved_at` on reservation. Missing/expired deadlines fail closed. Reservation latency consumes the monotonic runtime envelope; it never restarts it. The helper checks deadline, protected proof freshness and clean source/input before dispatch and after awaited headers/chunks. The only provider POST uses the frozen admitted bytes, headers and credentials, redirects disabled, and the approved runtime deadline plus the existing caller signal.

Stream completion, stream failure, cancellation, timeout and successful audio/text only produce a non-authorizing `record` observation. The full hold remains unresolved until the independent authenticated actual-charge feed signs and supplies a final canonical reconciliation receipt. The Spatial worker has no reconciliation credential or reconciliation call path. Missing or stale proof, unknown outcomes and failed observation remain closed for replay.

## Remaining acceptance

Native source tests use synthetic in-process identity, Firestore and HTTP services. They execute no provider requests and cannot grant authentic spend, language review, voice rights, runtime acceptance or release certification. Before any paid dispatch, the gateway successor and this executor must be deliberately admitted, independently proven at their exact deployed/compiled heads, provisioned with genuine worker/account/credential/tenant mappings, bounded signed jobs and protected caps, and connected to independently authenticated final-charge settlement. No signature, account configuration, paid canary, merge or deployment is performed by this donor.
