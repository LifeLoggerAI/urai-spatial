import PassportVaultClient from './PassportVaultClient'
import { publicIndexing } from '../public-indexing'

export const dynamic = 'force-static'
export const revalidate = false

export const metadata = {
  robots: publicIndexing,
  title: 'URAI Passport — Ownership & Permissions',
  description: 'Review ownership, provenance, permissions, exports, deletion, devices, connected providers, and audit history in URAI Passport.',
}

export default function PassportRoutePage() {
  return <PassportVaultClient />
}
