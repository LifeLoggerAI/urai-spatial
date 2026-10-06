import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // Play accepted com.urailabs.urai: current internal release is versionCode 126.
  // Keep this package identity stable. Public signing/track evidence is recorded in
  // play-console-receipt-20261006.json; current-candidate upload remains unverified.
  appId: 'com.urailabs.urai',
  appName: 'UrAi',
  webDir: '../../urai-tier1/out',
  android: {
    allowMixedContent: false,
  },
};

export default config;
