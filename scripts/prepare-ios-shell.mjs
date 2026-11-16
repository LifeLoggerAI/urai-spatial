import fs from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { appleAppSiteAssociation } from './prepare-native-links.mjs'

export function validateIosFirebaseConfiguration(value, bundleId, projectNumber) {
  if (value?.PROJECT_ID !== 'urai-4dc1d') throw new Error('IOS_FIREBASE_PROJECT_MISMATCH')
  const number = String(value.GCM_SENDER_ID || '')
  if (!/^\d+$/.test(number) || (projectNumber && number !== projectNumber)) throw new Error('IOS_FIREBASE_PROJECT_NUMBER_MISMATCH')
  if (!bundleId || value.BUNDLE_ID !== bundleId) throw new Error('IOS_FIREBASE_REGISTERED_BUNDLE_MISMATCH')
  if (!new RegExp(`^1:${number}:ios:[0-9a-f]+$`, 'i').test(value.GOOGLE_APP_ID || '') || typeof value.API_KEY !== 'string' || !value.API_KEY) throw new Error('IOS_FIREBASE_APP_CONFIGURATION_INVALID')
  const googleReady = Boolean(value.CLIENT_ID || value.REVERSED_CLIENT_ID)
  if (googleReady && (!new RegExp(`^${number}-[a-zA-Z0-9_-]+\\.apps\\.googleusercontent\\.com$`).test(value.CLIENT_ID || '') || value.REVERSED_CLIENT_ID !== value.CLIENT_ID.split('.').reverse().join('.') || value.IS_SIGNIN_ENABLED !== true)) throw new Error('IOS_GOOGLE_PROVIDER_CONFIGURATION_INVALID')
  return { googleReady, reversedClientId: googleReady ? value.REVERSED_CLIENT_ID : null }
}

function parsePlist(text) {
  const parsed = spawnSync('python3', ['-c', 'import json,plistlib,sys; print(json.dumps(plistlib.loads(sys.stdin.buffer.read())))'], { input: text, encoding: 'utf8' })
  if (parsed.status !== 0) throw new Error('IOS_FIREBASE_PLIST_INVALID_PYTHON3_REQUIRED')
  return JSON.parse(parsed.stdout)
}

