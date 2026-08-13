#!/usr/bin/env node

const deployRequested = process.argv.includes('--deploy') || process.argv.includes('--deploy-prebuilt')
const checkRequested = process.argv.includes('--check') || !deployRequested

const forbiddenCredentialEnv = [
  'FIREBASE_SERVICE_ACCOUNT_JSON',
  'FIREBASE_PRIVATE_KEY',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_TOKEN',
]

for (const name of forbiddenCredentialEnv) {
  if (String(process.env[name] || '').trim()) {
    throw new Error(`Refusing long-lived Firebase credential environment variable: ${name}`)
  }
}

if (deployRequested) {
  throw new Error(
    'URAI Spatial production release is NO-GO. The deploy executable is quarantined until short-lived provider identity, WIF/IAM least privilege, runtime read-back, rollback evidence, and historical credential revocation are independently verified.',
  )
}

if (checkRequested) {
  console.log('URAI Spatial production release: NO-GO / quarantined')
  console.log('No provider credentials were loaded and no production mutation was attempted.')
}
