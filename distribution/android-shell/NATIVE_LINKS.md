# Source-bound native links

The shared navigation handler accepts only the sixteen exact route roots in `urai-tier1/src/lib/native/paths.json` under `https://urai.app`. Every query string, fragment, username/password URL, foreign host, custom scheme and provider callback is rejected. It processes both cold launch and warm `appUrlOpen` events without logging inbound URLs. Existing route/session authority still decides whether private content may open.

Android preparation applies a verified-link VIEW/DEFAULT/BROWSABLE intent filter to the generated MainActivity, retains its single-task launch behavior, and disables Android cloud backup for persisted private identity data. Explicit XML rules exclude all supported app-data domains from both cloud backup and device transfer, including older Android backup rules. It declares only foreground coarse and fine location permissions for the existing consent-gated Geographic Life Map geolocation request. Capacitor still requests the Android runtime grant when that browser request executes; declaration does not grant permission or bypass the app's private-storage, location-policy or precise-location controls. Location, GPS and network-location hardware are optional, so devices without them retain the symbolic Life Map and the existing failure copy. It adds no background-location, camera, microphone or storage permission. Physical permission, approximate/precise choice and revocation acceptance remain device gates. The generated association file uses the **Play app-signing** SHA-256 certificate from `play-console-receipt-20261006.json`, rather than the separate upload certificate. Existing provider certificate provenance does not accept this new source/build.

Generate the reviewable domain source without publishing it:

```sh
node scripts/prepare-native-links.mjs --association-output <output-directory>
```

For iOS, both `URAI_APPLE_TEAM_ID` and owner-confirmed `URAI_IOS_BUNDLE_ID` are required to generate `apple-app-site-association`. If neither is supplied, only the actual Android association is generated. Incomplete or malformed supplied Apple authority fails closed.

After candidate adoption, domain authorization, legitimate signing and installation, verify OS association and cold/warm navigation to `/home`, `/focus`, `/replay`, `/privacy-controls` and `/login`; reject an external host, `?code=...`, `?id_token=...` and `#access_token=...` using disclosed synthetic values. Sign-out and signed-out private-route denial must persist across a link and process restart. Bind observations to exact source/build hashes, public signing identity and device/OS/WebView versions. No domain publication, key rotation, store upload or device acceptance is claimed here.

Google Workspace provider authorization remains a separate consent and callback lane. Generic app navigation does not enable that provider grant.
