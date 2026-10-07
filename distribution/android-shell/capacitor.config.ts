import type { CapacitorConfig } from '@capacitor/cli';

// Set only by the canonical google-services.json validation step. An unsigned
// preparation build without native config excludes the native Firebase plugin
// entirely, so it cannot initialize an unconfigured native Firebase app.
const nativeGoogleAuthReady = process.env.URAI_ANDROID_NATIVE_GOOGLE_AUTH_READY === 'true';

const config: CapacitorConfig = {
  // Play accepted com.urailabs.urai: current internal release is versionCode 126.
  // Keep this package identity stable. Public signing/track evidence is recorded in
  // play-console-receipt-20261006.json; current-candidate upload remains unverified.
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
