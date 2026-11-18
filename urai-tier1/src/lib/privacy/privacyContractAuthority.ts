/** Contract shape selection is not authorization; backend policy still controls. */
export const OPERATIONAL_PRIVACY_CONTRACT = 'operational-v1' as const
export function operationalPrivacyContractSelected(value: unknown): boolean {
  return value === OPERATIONAL_PRIVACY_CONTRACT
}
export function requireOperationalPrivacyContract(value: unknown): void {
  if (!operationalPrivacyContractSelected(value)) throw new Error('OPERATIONAL_PRIVACY_CONTRACT_UNVERIFIED')
}
