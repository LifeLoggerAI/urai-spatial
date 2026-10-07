import type { CapacitorConfig } from '@capacitor/cli';

// Set only by the canonical google-services.json validation step. An unsigned
// preparation build without native config excludes the native Firebase plugin
// entirely, so it cannot initialize an unconfigured native Firebase app.
const nativeGoogleAuthReady = process.env.URAI_ANDROID_NATIVE_GOOGLE_AUTH_READY === 'true';

const config: CapacitorConfig = {
  // Retain the package identity from the dated Play observation; it is not current
  // track/version authority. The retained receipt and quoted support history disagree
  // on versionCode versus release label, so fresh authenticated Play readback is needed.
  // Keep the historical play-console-receipt-20261006.json unchanged. This source,
  // candidate upload, signing and store acceptance remain unverified.
  appId: 'com.urailabs.urai',
  appName: 'UrAi',
  loggingBehavior: 'none',
  webDir: '../../urai-tier1/out',
  includePlugins: nativeGoogleAuthReady ? ['@capacitor/app', '@capacitor-firebase/authentication'] : ['@capacitor/app'],
  plugins: {
    FirebaseAuthentication: {
      skipNativeAuth: true,
      providers: nativeGoogleAuthReady ? ['google.com'] : [],
    },
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
