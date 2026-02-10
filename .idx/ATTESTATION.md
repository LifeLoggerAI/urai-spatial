# URAI-SPATIAL — DEV ENVIRONMENT ATTESTATION

Repository: urai-spatial  
Environment: Google IDX  
Declared Stable: 2026-02  

---

## ATTESTATION STATEMENT

We attest that the development environment for this repository is:

- Deterministic
- Reproducible
- Schema-locked
- CI-guarded
- Free of implicit or undocumented behavior

The IDX configuration has been reviewed, validated, and sealed
against known-breaking schema changes.

---

## TECHNICAL BASIS

The following controls are in effect:

- Flat IDX preview schema (v1-compatible)
- Explicit toolchain versions (Node 20, pnpm, Nix stable-23.11)
- CI enforcement preventing schema drift
- Preview smoke tests validating launch intent
- Cryptographic hash verification (`IDX_LOCK_HASH.txt`)

No part of the dev environment relies on:
- Implicit defaults
- Auto-detected ports
- Nested or deprecated IDX fields
- External mutable state

---

## CHANGE GOVERNANCE

Any modification to the development environment requires:

1. Intentional change acknowledgment
2. CI verification pass
3. Updated LOCK documentation
4. Regenerated IDX lock hashes

Absent these steps, changes are invalid.

---

## DECLARATION

As of the declared date, the URAI Spatial development environment
is considered **stable, sealed, and production-aligned**.

This attestation represents engineering truth, not intent.

---

Signed,
URAI Engineering  
(Repository Authority)
