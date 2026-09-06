import PassportVaultClient from './PassportVaultClient'
import { publicIndexing } from '../public-indexing'

export const dynamic = 'force-static'
export const revalidate = false

const title = 'URAI Passport — Ownership & Permissions'
const description = 'Review ownership, provenance, permissions, exports, deletion, devices, connected providers, and audit history in URAI Passport.'

export const metadata = {
  robots: publicIndexing,
  alternates: { canonical: 'https://urai.app/passport/' },
  openGraph: {
    url: 'https://urai.app/passport/',
    title,
    description,
    siteName: 'UrAi',
  },
  twitter: {
    card: 'summary',
    title,
    description,
  },
  title,
  description,
}

export default function PassportRoutePage() {
  return <PassportVaultClient />
}
