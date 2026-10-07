# iOS first-launch source preparation

The user explicitly included iOS in the first launch on October 7, 2026. This is an in-scope preparation lane. No eligible Apple team, enrollment, registered App ID, provisioning profile, Xcode build, TestFlight delivery or iPhone acceptance is established by this source.

The pinned Capacitor 8.5.2 shell generates an Xcode/Swift Package Manager project from the same static Spatial export as Android. `com.urailabs.urai` is a proposed Apple bundle identity until the owner confirms its registration. The generated shell preserves Capacitor SceneDelegateProxy cold/warm URL and user-activity forwarding, includes the shared navigation listener, enables only `applinks:urai.app`, keeps App Transport Security enabled, and disables native bridge logging. An association file is generated only when a real Team ID and owner-confirmed bundle ID are supplied; no placeholder Team ID is committed or published.

Source-only preparation, after the exact approved candidate has been checked out and its static export built:

```sh
export URAI_EXACT_HEAD="$(git rev-parse HEAD)"
node scripts/prepare-ios-shell.mjs --optional
corepack pnpm --dir distribution/ios-shell ios:add
corepack pnpm --dir distribution/ios-shell ios:configure
node scripts/prepare-native-links.mjs --association-output "$RUNNER_TEMP/urai-native-associations"
```

These commands generate source. They do not compile, sign, install or submit an iOS app. Capacitor 8 requires an eligible Mac with Xcode 26 or newer for a native build.

## Native identity configuration

Native iOS identity stays unavailable when genuine Apple/Firebase configuration is absent. Google and Apple ID tokens are exchanged through the existing Firebase JavaScript authority with `skipNativeAuth: true`. Apple uses the native SDK-generated raw nonce. Neither cancellation nor configuration failure falls back to a WebView provider popup; no custom credential store or credential URL handler is introduced.

The primary account currently uses Google, so App Review guideline 4.8 requires an equivalent privacy-preserving login option unless an actual exemption applies. The source includes guarded native Sign in with Apple. An App Review exemption has not been established.

Owner prerequisites for enabling it:

1. Establish current Apple Developer enrollment/team/agreement authority and confirm the registered App ID and bundle identifier. Enable Associated Domains and Sign in with Apple capabilities on that identity.
2. Register that exact iOS app in canonical Firebase project `urai-4dc1d`. Enable Apple Authentication with the genuine Apple provider configuration; configure Google if offered. Preserve Apple private-key custody in the provider configuration.
3. Supply `URAI_APPLE_TEAM_ID`, `URAI_IOS_BUNDLE_ID`, protected `IOS_FIREBASE_GOOGLE_SERVICE_INFO_PLIST` (or `URAI_IOS_FIREBASE_CONFIG_PATH`) and the deliberate `URAI_IOS_APPLE_PROVIDER_ENABLED=true` configuration flag. The flag records supplied configuration; it does not prove live provider enablement.
4. Before the web export, run `scripts/prepare-ios-shell.mjs --config-output <protected-file>` with `GITHUB_ENV` set by the authorized build, or deliberately export the resulting `URAI_IOS_*_AUTH_READY` and corresponding `NEXT_PUBLIC_URAI_IOS_*_AUTH_READY` values for the same validated configuration. Generate the project and run the preparation script with `--project distribution/ios-shell/ios`. It places the canonical plist in the Xcode Resources phase, applies the Google callback scheme when present, and adds the Sign in with Apple entitlement.
5. On the eligible Mac, sync with the pinned CLI. The configuration selects only the Google SPM trait when Google is offered, or Lite for Apple-only sign-in, excludes Facebook, and enables the documented Firebase SPM symlink to avoid package identity collision. Resolve and retain native dependency lock evidence. Build using real provisioning/signing authority.
6. With domain/deployment authorization, publish and independently verify the generated `apple-app-site-association` and Android `assetlinks.json` at their canonical HTTPS `.well-known` locations. Source generation alone does not establish OS link association.
7. Retain exact-source native sign-in/cancellation, hidden-email account ownership, restart/account-switch/sign-out, private-route denial, session recovery, native Apple revocation on account deletion, cold/warm Universal Links, VoiceOver/keyboard, permission denial, privacy/logging and network-recovery evidence. Apple button branding, privacy manifests, App Store privacy declarations, review access and complete listing assets still require acceptance against the actual final SDK/build inventory.

Native compilation, provider behavior, signing and delivery remain required. Browser and synthetic credential tests do not certify an iPhone or the App Store.

## Apple account-deletion revocation

Full-account deletion from both Consent Sanctuary and Passport passes through the existing shared client and trusted `createDeletionRequest` callable. Apple-linked users must reauthenticate as the same Firebase user. On configured iOS the native provider returns an authorization code and nonce-bound ID token; on the web Firebase reauthentication returns the Apple access token. Native cancellation or missing configuration never opens a provider popup. Credentials remain in memory for this one authenticated request and are excluded from the queue, receipts and logs.

The backend verifies a fresh canonical Firebase token, its Apple provider identity and the exact account, then calls the fixed Firebase Identity Toolkit revocation endpoint before creating the grace-period deletion job. It records only server-owned success metadata. Supply the canonical project's genuine public API key as `URAI_FIREBASE_WEB_API_KEY` in the governed Functions configuration and enable the real Apple provider code-flow configuration. Missing configuration or an unsuccessful provider response prevents queue creation; this source does not deploy that configuration or make a live provider call.

At completion the backend requires its successful revocation receipt for an Apple-linked account and blocks an account that signed in after revocation until a new verified deletion request exists. Revocation happens before the cancellation grace period; cancelling the queued deletion cannot restore Apple permission. Existing queued Apple-linked jobs without this server receipt also fail closed. Runtime provider acceptance and the complete cancellation/regrant/grace-period deletion scenario must be retained from the real configured build.

The native request follows Firebase's official [iOS RevokeTokenRequest](https://github.com/firebase/firebase-ios-sdk/blob/main/FirebaseAuth/Sources/Swift/Backend/RPC/RevokeTokenRequest.swift) (`tokenType: 3`, with no native redirect URI). Web requests use `ACCESS_TOKEN` as in the Firebase JS SDK. See the [managed revocation API](https://docs.cloud.google.com/identity-platform/docs/reference/rest/v2/accounts/revokeToken) and [Firebase Apple deletion guidance](https://firebase.google.com/docs/auth/ios/apple).

Primary references: [Capacitor iOS](https://capacitorjs.com/docs/ios), [Firebase plugin setup](https://capawesome.io/docs/sdks/capacitor/firebase/authentication/), [Apple login requirement](https://developer.apple.com/app-store/review/guidelines/#login-services), [Firebase Apple identity](https://firebase.google.com/docs/auth/web/apple), [Associated Domains](https://developer.apple.com/documentation/xcode/supporting-associated-domains).
