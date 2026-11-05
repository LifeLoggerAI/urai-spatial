/**
 * Client-only presentation/action fence. This does not authorize server writes;
 * every private operation must still pass authenticated backend checks.
 *
 * Comparing a captured UID, the live Firebase UID and an auth lifecycle epoch
 * prevents callbacks and cancel buttons from acting on an obsolete account.
 */
export type OwnerSessionRead = Readonly<{
  initiatingUid: string | null | undefined
  currentUid: string | null | undefined
  initiatingEpoch: number
  currentEpoch: number
  online: boolean
}>

export function ownerSessionMatches(value: OwnerSessionRead): boolean {
  return typeof value.initiatingUid === 'string'
    && value.initiatingUid.length > 0
    && value.currentUid === value.initiatingUid
    && Number.isSafeInteger(value.initiatingEpoch)
    && value.initiatingEpoch >= 0
    && Number.isSafeInteger(value.currentEpoch)
    && value.currentEpoch >= 0
    && value.initiatingEpoch === value.currentEpoch
    && value.online === true
}
