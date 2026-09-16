import PassportVaultClient from './PassportVaultClient'
import GlobalEmotionalFieldConsentCard from './GlobalEmotionalFieldConsentCard'

export const dynamic = 'force-static'
export const revalidate = false

export const metadata = {
  title: 'URAI Passport — Ownership & Permissions',
  description: 'Review ownership, provenance, permissions, public-good participation, exports, deletion, devices, connected providers, and audit history in URAI Passport.',
}

export default function PassportRoutePage() {
  return (
    <>
      <PassportVaultClient />
      <GlobalEmotionalFieldConsentCard />
    </>
  )
}
