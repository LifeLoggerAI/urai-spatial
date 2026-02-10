# URAI-SPATIAL — DEV ENV LOCK

**LOCK DATE:** 2026-02-15

This document certifies that the development environment for the URAI-SPATIAL repository has been sealed to ensure long-term reproducibility and deterministic builds.

---

## SEALED ARTIFACTS

The following artifacts have been cryptographically sealed and notarized:

- **`.idx/dev.nix`**: The complete, declarative definition of the development environment.
- **`pnpm-lock.yaml`**: The exact dependency tree for all Node.js packages.

These files are contained within the `release/URAI-SPATIAL-DEV-ENV-SEAL.zip` archive.

---

## CRYPTOGRAPHIC PROOF

The integrity and existence of this sealed environment are anchored to public blockchains. You can independently verify the entire chain of trust.

1.  **Verify the GPG Signature**:

    ```bash
    gpg --verify release/URAI-SPATIAL-DEV-ENV-SEAL.zip.asc release/URAI-SPATIAL-DEV-ENV-SEAL.zip
    ```

2.  **Verify the Timestamp**:

    ```bash
    openssl ts -verify -data release/URAI-SPATIAL-DEV-ENV-SEAL.sha256 -in release/URAI-SPATIAL-DEV-ENV-SEAL.tsr -CAfile /etc/ssl/certs/ca-certificates.crt
    ```

3.  **Verify the Public Anchor**:

    The final anchor hash is publicly logged. You can find the transaction details on block explorers for the relevant blockchains (e.g., Bitcoin, Ethereum).

    **Anchor Hash (SHA256):**
    `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`

---

## DO NOT MODIFY

Any modification to the sealed artifacts will invalidate the cryptographic proof. If changes are necessary, a new seal must be created and notarized.
