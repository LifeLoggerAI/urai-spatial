import fs from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const root = new URL('../', import.meta.url)
const links = JSON.parse(await fs.readFile(new URL('urai-tier1/src/lib/native/paths.json', root), 'utf8'))
if (links.origin !== 'https://urai.app' || !Array.isArray(links.paths) || !links.paths.length || links.paths.some(value => !/^\/[a-z-]*$/.test(value))) throw new Error('NATIVE_LINK_ALLOWLIST_INVALID')

export async function configureAndroidAppLinks(projectDirectory) {
  const manifestPath = path.join(projectDirectory, 'app/src/main/AndroidManifest.xml')
  let manifest = await fs.readFile(manifestPath, 'utf8')
  if (!manifest.includes('android:name=".MainActivity"') || (manifest.match(/<\/activity>/g) || []).length !== 1) throw new Error('ANDROID_MAIN_ACTIVITY_MISSING_OR_AMBIGUOUS')
  const marker = '<!-- UrAi canonical HTTPS navigation links -->'
  if (!manifest.includes(marker)) {
    const filter = `            ${marker}\n            <intent-filter android:autoVerify="true">\n                <action android:name="android.intent.action.VIEW" />\n                <category android:name="android.intent.category.DEFAULT" />\n                <category android:name="android.intent.category.BROWSABLE" />\n${links.paths.map(value => `                <data android:scheme="https" android:host="urai.app" android:path="${value}" />`).join('\n')}\n            </intent-filter>\n\n`
    manifest = manifest.replace('        </activity>', `${filter}        </activity>`)
  }
  // Keep persisted private identity/device data out of Android cloud backups.
  manifest = manifest.replace(/android:allowBackup="(?:true|false)"/, 'android:allowBackup="false"')
  if (!manifest.includes('android:allowBackup="false"')) throw new Error('ANDROID_BACKUP_POLICY_MISSING')
  if (!manifest.includes('android:usesCleartextTraffic=')) manifest = manifest.replace('android:allowBackup="false"', 'android:allowBackup="false"\n        android:usesCleartextTraffic="false"')
  if (!manifest.includes('android:fullBackupContent=')) manifest = manifest.replace('android:allowBackup="false"', 'android:allowBackup="false"\n        android:fullBackupContent="@xml/urai_backup_exclusions"\n        android:dataExtractionRules="@xml/urai_data_extraction_rules"')
  const exclusions = ['root', 'file', 'database', 'sharedpref', 'external', 'device_root', 'device_file', 'device_database', 'device_sharedpref'].map(domain => `        <exclude domain="${domain}" path="." />`).join('\n')
  const xmlDirectory = path.join(projectDirectory, 'app/src/main/res/xml')
  await fs.mkdir(xmlDirectory, { recursive: true })
  await fs.writeFile(path.join(xmlDirectory, 'urai_backup_exclusions.xml'), `<?xml version="1.0" encoding="utf-8"?>\n<full-backup-content>\n${exclusions}\n</full-backup-content>\n`)
  await fs.writeFile(path.join(xmlDirectory, 'urai_data_extraction_rules.xml'), `<?xml version="1.0" encoding="utf-8"?>\n<data-extraction-rules>\n    <cloud-backup>\n${exclusions}\n    </cloud-backup>\n    <device-transfer>\n${exclusions}\n    </device-transfer>\n</data-extraction-rules>\n`)
  await fs.writeFile(manifestPath, manifest)
}

export async function androidAssetLinks() {
  const receipt = JSON.parse(await fs.readFile(new URL('distribution/android-shell/play-console-receipt-20261006.json', root), 'utf8'))
  const fingerprint = receipt.signing?.appSigningCertificateSha256
  if (receipt.packageName !== 'com.urailabs.urai' || receipt.signing?.playSignsReleases !== true || !/^(?:[0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(fingerprint || '')) throw new Error('PLAY_APP_SIGNING_CERTIFICATE_AUTHORITY_MISSING')
  return [{ relation: ['delegate_permission/common.handle_all_urls'], target: { namespace: 'android_app', package_name: receipt.packageName, sha256_cert_fingerprints: [fingerprint] } }]
}

export function appleAppSiteAssociation(teamId, bundleId) {
  if (!/^[A-Z0-9]{10}$/.test(teamId || '') || /^(TEAMID|EXAMPLE|PLACEHOLDER)/.test(teamId || '')) throw new Error('REAL_APPLE_TEAM_ID_REQUIRED')
  if (!/^[A-Za-z0-9]+(?:\.[A-Za-z0-9-]+){2,}$/.test(bundleId || '')) throw new Error('OWNER_CONFIRMED_IOS_BUNDLE_ID_REQUIRED')
  return { applinks: { apps: [], details: [{ appID: `${teamId}.${bundleId}`, paths: links.paths }] } }
}

async function main() {
  const args = process.argv.slice(2)
  const option = name => { const index = args.indexOf(name); return index < 0 ? undefined : args[index + 1] }
  const android = option('--android-project')
  if (android) await configureAndroidAppLinks(path.resolve(android))
  const output = option('--association-output')
  if (output) {
    await fs.mkdir(output, { recursive: true })
    await fs.writeFile(path.join(output, 'assetlinks.json'), JSON.stringify(await androidAssetLinks(), null, 2) + '\n')
    if (process.env.URAI_APPLE_TEAM_ID || process.env.URAI_IOS_BUNDLE_ID) {
      await fs.writeFile(path.join(output, 'apple-app-site-association'), JSON.stringify(appleAppSiteAssociation(process.env.URAI_APPLE_TEAM_ID, process.env.URAI_IOS_BUNDLE_ID), null, 2) + '\n')
    }
  }
  console.log('SOURCE_ONLY_NATIVE_LINKS_PREPARED_DOMAIN_AND_DEVICE_ACCEPTANCE_PENDING')
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main().catch(error => { console.error(error.message); process.exitCode = 1 })
}
