#!/usr/bin/env node
// Static environment check only. Does not connect to Firebase or deploy resources.
const TARGETS = Object.freeze({ production: 'urai-4dc1d', staging: 'urai-staging' })
const targetArg = process.argv.slice(2).find((arg) => arg.startsWith('--target='))
const target = targetArg?.slice('--target='.length)

if (!Object.hasOwn(TARGETS, target ?? '')) {
  console.error('[firebase-web-config] Specify --target=production or --target=staging')
  process.exit(2)
}

const expectedProject = TARGETS[target]
const required = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
]
const value = (key) => String(process.env[key] ?? '').trim()
const placeholder = (input) => !input || /^((demo|test|dev|fake|sample|local|ci)([-_].*)?|placeholder|your[-_].*|replace[-_].*|changeme|undefined|null|<.*>)$/i.test(input) || /(?:^|[-_])(?:demo|example|placeholder)(?:$|[-_])/i.test(input)
const missing = required.filter((key) => placeholder(value(key)))
const errors = []

if (missing.length) errors.push(`Missing or placeholder public web config: ${missing.join(', ')}`)
if (value('NEXT_PUBLIC_FIREBASE_PROJECT_ID') && value('NEXT_PUBLIC_FIREBASE_PROJECT_ID') !== expectedProject) {
  errors.push('Public Firebase project does not match the selected target')
}
for (const key of ['URAI_SPATIAL_FIREBASE_PROJECT_ID', 'FIREBASE_PROJECT_ID']) {
  if (value(key) && value(key) !== expectedProject) {
    errors.push(`${key} does not match the selected target`)
  }
}

const authDomain = value('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN')
// Until provider-backed custom-domain approval is recorded, accept only the
// selected project's canonical Firebase Auth domain. Unrecognized custom
// domains are not evidence of ownership of this Firebase project.
if (authDomain && authDomain !== `${expectedProject}.firebaseapp.com`) {
  errors.push('Firebase Auth domain is not approved for the selected target')
}
const storageBucket = value('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET')
// A blacklist of only the opposite project admits arbitrary third-party
// buckets. Fail closed to the two documented Firebase default naming forms;
// any custom bucket needs a separately reviewed, explicit source allowlist.
const approvedBuckets = new Set([
  `${expectedProject}.firebasestorage.app`,
  `${expectedProject}.appspot.com`,
])
if (storageBucket && !approvedBuckets.has(storageBucket)) {
  errors.push('Firebase Storage bucket is not approved for the selected target')
}

const sender = value('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID')
const appId = value('NEXT_PUBLIC_FIREBASE_APP_ID')
if (sender && !/^\d+$/.test(sender)) errors.push('Firebase messaging sender ID is not numeric')
if (appId && !placeholder(appId)) {
  const appMatch = /^1:(\d+):web:[a-zA-Z0-9-]+$/.exec(appId)
  if (!appMatch) errors.push('Firebase web app ID has an invalid format')
  else if (sender && sender !== appMatch[1]) errors.push('Firebase app ID and messaging sender ID do not match')
}

if (errors.length) {
  console.error(`[firebase-web-config] ${target} check FAILED`)
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}
console.log(`[firebase-web-config] ${target} configuration verified for ${expectedProject}`)
console.log('[firebase-web-config] Local static check only; provider connectivity, IAM, Auth domains, rules, and release gates are NOT verified')
