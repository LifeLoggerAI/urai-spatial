# UrAi Founder Voice Runtime V1

Status: integration scaffold only. No founder voice model is asserted by this document.

## Authority boundary

The human recording, curated corpus, frozen evaluation holdout, provider enrollment media, and provider receipts remain outside the public runtime. The web client never receives a founder voice ID, provider secret, raw recording, corpus, or holdout artifact.

The founder runtime route is:

`POST /api/urai/founder-voice/elevenlabs`

Firebase Hosting rewrites that same-origin path to `founderVoiceProvider` in `us-central1`.

## Fail-closed activation

The server requires all of the following before founder speech can be synthesized:

- `FOUNDER_VOICE_ENABLED=true`
- a non-empty `FOUNDER_VOICE_ID`
- that same ID present in server-only `ELEVENLABS_ALLOWED_VOICE_IDS`
- an authorized `ELEVENLABS_API_KEY` secret
- authenticated Firebase user with revoked-token checking
- saved, fully enforced model-processing consent
- provider processing permission not revoked
- explicit consent on the current request
- per-user durable provider throttling

Until those conditions exist, founder synthesis fails closed. `FOUNDER_VOICE_ID` must remain empty in source and examples until an authorized evaluated clone exists.

## Performance modes

The isolated founder endpoint recognizes these identity-preserving delivery modes:

- natural
- neutral
- warm
- reflective
- serious
- curious
- excited
- quiet
- reassuring
- authoritative

These modes alter provider delivery settings without selecting a different public voice identity.

## Model-collapse protection

Only authorized human-source material may create or improve the founder model. Generated founder speech is evaluation output, never future human-source authority. The frozen evaluation holdout must never be used for enrollment, tuning, pronunciation tuning, or failure correction.

## Kill switch and revocation

`FOUNDER_VOICE_ENABLED=false` disables founder synthesis independent of avatar rendering. Provider revocation state and privacy-policy enforcement are also checked on each authorized request. If the founder endpoint is unavailable or disabled, callers must retain a non-founder text/silent fallback instead of substituting another voice and presenting it as the founder.

## Integration boundary

`founderVoiceClient.ts` is deliberately separate from the existing narrator client. That prevents the current narrator voice from being mislabeled as the founder and prevents a future founder clone from silently becoming the unrestricted generic narrator. Final binding into Home, Life Map, Focus, Replay, face/viseme timing, body performance, and spatial audio must occur only after a real founder model ID exists and blind evaluation is accepted.
