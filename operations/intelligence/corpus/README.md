# URAI intelligence evaluation corpus

This directory contains synthetic, provider-free seed cases and committed synthetic candidate outputs for the intelligence release gate. It does not contain real user data and does not certify provider or production behavior by itself.

Run:

```bash
node scripts/verify-intelligence-release-gate.mjs
node scripts/verify-intelligence-corpus.mjs
URAI_EXACT_HEAD=<exact-40-character-sha> node scripts/verify-intelligence-semantic-slice.mjs
URAI_EXACT_HEAD=<exact-40-character-sha> node scripts/verify-intelligence-semantic-suite.mjs
```

The corpus verifier validates structure and P0 family coverage. The original grounding/attribution slice remains a separately reviewable two-case increment. The all-P0 suite executes committed synthetic candidate outputs across all 14 required P0 families against predeclared fail-closed thresholds and emits exact-SHA, corpus, suite, and threshold digests plus failed-case IDs.

Passing committed synthetic outputs is non-certifying. Provider/model/configuration execution must separately bind the exact release SHA, corpus and suite digests, provider, model version, configuration, timestamp, aggregate metrics, failed-case IDs, and reviewer disposition.

No result may be promoted to release evidence when it is stale, belongs to another SHA or digest, contains unresolved P0 failures, lacks required independent technical, safety, or privacy review, or represents committed synthetic outputs as proof of provider behavior.
