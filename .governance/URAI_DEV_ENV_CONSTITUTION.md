# URAI DEV ENV CONSTITUTION

Version: 1.0  
Ratified: 2026-02  
Authority: URAI Engineering  

---

## PURPOSE

This constitution defines the non-negotiable principles governing
development environments across all URAI repositories.

Its purpose is to ensure:
- Determinism
- Reproducibility
- Auditability
- Long-term survivability

---

## ARTICLE I — SINGLE SOURCE OF TRUTH

Every URAI repository using Google IDX MUST contain:

- `.idx/dev.nix`
- `.idx/LOCK.md`
- `.idx/STATUS.md`
- `.idx/IDX_LOCK_HASH.txt`
- `.idx/ATTESTATION.md`
- `.idx/ATTESTATION.md.asc`

Absence of any artifact renders the repo **non-compliant**.

---

## ARTICLE II — SCHEMA INVARIANTS

- Only flat IDX preview schemas are permitted
- Deprecated or nested IDX fields are forbidden
- Toolchain versions must be explicit
- Implicit defaults are disallowed

---

## ARTICLE III — CHANGE AUTHORITY

Changes to dev environments require:
1. Intentional declaration
2. CI validation
3. Updated lock documentation
4. Regenerated cryptographic hashes
5. Re-signing of attestations

No exceptions.

---

## ARTICLE IV — CRYPTOGRAPHIC WITNESS

All dev environments must be:
- Hash-anchored
- GPG-signed
- Time-anchorable

Trust is derived from math, not memory.

---

## ARTICLE V — PRECEDENCE

In any conflict:
- This constitution overrides local documentation
- Sealed artifacts override human recollection

---

## RATIFICATION

This constitution is effective immediately
and applies retroactively to all URAI repositories.

---

Signed,  
URAI Engineering Authority
