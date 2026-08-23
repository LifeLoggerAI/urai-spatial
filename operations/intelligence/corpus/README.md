# URAI intelligence evaluation corpus

This directory contains synthetic, provider-free seed cases for the intelligence release gate. It does not contain real user data and it does not certify model behavior by itself.

Run:

```bash
node scripts/verify-intelligence-release-gate.mjs
node scripts/verify-intelligence-corpus.mjs
```

The corpus verifier validates structure, P0 family coverage, prohibited outcomes, and produces a non-certifying receipt. The receipt deliberately reports `NO_GO_PENDING_SEMANTIC_EXECUTION`. Provider-backed evaluation must separately bind the exact release SHA, corpus digest, provider, model version, configuration, timestamp, aggregate metrics, failed case IDs, and reviewer disposition.

No result may be promoted to release evidence when it is stale, belongs to another SHA or corpus digest, contains unresolved P0 failures, or lacks the required independent review.