export async function configureIosSource(projectDirectory, teamId, bundleId, native = {}) {
  const source = path.join(projectDirectory, 'App/App')
  const projectPath = path.join(projectDirectory, 'App/App.xcodeproj/project.pbxproj')
  let project = await fs.readFile(projectPath, 'utf8')
  if (!project.includes('PRODUCT_BUNDLE_IDENTIFIER =')) throw new Error('IOS_GENERATED_BUNDLE_SETTING_MISSING')
  const appleAuthoritySupplied = Boolean(teamId || bundleId)
  if (native.configText && !appleAuthoritySupplied) throw new Error('IOS_NATIVE_IDENTITY_REQUIRES_APPLE_TEAM_AND_BUNDLE')
  if (appleAuthoritySupplied) {
    appleAppSiteAssociation(teamId, bundleId)
    project = project.replace(/PRODUCT_BUNDLE_IDENTIFIER = [^;]+;/g, `PRODUCT_BUNDLE_IDENTIFIER = ${bundleId};`)
    project = project.replace(/^[ \t]*DEVELOPMENT_TEAM = [^;]*;\r?\n?/gm, '')
    project = project.replace(/PRODUCT_BUNDLE_IDENTIFIER =/g, `DEVELOPMENT_TEAM = ${teamId};\n\t\t\t\tPRODUCT_BUNDLE_IDENTIFIER =`)
  }
  if (!project.includes('CODE_SIGN_ENTITLEMENTS = App/App.entitlements;')) project = project.replace(/PRODUCT_BUNDLE_IDENTIFIER =/g, 'CODE_SIGN_ENTITLEMENTS = App/App.entitlements;\n\t\t\t\tPRODUCT_BUNDLE_IDENTIFIER =')
  await fs.writeFile(projectPath, project)
  const entitlement = '<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0"><dict><key>com.apple.developer.associated-domains</key><array><string>applinks:urai.app</string></array>' + (native.appleReady ? '<key>com.apple.developer.applesignin</key><array><string>Default</string></array>' : '') + '</dict></plist>\n'
  await fs.writeFile(path.join(source, 'App.entitlements'), entitlement)
  // Preserve the generated Capacitor AppDelegate forwarding of URL and user
  // activity events, and explicitly keep ATS secure transport enabled.
  const infoPath = path.join(source, 'Info.plist')
  const check = spawnSync('python3', ['-c', 'import plistlib,sys; p=sys.argv[1]; d=plistlib.load(open(p,"rb")); d["NSAppTransportSecurity"]={"NSAllowsArbitraryLoads":False}; scheme=sys.argv[2]; d.update({"CFBundleURLTypes":[{"CFBundleURLSchemes":[scheme]}]} if scheme else {}); plistlib.dump(d,open(p,"wb"))', infoPath, native.reversedClientId || ''], { encoding: 'utf8' })
  if (check.status !== 0) throw new Error('IOS_PLIST_CONFIGURATION_FAILED_PYTHON3_REQUIRED')
  const delegate = await fs.readFile(path.join(source, 'AppDelegate.swift'), 'utf8')
  let sceneDelegate = ''
  try { sceneDelegate = await fs.readFile(path.join(source, 'SceneDelegate.swift'), 'utf8') } catch {}
  const appForwarding = delegate.includes('ApplicationDelegateProxy.shared.application')
  const sceneForwarding = sceneDelegate.includes('SceneDelegateProxy.shared.scene(scene, willConnectTo:') && sceneDelegate.includes('SceneDelegateProxy.shared.scene(scene, openURLContexts:') && sceneDelegate.includes('SceneDelegateProxy.shared.scene(scene, continue:')
  if (!appForwarding && !sceneForwarding) throw new Error('IOS_NATIVE_LINK_FORWARDING_MISSING')
  if (native.configText) {
    await fs.writeFile(path.join(source, 'GoogleService-Info.plist'), native.configText, { mode: 0o600 })
    // Explicit project resource membership is required; copying a plist alone
    // would leave Firebase's native initialization unable to locate it.
    if (!project.includes('GoogleService-Info.plist in Resources')) {
      project = project.replace('/* Begin PBXBuildFile section */', '/* Begin PBXBuildFile section */\n\t\tF1A000000000000000000001 /* GoogleService-Info.plist in Resources */ = {isa = PBXBuildFile; fileRef = F1A000000000000000000002 /* GoogleService-Info.plist */; };')
      project = project.replace('/* Begin PBXFileReference section */', '/* Begin PBXFileReference section */\n\t\tF1A000000000000000000002 /* GoogleService-Info.plist */ = {isa = PBXFileReference; lastKnownFileType = text.plist.xml; path = "GoogleService-Info.plist"; sourceTree = "<group>"; };')
      project = project.replace(/(children = \(\s*)([^)]*\/\* AppDelegate.swift \*\/[^)]*\))/, '$1F1A000000000000000000002 /* GoogleService-Info.plist */,\n\t\t\t\t$2')
      project = project.replace(/(isa = PBXResourcesBuildPhase;[^]*?files = \(\s*)/, '$1F1A000000000000000000001 /* GoogleService-Info.plist in Resources */,\n\t\t\t\t')
      if (!project.includes('F1A000000000000000000001 /* GoogleService-Info.plist in Resources */,') || !project.includes('F1A000000000000000000002 /* GoogleService-Info.plist */,') ) throw new Error('IOS_FIREBASE_RESOURCE_MEMBERSHIP_MISSING')
      await fs.writeFile(projectPath, project)
    }
  }
  return { appleAuthoritySupplied, bundleId: bundleId || 'com.urailabs.urai', bundleIdentityStatus: appleAuthoritySupplied ? 'OWNER_SUPPLIED_NOT_PROVIDER_VERIFIED' : 'PROPOSED_OWNER_CONFIRMATION_REQUIRED', signingPerformed: false, compiled: false, nativeAppleAuthConfigured: Boolean(native.appleReady), nativeGoogleAuthConfigured: Boolean(native.googleReady), providerEnabledVerified: false, nativeUrlForwarding: sceneForwarding ? 'Capacitor SceneDelegateProxy cold/warm/userActivity' : 'Capacitor ApplicationDelegateProxy', associatedDomain: 'applinks:urai.app', domainAssociationAccepted: false }
}

