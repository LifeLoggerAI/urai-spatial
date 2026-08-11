#!/usr/bin/env node

const quarantineMessage =
  'URAI Spatial Firebase Hosting recovery is NO-GO. Recovery remains quarantined until short-lived provider identity, WIF/IAM least privilege, runtime read-back, rollback provenance, and historical credential revocation are independently verified.'

function refuseRecovery() {
  throw new Error(quarantineMessage)
}

export async function discoverCurrentLiveRelease() {
  return refuseRecovery()
}

export async function restoreDiscoveredVersion() {
  return refuseRecovery()
}

export async function verifyRestoredVersion() {
  return refuseRecovery()
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.error(quarantineMessage)
  process.exitCode = 1
}
