# Adam and Person Presence content language handoff

This record began as an isolated server donor stacked on localization donor #1661 at `59570fd1eba87c0cbf28c7f931eab6343b136c61`. Its historical server verification below remains limited to that donor. The client language handoff was subsequently incorporated from donor #1675 through the sole Spatial release owner. At the inspected #1636 source checkpoint `8341cc64c6306f89dd18ef68f8ac13c4067789d0`, the actual clients consume the shared language contract. This advancing source checkpoint is not a frozen release or complete voice/language acceptance. Private Founder voice, identity/source authority, consent, provider activation and native translation gates retain their owners.

The existing servers accepted arbitrary locale strings, truncated them and interpolated them into provider instructions. Their upstream idempotency keys omitted the language, and their structured output carried no language metadata. Adam also accepted unequal message/caption content and streamed message text before validating any response language/caption. The full current governed catalogs already contain the twenty preparation locales; this donor does not invent catalog translations or native review.

## Server behavior

Both reasoning endpoints use the shared `packages/localization/src/contentLanguage.ts` contract. An absent locale retains explicit `en-US` compatibility. Governed aliases normalize to the canonical speech tag; unknown strings, overlong values and invalid non-string values are rejected before moderation or reasoning requests. The canonical tag enters upstream idempotency, model instructions, the strict schema and all status/delta/done events. Wrong or missing response metadata fails before generated output. Final captions equal the returned message.

Adam retains actual progressive upstream streaming. The schema/instructions request top-level locale, complete caption, then message. Only a complete validated locale/caption prefix permits progressive message deltas, and each decoded prefix must exactly match that caption. UTF-16 surrogate pairs are kept together. Message-first output waits for full structured validation. Invalid language/caption, divergent prefixes, changed final captions, incomplete output and oversized streams end with an error; no invalid final result is accepted. A valid prefix can precede a later upstream failure, as in the existing cancellable streaming contract. These source checks do not establish that the model's declared language is a native-quality translation.

Person Presence keeps its existing full-output evidence validation and post-stream consent/source-authority recheck before releasing any generated text. Locale metadata does not turn simulation into testimony or weaken claim IDs, historical cutoff, source revocation, scene truth or identity fences. Founder ElevenLabs provider bytes after `adamFounderVoiceProvider` are unchanged by this language donor. No stock identity fallback or accepted private voice was introduced.

## Converged client handoff

| Boundary | Boundary contract |
| --- | --- |
| Request locale | Capture the governed content locale once for the request and its stable identity. |
| Status and delta | Read `locale` as the canonical content speech tag; reject conflicting tags before playback. |
| Done response | Preserve `locale`, equal `caption`/`message`, and existing Adam human-founder or Person Presence source/truth fields. |
| Captions | Apply `contentLanguageProps(result.locale)` for `lang` and `dir`, including Arabic, Urdu and Persian. |
| Local recognition/playback | Use the captured or returned content tag through asynchronous work and cancellation. |
| Private provider voice | Keep existing accepted private Founder/person identity and provider language/model capabilities; a tag does not grant audio acceptance. |

The compatible client handoff is implemented in the inspected source. `AdamPresenceRuntime.tsx` captures the governed speech tag for a request, uses the validated event/result tag for buffered private speech, sets audio language metadata, and applies `contentLanguageProps` to displayed messages. `personPresenceClient.ts` canonicalizes the requested tag, includes it in stable request identity, and delegates streamed response validation to `presenceContentStream.ts`. That shared reader rejects unknown, noncanonical or conflicting tags before forwarding output and requires equal caption/message content. These are source findings; language metadata alone does not establish spoken language, identity, pronunciation, translation quality or real provider acceptance. Orb/narrator retain the separate #1661 content-language work. Existing sensitive UI English fallback and nineteen unreviewed translation release fences remain intact.

The following immutable source blobs bind this reconciliation to the inspected owner checkpoint; later source changes require a fresh check.

| Source | Git blob |
| --- | --- |
| `urai-tier1/src/spatial/adam/AdamPresenceRuntime.tsx` | `c4c450ffc8c857fae1728626413337b51fb61da9` |
| `urai-tier1/src/spatial/life-model/personPresenceClient.ts` | `3c1b991e8a810b2cd3409484ef36fda5b921f45b` |
| `urai-tier1/src/lib/i18n/presenceContentStream.ts` | `8e9b6e4ed526ba38207a47417fd74fbca5ec08f6` |
| `packages/localization/src/contentLanguage.ts` | `cb6b685cd570f1795b30855ae1b15365b45cadd2` |

## Historical donor verification and remaining acceptance

The historical server-donor focused actual-handler suite has 81 tests, using transpiled published source with synthetic Firebase/auth/consent/authority and provider transports. It covers all twenty tags on both endpoints, invalid input before upstream calls, wrong/missing response language, caption equality, language-bound upstream idempotency, genuine progressive Adam timing, message-first buffering, surrogate boundaries, bounded output, retained consent/source revocation and invalid person evidence. Against untouched #1661 server bytes it reproduces 73 failures and 8 retained passes; all 81 pass after the repair. Fourteen unchanged Adam/Person Presence contracts also pass, for 95 local passes with zero failures/skips. Strict TypeScript compilation covers the changed actual server modules and their shared language/source-authority imports using the installed Firebase SDK types. The exact-head workflow additionally compiles the complete canonical Functions project; native results must be read at the published head.

Synthetic English fixture text labeled with each transport tag is protocol coverage, not a reviewed translation. Remaining admission includes deliberate combined-source closure on the advancing Spatial candidate, exact combined-source native checks, real provider/proxy controls and bounded approvals, protected source/identity/voice evidence, nineteen native translation reviews, actual multilingual audio and caption/accessibility/RTL/device acceptance, and protected release/runtime evidence. No provider request, spend, approval signing, deployment, main/owner mutation, merge, voice identity acceptance or release acceptance occurred.
