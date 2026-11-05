# Native Google account sign-in

The Android shell uses the pinned `@capacitor-firebase/authentication@8.5.2` Credential Manager implementation to obtain a Google ID token. It passes that credential directly to `signInWithCredential` in the existing Firebase JavaScript account authority. `skipNativeAuth: true` avoids creating a second native Firebase session. Tokens are neither logged nor copied into a custom store. Sign-out closes the authoritative JavaScript session before requesting the native account chooser reset. Web builds retain Firebase's browser popup. Native cancellation, a missing token, an unsupported native platform, or missing native configuration cannot fall back to an embedded Google popup.

## Canonical configuration boundary

Provision `ANDROID_FIREBASE_GOOGLE_SERVICES_JSON` from the **existing** Firebase project `urai-4dc1d` and Android app `com.urailabs.urai`. The preparation script requires the canonical project number, one matching Android client, an Android Firebase app ID, a web OAuth client, an Android OAuth client with a SHA-1 certificate, and a public API key. It records the configuration SHA-256 and public certificate SHA-1 values without publishing the configuration or tokens. A valid exported configuration does not prove live Google provider enablement or certificate ownership.

If that configuration is absent, unsigned package preparation remains available with the native Firebase plugin excluded and native sign-in explicitly unavailable. Governed signing requires the configuration in addition to its existing exact-head review, merged-source, protected-environment and durable upload-key gates. No disposable key, store upload or production deployment is introduced.

Owner prerequisites:

1. In Firebase project settings, retain the accepted package identity and register the actual local/upload **and Play app-signing** certificate SHA-1 fingerprints. Play re-signs delivered apps, so an upload certificate alone is insufficient for Play-installed Google sign-in. The source `play-console-receipt-20261006.json` retains public SHA-256 fingerprints; SHA-1 provider registration must be verified from the actual certificates.
2. Enable Google as an Authentication provider in that canonical project and download the updated Android `google-services.json`, including its web OAuth client.
3. Provision the protected configuration deliberately. Preserve the four existing durable upload-key secrets and accepted upload-certificate identity. Configuration provisioning does not grant signing or release approval.
4. After candidate adoption and legitimate signing, retain native tests of account selection/cancellation, Firebase owner identity, private-route denial, session persistence/restart, account switching, sign-out, expired-session recovery and Play-installed sign-in. Bind the device record to source SHA, AAB/APK hashes, configuration hash, public signing certificate, package/version and device/OS/WebView versions.

Google Workspace authorization in Device Settings is a separate grant and remains unavailable in the native shell until its system-browser return path is accepted. Generic Android App Links, physical accessibility/XR, Apple authority and iOS scope are separate acceptance items.

## Primary integration references

- [Google OAuth policy](https://developers.google.com/identity/protocols/oauth2/policies)
- [Plugin API and configuration](https://capawesome.io/docs/sdks/capacitor/firebase/authentication/)
- [Google native provider setup](https://github.com/capawesome-team/capacitor-firebase/blob/main/packages/authentication/docs/setup-google.md)

The source tests exercise native/web selection and configuration boundaries with disclosed synthetic credentials. They do not certify Google provider enablement, real credentials, signing, a device, or Play delivery.
