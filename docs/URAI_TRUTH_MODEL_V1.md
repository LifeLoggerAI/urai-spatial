# URAI Truth Model V1

Status: launch-convergence source authority; exact-head verification required.

URAI persists semantic meaning using these non-interchangeable truth classes: `observation`, `autobiographical-memory`, `user-assertion`, `interpretation`, `hypothesis`, `forecast`, `scenario`, `generated-context`, `unknown`, and `disputed`.

## Invariants

1. Revocation or deletion removes processing authority.
2. User correction supersedes system-derived autobiographical interpretation without rewriting the historical source record.
3. Direct authorized evidence outranks generated inference for factual attributes.
4. Material conflict becomes `disputed`; URAI does not silently pick a winner.
5. `scenario`, `forecast`, `hypothesis`, `interpretation`, and `generated-context` cannot promote themselves into factual reality.
6. `unknown` is a first-class terminal state.
7. `confirmed` reconstruction means source-backed provenance, not mathematical probability.
8. High evidence support requires an authorized source and no material unresolved conflict or generated-context dependence.

The release-blocking rule is: **Reality may seed a Scenario. A Scenario cannot create reality merely by saying it happened.**
