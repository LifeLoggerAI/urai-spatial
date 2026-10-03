import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // Candidate only until the first accepted Play artifact binds the package permanently.
  // Connected Play evidence on 2026-09-26 showed no uploaded bundle and no registered
  // Android package/signing key. Do not change this after Play accepts an artifact.
  appId: 'com.urailabs.urai',
  appName: 'UrAi',
  webDir: '../../urai-tier1/out',
  android: {
    allowMixedContent: false,
  },
};

export default config;
