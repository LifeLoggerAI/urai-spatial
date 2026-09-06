import type { Metadata } from 'next'
import ConsentSanctuaryClient from './ConsentSanctuaryClient'
import { publicIndexing } from '../public-indexing'

const title = 'URAI Privacy — Permissions & Consent'
const description = 'Review, narrow, pause, revoke, and understand the permissions URAI uses, with clear consent history and user-controlled changes.'

export const metadata: Metadata = {
  robots: publicIndexing,
  title,
  description,
  alternates: { canonical: 'https://urai.app/privacy-controls/' },
  openGraph: {
    url: 'https://urai.app/privacy-controls/',
    title,
    description,
    siteName: 'UrAi',
  },
  twitter: {
    card: 'summary',
    title,
    description,
  },
}

export default function PrivacyControlsRoutePage() {
  return <ConsentSanctuaryClient />
}
