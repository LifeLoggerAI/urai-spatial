import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const PACKAGE = 'com.urailabs.urai'
const PROJECT = 'urai-4dc1d'

// This validates exported provider configuration, not live provider enablement,
// certificate ownership, signing, device sign-in, or store acceptance.
export function validateAndroidGoogleServices(value, expectedProjectNumber) {
  if (!value || value.project_info?.project_id !== PROJECT) throw new Error('NATIVE_FIREBASE_PROJECT_MISMATCH')
  const number = String(value.project_info.project_number ?? '')
  if (!/^\d+$/.test(number) || (expectedProjectNumber && number !== expectedProjectNumber)) throw new Error('NATIVE_FIREBASE_PROJECT_NUMBER_MISMATCH')
  const clients = (Array.isArray(value.client) ? value.client : []).filter(client => client.client_info?.android_client_info?.package_name === PACKAGE)
  if (clients.length !== 1) throw new Error('NATIVE_FIREBASE_PACKAGE_MISSING_OR_AMBIGUOUS')
  const client = clients[0]
  if (!new RegExp(`^1:${number}:android:[0-9a-f]+$`, 'i').test(client.client_info?.mobilesdk_app_id ?? '')) throw new Error('NATIVE_FIREBASE_APP_ID_INVALID')
  const oauth = Array.isArray(client.oauth_client) ? client.oauth_client : []
  const clientId = new RegExp(`^${number}-[a-zA-Z0-9_-]+\\.apps\\.googleusercontent\\.com$`)
  const webClients = oauth.filter(entry => entry.client_type === 3 && clientId.test(entry.client_id ?? ''))
  if (webClients.length !== 1) throw new Error('NATIVE_GOOGLE_WEB_CLIENT_MISSING_OR_AMBIGUOUS')
  const androidClients = oauth.filter(entry => entry.client_type === 1 && clientId.test(entry.client_id ?? '') && entry.android_info?.package_name === PACKAGE && /^[0-9a-f]{40}$/i.test(entry.android_info?.certificate_hash ?? ''))
  if (!androidClients.length) throw new Error('NATIVE_GOOGLE_ANDROID_CERTIFICATE_CLIENT_MISSING')
  if (!(Array.isArray(client.api_key) && client.api_key.some(key => typeof key.current_key === 'string' && key.current_key.length > 0))) throw new Error('NATIVE_FIREBASE_PUBLIC_API_KEY_MISSING')
  return { projectId: PROJECT, packageName: PACKAGE, androidCertificateSha1: androidClients.map(entry => entry.android_info.certificate_hash.toUpperCase()) }
}

export async function configureAndroidGoogleAuth(projectDirectory, configText) {
  validateAndroidGoogleServices(JSON.parse(configText))
  const directory = path.resolve(projectDirectory)
  const variablesPath = path.join(directory, 'variables.gradle')
  const rootGradle = await fs.readFile(path.join(directory, 'build.gradle'), 'utf8')
  const appGradle = await fs.readFile(path.join(directory, 'app/build.gradle'), 'utf8')
  if (!rootGradle.includes('com.google.gms:google-services:') || !appGradle.includes("apply plugin: 'com.google.gms.google-services'")) {
    throw new Error('GENERATED_ANDROID_GOOGLE_SERVICES_HOOK_MISSING')
  }
  let variables = await fs.readFile(variablesPath, 'utf8')
  if (!variables.includes('// UrAi native Google account credentials')) {
    variables += "\n// UrAi native Google account credentials\next {\n    rgcfaIncludeGoogle = true\n    androidxCredentialsVersion = '1.3.0'\n    androidxCredentialsPlayServicesAuthVersion = '1.3.0'\n}\n"
    await fs.writeFile(variablesPath, variables)
  }
  await fs.writeFile(path.join(directory, 'app/google-services.json'), configText, { mode: 0o600 })
}

async function main() {
  const args = process.argv.slice(2)
  const option = name => { const index = args.indexOf(name); return index < 0 ? undefined : args[index + 1] }
  const optional = args.includes('--optional')
  const sourceSha = process.env.URAI_EXACT_HEAD || process.env.SOURCE_SHA || ''
  if (!/^[0-9a-f]{40}$/.test(sourceSha)) throw new Error('NATIVE_AUTH_SOURCE_SHA_REQUIRED')
  const configPath = process.env.URAI_ANDROID_FIREBASE_CONFIG_PATH
  let configText = process.env.ANDROID_FIREBASE_GOOGLE_SERVICES_JSON || ''
  if (!configText && configPath) configText = await fs.readFile(configPath, 'utf8')
  if (!configText && !optional) throw new Error('CANONICAL_ANDROID_FIREBASE_CONFIG_REQUIRED')
  let validated = null
  if (configText) {
    if (Buffer.byteLength(configText) > 2 * 1024 * 1024) throw new Error('NATIVE_FIREBASE_CONFIG_TOO_LARGE')
    let config
    try { config = JSON.parse(configText) } catch { throw new Error('NATIVE_FIREBASE_CONFIG_INVALID_JSON') }
    validated = validateAndroidGoogleServices(config, process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID)
  }
  const ready = Boolean(validated)
  const outputPath = option('--config-output')
  if (ready && outputPath) await fs.writeFile(outputPath, configText, { mode: 0o600 })
  const projectDirectory = option('--apply-project')
  if (ready && projectDirectory) await configureAndroidGoogleAuth(projectDirectory, configText)
  const receipt = {
    schemaVersion: 'urai-android-native-auth-preparation-v1',
    sourceSha,
    generatedAt: new Date().toISOString(),
    packageName: PACKAGE,
    projectId: PROJECT,
    nativeConfigValid: ready,
    nativePluginRequested: ready,
    status: ready ? 'SOURCE_CONFIGURED_DEVICE_ACCEPTANCE_PENDING' : 'NATIVE_CONFIG_REQUIRED_UNSIGNED_PREPARATION_ONLY',
    configSha256: ready ? createHash('sha256').update(configText).digest('hex') : null,
    androidCertificateSha1: validated?.androidCertificateSha1 ?? [],
    certificateOwnershipVerified: false,
    providerEnabledVerified: false,
    nativeSignInAccepted: false,
    playUploadPerformed: false,
    containsPrivateUserData: false,
  }
  const receiptPath = option('--receipt-output')
  if (receiptPath) await fs.writeFile(receiptPath, JSON.stringify(receipt, null, 2) + '\n')
  if (process.env.GITHUB_ENV && !projectDirectory) {
    const filePath = ready ? path.resolve(outputPath || configPath || '') : ''
    if (ready && (!outputPath && !configPath)) throw new Error('NATIVE_FIREBASE_CONFIG_OUTPUT_REQUIRED')
    if (filePath.includes('\n') || filePath.includes('\r')) throw new Error('NATIVE_FIREBASE_CONFIG_PATH_INVALID')
    await fs.appendFile(process.env.GITHUB_ENV, `URAI_ANDROID_NATIVE_GOOGLE_AUTH_READY=${ready}\nNEXT_PUBLIC_URAI_NATIVE_GOOGLE_AUTH_READY=${ready}\nURAI_ANDROID_FIREBASE_CONFIG_PATH=${filePath}\n`)
  }
  console.log(receipt.status)
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main().catch(error => { console.error(error.message); process.exitCode = 1 })
}
