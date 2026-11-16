import type { LocalePreference } from './localePreference'
import { localizedMessage } from './localePreference'
import type { GeographicMessageId, GeographicStatusMessage } from './geographicMessages'

// Finite source bindings preserve critical-copy authority across preference changes.
const statusMessages = {
  "geographic.status.off": "geographic.status.off",
  "geographic.status.waiting": "geographic.status.waiting",
  "geographic.status.receivedPrecise": "geographic.status.receivedPrecise",
  "geographic.status.receivedApproximate": "geographic.status.receivedApproximate",
  "geographic.status.invalidCoordinate": "geographic.status.invalidCoordinate",
  "geographic.status.storageFailed": "geographic.status.storageFailed",
  "geographic.status.permissionDenied": "geographic.status.permissionDenied",
  "geographic.status.deviceUnavailable": "geographic.status.deviceUnavailable",
  "geographic.status.timeout": "geographic.status.timeout",
  "geographic.status.failed": "geographic.status.failed",
  "geographic.status.corruptRecordRemoved": "geographic.status.corruptRecordRemoved",
  "geographic.status.pinsDeletedOtherTab": "geographic.status.pinsDeletedOtherTab",
  "geographic.status.storageUnavailable": "geographic.status.storageUnavailable",
  "geographic.status.allClearedOtherTab": "geographic.status.allClearedOtherTab",
  "geographic.status.consentRevokedOtherTab": "geographic.status.consentRevokedOtherTab",
  "geographic.status.awaitingPolicy": "geographic.status.awaitingPolicy",
  "geographic.status.policyUnavailable": "geographic.status.policyUnavailable",
  "geographic.status.browserPermissionLost": "geographic.status.browserPermissionLost",
  "geographic.status.requestStorageUnavailable": "geographic.status.requestStorageUnavailable",
  "geographic.status.requestPolicyUnavailable": "geographic.status.requestPolicyUnavailable",
  "geographic.status.unsupported": "geographic.status.unsupported",
  "geographic.status.authorityChanged": "geographic.status.authorityChanged",
  "geographic.status.pinSaved": "geographic.status.pinSaved",
  "geographic.status.pinSaveFailed": "geographic.status.pinSaveFailed",
  "geographic.status.revoked": "geographic.status.revoked",
  "geographic.status.pinsDeleted": "geographic.status.pinsDeleted",
  "geographic.status.deletionUnverified": "geographic.status.deletionUnverified",
  "geographic.status.policyClosed": "geographic.status.policyClosed",
  "geographic.status.policyBlocked": "geographic.status.policyBlocked",
} as const satisfies Record<GeographicStatusMessage['id'], GeographicMessageId>

const modeMessages = {
  granted: 'geographic.authority.granted', limited: 'geographic.authority.limited',
  paused: 'geographic.authority.paused', denied: 'geographic.authority.denied',
} as const satisfies Record<NonNullable<GeographicStatusMessage['mode']>, GeographicMessageId>

export function localizedGeographicStatus(preference: LocalePreference, message: GeographicStatusMessage) {
  if (!Object.hasOwn(statusMessages, message.id)) throw new Error('UNKNOWN_GEOGRAPHIC_STATUS')
  if (message.mode && !Object.hasOwn(modeMessages, message.mode)) throw new Error('UNKNOWN_GEOGRAPHIC_POLICY_MODE')
  const mode = message.mode ? localizedMessage(preference, modeMessages[message.mode]).text : undefined
  return localizedMessage(preference, statusMessages[message.id], mode ? {mode} : undefined)
}