async function main() {
  const args = process.argv.slice(2)
  const option = name => { const index = args.indexOf(name); return index < 0 ? undefined : args[index + 1] }
  const sourceSha = process.env.URAI_EXACT_HEAD || process.env.SOURCE_SHA || ''
  if (!/^[0-9a-f]{40}$/.test(sourceSha)) throw new Error('IOS_PREPARATION_EXACT_SOURCE_REQUIRED')
  const configPath = process.env.URAI_IOS_FIREBASE_CONFIG_PATH
  let configText = process.env.IOS_FIREBASE_GOOGLE_SERVICE_INFO_PLIST || ''
  if (!configText && configPath) configText = await fs.readFile(configPath, 'utf8')
  let native = { appleReady: false, googleReady: false }
  if (configText) {
    if (Buffer.byteLength(configText) > 2 * 1024 * 1024) throw new Error('IOS_FIREBASE_CONFIGURATION_TOO_LARGE')
    appleAppSiteAssociation(process.env.URAI_APPLE_TEAM_ID, process.env.URAI_IOS_BUNDLE_ID)
    const config = validateIosFirebaseConfiguration(parsePlist(configText), process.env.URAI_IOS_BUNDLE_ID, process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID)
    if (process.env.URAI_IOS_APPLE_PROVIDER_ENABLED !== 'true') throw new Error('IOS_APPLE_PROVIDER_CONFIGURATION_REQUIRED')
    native = { configText, appleReady: true, googleReady: config.googleReady, reversedClientId: config.reversedClientId }
  } else if (!args.includes('--optional')) throw new Error('IOS_CANONICAL_FIREBASE_CONFIGURATION_REQUIRED')
  const configOutput = option('--config-output')
  if (configText && configOutput) await fs.writeFile(configOutput, configText, { mode: 0o600 })
  const project = option('--project')
  const configured = project ? await configureIosSource(path.resolve(project), process.env.URAI_APPLE_TEAM_ID, process.env.URAI_IOS_BUNDLE_ID, native) : { nativeAppleAuthConfigured: native.appleReady, nativeGoogleAuthConfigured: native.googleReady, signingPerformed: false, compiled: false, providerEnabledVerified: false }
  if (process.env.GITHUB_ENV && !project) {
    const filePath = configText ? path.resolve(configOutput || configPath || '') : ''
    if (configText && (!configOutput && !configPath)) throw new Error('IOS_CONFIG_OUTPUT_REQUIRED')
    if (/[\n\r]/.test(filePath)) throw new Error('IOS_CONFIG_PATH_INVALID')
    await fs.appendFile(process.env.GITHUB_ENV, `URAI_IOS_APPLE_AUTH_READY=${native.appleReady}\nNEXT_PUBLIC_URAI_IOS_APPLE_AUTH_READY=${native.appleReady}\nURAI_IOS_GOOGLE_AUTH_READY=${native.googleReady}\nNEXT_PUBLIC_URAI_IOS_GOOGLE_AUTH_READY=${native.googleReady}\nURAI_IOS_FIREBASE_CONFIG_PATH=${filePath}\n`)
  }
  const receipt = { schemaVersion: 'urai-ios-source-preparation-v1', sourceSha, generatedAt: new Date().toISOString(), launchScoped: true, ...configured, configSha256: configText ? createHash('sha256').update(configText).digest('hex') : null, status: 'SOURCE_PREPARED_APPLE_AUTHORITY_XCODE_SIGNING_STORE_AND_DEVICE_REQUIRED', containsPrivateUserData: false }
  const output = option('--receipt-output')
  if (output) await fs.writeFile(output, JSON.stringify(receipt, null, 2) + '\n')
  console.log(receipt.status)
}
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) main().catch(error => { console.error(error.message); process.exitCode = 1 })
