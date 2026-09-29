# Independent offline reviewer keys

UrAi permits independent human release review without granting the reviewer permanent access to the private GitHub repository.

A trusted offline reviewer must generate and retain their own private signing key. Only the corresponding public key is committed here before the release candidate is frozen.

For LimberNutz0, the expected public-key path is:

`docs/release-governance/reviewers/LimberNutz0-public.pem`

The reviewer must generate the key on a machine they control and provide only the public key for inclusion in the repository. The founder must not generate, possess, or retain the reviewer's private key.

Example with OpenSSL using Ed25519:

```bash
openssl genpkey -algorithm ED25519 -out LimberNutz0-private.pem
openssl pkey -in LimberNutz0-private.pem -pubout -out LimberNutz0-public.pem
```

The private key remains with LimberNutz0. The public key may be committed before final SHA freeze.

After the final SHA is frozen, the reviewer personally inspects the exact candidate and retained evidence, completes the independent attestation, hashes the signed attestation file, constructs the canonical approval message required by the Release Governance Guard, and signs that message with the private key.

A later GitHub-native review by `LimberNutz` may supplement the offline review but does not retroactively change the SHA, time, or scope of the original independent decision.

The governed Android signing workflow validates the same native-or-cryptographic independent approval contract after merge. A valid external approval therefore does not require giving the reviewer permanent repository write access solely to sign the Android artifact.
