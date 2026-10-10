# UrAi Android packaging preparation

Status: **PACKAGE REGISTERED / EXISTING INTERNAL RELEASE / CURRENT CI PREPARATION UNSIGNED**

This lane packages the current governed UrAi static export into an Android shell without touching Spatial scene/pixel ownership, production deployment, billing, provider secrets, or Play signing state.

## Provider evidence and current authority

As of 2026-10-07, the current authenticated Play Console release, actual bundle versionCode and testing/production state are **NOT VERIFIED**. The current actual versionCode is **UNKNOWN** until a fresh authenticated release-details or bundle-manifest readback resolves the retained conflict. This does not authorize a new upload or version-code guess.

Retained observations must keep their dates:

- `play-console-receipt-20261006.json` records a 2026-10-06 Console observation for package `com.urailabs.urai`, developer account `5930711665694942613`, app `4972566068213337893`, internal release label `UrAi Internal 0.1.126 - 82a708f2`, versionCode 126, and versionName `0.1.126-unsigned`. The dated JSON is preserved unchanged.
- Provider support dated 2026-10-06 confirms the inactivity issue was resolved and the app was no longer at risk of closure for inactivity. Its quoted 2026-10-01 account report corrects the release's actual version code to **1**, while preserving the same release label containing **126**. The quoted report is historical, not a fresh October 7 Console readback.
- A release **label** containing 126 is not proof of bundle **versionCode** 126. The retained reports conflict on that field and must not be silently reconciled or relabeled as current store truth.
- The retained Console receipt records Play signing and public app/upload certificate fingerprints, with no private key read or key change. Those dated identities do not prove current signing custody or accept a successor artifact.
- The retained production/closed-testing status and requirements are historical observations. Current track state, tester counts, production access and policy state require authenticated provider readback before store action.

The support-resolved inactivity issue is not treated as an active launch blocker on that evidence. Signing custody, final frozen-source binding, physical acceptance and current store authority remain distinct gates. No obsolete or incorrectly signed build may be uploaded to create activity.

The release label supplies only predecessor source prefix `82a708f2`; full source binding and artifact bytes were not independently verified by these observations. Existing internal delivery does not accept the current Spatial candidate. A versionName containing “unsigned” is separate from Play's dated app-signing observation.

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
