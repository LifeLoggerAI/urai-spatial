import PassportVaultClient from './PassportVaultClient'
import { publicIndexing } from '../public-indexing'

export const dynamic = 'force-static'
export const revalidate = false

export const metadata = {
  robots: publicIndexing,
  alternates: { canonical: 'https://urai.app/passport/' },
  openGraph: { url: 'https://urai.app/passport/' },
  title: 'URAI Passport — Ownership & Permissions',
  description: 'Review ownership, provenance, permissions, exports, deletion, devices, connected providers, and audit history in URAI Passport.',
}

export default function PassportRoutePage() {
  return <PassportVaultClient />
}
