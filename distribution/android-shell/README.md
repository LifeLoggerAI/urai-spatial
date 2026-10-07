# UrAi Android packaging preparation

Status: **PACKAGE REGISTERED / EXISTING INTERNAL RELEASE / CURRENT CI PREPARATION UNSIGNED**

This lane packages the current governed UrAi static export into an Android shell without touching Spatial scene/pixel ownership, production deployment, billing, provider secrets, or Play signing state.

## Current provider evidence

Authenticated Play Console readback on 2026-10-06 supersedes the September 26 no-bundle observation:

- package `com.urailabs.urai` is accepted and must remain stable;
- developer account `5930711665694942613`, app `4972566068213337893`;
- internal release `UrAi Internal 0.1.126 - 82a708f2` is available to internal testers;
- actual bundle versionCode **126**, versionName `0.1.126-unsigned`, minimum API 24, target SDK 36;
- Play explicitly reports **Releases signed by Play** and an app-signing key in use;
- public certificate SHA-256 fingerprints and observation limits are in `play-console-receipt-20261006.json`;
- Production is inactive; the dashboard shows zero closed-test opted-in testers and requires at least 12 testers for 14 days before applying for production access.

The release label supplies only predecessor source prefix `82a708f2`. Full source binding and artifact bytes were not independently verified here. Existing internal delivery does not accept the current Spatial candidate. The versionName text “unsigned” is separate from Play's app-signing state.

## Build boundary

The workflow:

1. installs the canonical repository dependencies;
2. runs the existing governed static-export build;
3. installs pinned Capacitor 8.5.2 packages in this isolated folder;
4. generates the Android project in CI;
5. syncs the static export into that project;
6. builds a Release Android App Bundle;
7. uploads the AAB as CI evidence.

The CI artifact is intentionally **unsigned / non-publishable**. It is proof of package construction only.

Native Google account sign-in uses the pinned Credential Manager bridge when canonical Android Firebase configuration is present. Without that configuration, unsigned preparation excludes the native auth plugin and disables native sign-in without attempting a Google WebView popup. Governed signing additionally requires the canonical native configuration. See [NATIVE_GOOGLE_AUTH.md](NATIVE_GOOGLE_AUTH.md) for configuration, certificate and device-acceptance prerequisites. Google Workspace authorization remains a separate native return-path gate.

## Signing boundary

Do not:

- generate a throwaway upload key;
- commit a keystore or password;
- reset/rotate a Play signing or upload key;
- upload this CI artifact to Play;
- alter the already accepted package identity to make a deadline look green.

Before Play upload, establish durable upload-key custody in an approved secret store, sign the exact validated AAB, verify its public upload certificate against the accepted Play upload identity, retain artifact/source hashes, and record provider-native delivery evidence. Any separate developer-verification status must be freshly inspected.

## Runtime authority

This lane packages the exact branch checkout. It does not certify the visual/runtime state as final launch authority. If the canonical Spatial release candidate changes, rebuild from the accepted successor head and treat predecessor Android artifacts as historical.


## Governed signing preparation

The repository includes a manual-only `Android Governed Signing Prep` workflow. It does not generate signing identity and it does not upload to Google Play.

It requires an exact source SHA plus four deliberately provisioned repository secrets:

- `ANDROID_UPLOAD_KEYSTORE_B64`
- `ANDROID_UPLOAD_KEYSTORE_PASSWORD`
- `ANDROID_UPLOAD_KEY_ALIAS`
- `ANDROID_UPLOAD_KEY_PASSWORD`

The workflow fails closed when any credential is absent, rebuilds from the exact requested source SHA, confirms the candidate package identity, signs the AAB, verifies the signature, records the public upload-certificate SHA-256 fingerprint, retains the signed AAB as evidence, removes the runner-local keystore, and records `play_upload_performed=false`.

Access to the existing durable upload key and any required signing-secret provisioning remain owner-controlled actions. The existing accepted package/signing identity must be preserved. Do not use the workflow with a disposable key merely to satisfy an account deadline.
