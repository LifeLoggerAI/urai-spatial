# UrAi Android packaging preparation

Status: **PACKAGE CANDIDATE / UNSIGNED BUILD ONLY / NOT PLAY-REGISTERED**

This lane packages the current governed UrAi static export into an Android shell without touching Spatial scene/pixel ownership, production deployment, billing, provider secrets, or Play signing state.

## Current provider evidence

Direct Play Console verification on 2026-09-26 established:

- existing developer account `5930711665694942613`;
- existing UrAi app internal ID `4972566068213337893`;
- account contact email and phone are already verified;
- Internal testing contains a draft release but no uploaded app bundle;
- Production, Open testing, and Closed testing have no releases;
- Android developer verification has no registered package names or signing keys;
- the current UI did not expose any existing package name or signing-certificate fingerprint.

Historical connected GitHub searches found Android experimentation in `UrAi-Dev` (`AuthActivity.kt`, `UraiMessagingService.kt`, and a partial manifest), but no package declaration, Gradle namespace, keystore/signing reference, `google-services.json`, Firebase Android `package_name`, or `mobilesdk_app_id`.

Therefore this branch uses **`com.urailabs.urai` only as a reversible candidate**. It must not be treated as permanently bound until a validated signed artifact is accepted by Google Play.

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

## Signing boundary

Do not:

- generate a throwaway upload key;
- commit a keystore or password;
- reset/rotate a Play signing or upload key;
- upload this CI artifact to Play;
- register the candidate package name simply to make a deadline look green.

Before Play upload, establish durable upload-key custody in an approved secret store, sign the exact validated AAB, record the certificate fingerprints, register the exact package/signing identity through Android developer verification, and retain provider-native evidence.

## Runtime authority

This lane packages the exact branch checkout. It does not certify the visual/runtime state as final launch authority. If the canonical Spatial release candidate changes, rebuild from the accepted successor head and treat predecessor Android artifacts as historical.
