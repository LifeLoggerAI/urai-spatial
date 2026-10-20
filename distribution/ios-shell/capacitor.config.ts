import type { CapacitorConfig } from '@capacitor/cli'

const appleReady = process.env.URAI_IOS_APPLE_AUTH_READY === 'true'
const googleReady = appleReady && process.env.URAI_IOS_GOOGLE_AUTH_READY === 'true'

const config: CapacitorConfig = {
  // Proposed identity only until the owner confirms the registered Apple App ID.
  // AASA generation requires real, supplied Team and bundle identities.
  appId: process.env.URAI_IOS_BUNDLE_ID || 'com.urailabs.urai',
  appName: 'UrAi',
  webDir: '../../urai-tier1/out',
  loggingBehavior: 'none',
  includePlugins: appleReady ? ['@capacitor/app', '@capacitor-firebase/authentication'] : ['@capacitor/app'],
  plugins: { FirebaseAuthentication: { skipNativeAuth: true, providers: appleReady ? ['apple.com', ...(googleReady ? ['google.com'] : [])] : [] } },
  experimental: appleReady ? { ios: { spm: { swiftToolsVersion: '6.1', packageOptions: { '@capacitor-firebase/authentication': { symlink: true } }, packageTraits: { '@capacitor-firebase/authentication': googleReady ? ['Google'] : ['Lite'] } } } } : undefined,
  ios: { contentInset: 'never', preferredContentMode: 'mobile' },
}
export default config
