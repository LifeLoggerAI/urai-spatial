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
  if (process.argv.includes('--self-test')) {
    const operations = [
      discoverCurrentLiveRelease,
      restoreDiscoveredVersion,
      verifyRestoredVersion,
    ]
    for (const operation of operations) {
      try {
        await operation()
        throw new Error('Quarantined recovery operation unexpectedly succeeded.')
      } catch (error) {
        if (!(error instanceof Error) || error.message !== quarantineMessage) throw error
      }
    }
    console.log('Firebase Hosting recovery self-test passed: all operations fail closed.')
  } else {
    console.error(quarantineMessage)
    process.exitCode = 1
  }
}
