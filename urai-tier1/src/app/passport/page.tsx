import PassportVaultClient from './PassportVaultClient'

export const dynamic = 'force-static'
export const revalidate = false

export const metadata = {
  title: 'UrAi Passport — Ownership Vault',
  description: 'Inspect ownership, provenance, consent, exports, deletion, devices, providers and audit receipts inside the private UrAi world.',
}

export default function PassportRoutePage() {
  return <PassportVaultClient />
}
