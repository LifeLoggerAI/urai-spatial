# Multilingual speech inference policy guard and evaluation

Source proposal, November 4, 2026. This document describes an isolated policy module and synthetic evaluation. It does not enable a provider, public endpoint, passive capture, or production emotional inference.

## Behavior

`urai-tier1/src/lib/speechInference/guard.mjs` accepts separately supplied acoustic features, attributed self-reports, upstream interpretation candidates, correction metadata, and current-owner policy ports. Processing starts disabled. Enabling the internal processing option still requires current exact-owner, purpose-specific permission supplied through the trusted policy port. Request JSON is not an authorization source.

Feature measurements keep their names, units, source references, and origin. Model candidates stay interpretations. An acoustic candidate cannot declare itself an observation or user assertion. The guard never infers anger, sadness, empathy, personality, sincerity, or deception from pitch, loudness, switching languages, or a classifier score. An explicit self-report remains attributed testimony. A supported lexical style candidate may produce a possible utterance-style interpretation; it does not establish a person's empathy.

The guard copies input and initial authority values before asynchronous reads. It checks authority before protected feature/baseline reads and after asynchronous work, including the final delivery boundary. Owner, revision, permission, and baseline-capability changes invalidate the result. Revocation calls the purge port; a failed purge rejects delivery. Owner corrections require matching owner, target, and revision and supersede the prior interpretation. Stale model replies cannot supersede the correction.

The existing manual weather session supplies manual readings in the adapter. The module adds no active UI wiring. The current manual weather feature remains the source of its own viewer leases, off default, explicit selections, and clearing behavior.

`baseline.mjs` supports only explicitly authorized session-local prosody normalization. It checks owner and speaker metadata before reading distribution values. Unknown/uncertain speakers, foreign references, denied capability, insufficient samples, and invalid scales cannot supply normalization. A normalized pitch deviation carries no emotional meaning by itself. The five-sample floor and feature reliability floor of 0.5 are engineering proposals, not empirically validated thresholds.

## Research and design scope

Professor Julia Hirschberg recommended reviewing Columbia Speech Lab publications. Her recommendation is research guidance, not endorsement of UrAi, agreement to participate, or validation of this module. No further correspondence was requested or sent for this work.

- Bhattacharya, Marchini, and Hirschberg, *The Sound of Code-Switching: Prosodic Profiles of Spontaneous Spanish-English Speech* (Interspeech 2026): spontaneous code-switched prosody differed from monolingual prosody in the studied corpus, with speaker-specific factors especially influential. This was a prosody study, not validation of a person's emotions. [Primary paper](https://www.cs.columbia.edu/speech/PaperFiles/2026/CSW_Prosody_Interspeech2026.pdf).
- Bhattacharya, Lin, Chen, and Hirschberg, *Switching Tongues, Sharing Hearts* (Interspeech 2024): lexical associations with model-estimated empathy were more consistent across the three language pairs. Adding acoustic features strengthened the Spanish-English association but weakened it for Mandarin-English and Hindi-English. Translations and English-trained models were proxies, and causation was not established. [Primary paper](https://www.cs.columbia.edu/speech/PaperFiles/2024/interspeech24_csw_empathy_paper.pdf).
- [Columbia Speech Lab archive](https://www.cs.columbia.edu/speech/papers.cgi).

The cases and policy rules are UrAi engineering proposals. Numeric feature values, model candidates, context annotations, and utterances are synthetic. No private recording, synthesized voice, corpus recording, model request, or paid processing is used. The suite cannot establish scientific validity, speaker population error rates, multilingual ASR accuracy, acoustic feature extraction accuracy, emotional understanding, or native-language acceptance.

## Fixtures and acceptance

`urai-tier1/tests/fixtures/multilingual-speech-v1/cases.json` contains 30 cases spanning code-switching, session speaker adaptation, conversation context, lexical/acoustic disagreement, uncertain/missing/unsupported input, owner corrections, revocation, and manual weather. Five positive assertion cases and a tentative style case prevent an implementation that simply returns unknown from passing.

Fixture revision 1.1.0 preserves the original 30 scenarios and policy expectations, and adds explicit upstream context/style hypotheses and prior-claim ownership. The adapter does not infer those hypotheses from the examples or inspect expected outputs. This revision tests how the guard handles upstream hypotheses; it does not test a language classifier. Original language spans are retained, including Romanized and Devanagari Hindi examples. Native-language review is not claimed.

Pass requires every case exactly once, all specified attribution/conflict/uncertainty behavior, lossless source spans where authorized, no factual emotional claims, no foreign baseline use, correct correction/revocation behavior, and zero prohibited side effects. Baseline arithmetic tolerance is 0.000001. Equivalent neutral language cases and the paired speaker baseline cases retain the same status/assertions/interpretations while feature values may differ.

`evaluate.mjs` checks the normalized envelope and rejects extra free text or confidence fields, missing/duplicate cases, lost qualifiers, source/owner errors, side effects, and stale fixture hashes. `examples.json` is explicitly example-only and cannot count as a repository-adapter receipt.

The actual adapter uses real guard/manual-session code, frozen source requests, and instrumented ports. It installs throwing external-transport and console spies during each guard evaluation and records actual baseline reads and purges. Gold expectations and case IDs do not enter guard code. Fixture grants are controlled synthetic policy snapshots, not deployed authorization evidence.

## Repository test integration

Both existing focused unit runners register:

- `tests/multilingual-speech-guard-contract.test.mjs`: all 30 cases against the module plus additional permission, provenance, source mutation, baseline, correction, transport, and purge failure tests.
- `tests/multilingual-speech-evaluator-contract.test.mjs`: the existing 39 checker tests, including deliberate invalid envelopes.

`tests/unit-runner-coverage.test.mjs` requires both registrations. Reuse existing `emotional-weather-contract.test.mjs` and `speaker-awareness-contract.test.mjs`; this change does not duplicate biometric matching or replace manual session logic.

From `urai-tier1`, with the normal workspace dependencies installed:

```sh
node scripts/require-test-bootstrap.mjs
node --import tsx --test tests/multilingual-speech-guard-contract.test.mjs tests/multilingual-speech-evaluator-contract.test.mjs tests/unit-runner-coverage.test.mjs tests/emotional-weather-contract.test.mjs tests/speaker-awareness-contract.test.mjs
```

The locally available runtime was Node v24.22.1. Local execution used native TypeScript loading with a scoped resolver for the existing extensionless TypeScript imports; it did not install tsx or substitute a full repository build. The native focused run passed 115 tests: 63 guard tests, 39 checker tests, one runner registration test, and 12 unchanged weather/speaker regression tests. Full frozen dependency installation, typecheck, complete application build, and hosted CI are not certified by this result.

## Production and consent integration still required

Bind the authority port to actual current-owner policy, exact processing purpose, consent receipt/version/expiry, and source permission checks. The inspected Privacy registry distinguishes transcription from AI insights. Its draft tier document calls C5 biometric identity while executable policy maps C5 to analytics and does not register `speaker_baseline`. This change does not resolve that discrepancy or create a production baseline grant. Persistent adaptation remains blocked pending reconciliation and review.

Before an actual speech-inference feature can launch, implement and verify real source/provider and authorization ports, lifecycle wiring, privacy deletion/export integration, actual UI/caption/visual uncertainty, protected source delivery, and relevant native-language and device acceptance. A local synthetic policy pass is not production parity or independent release approval. This proposal targets the existing release controller as a draft donor and does not establish a second release authority.
