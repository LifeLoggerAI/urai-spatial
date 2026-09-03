import type { Metadata } from 'next'
import ConsentSanctuaryClient from './ConsentSanctuaryClient'
import { publicIndexing } from '../public-indexing'

export const metadata: Metadata = {
  robots: publicIndexing,
  title: 'URAI Privacy — Permissions & Consent',
  description: 'Review, narrow, pause, revoke, and understand the permissions URAI uses, with clear consent history and user-controlled changes.',
  alternates: { canonical: 'https://urai.app/privacy-controls/' },
  openGraph: { url: 'https://urai.app/privacy-controls/' },
}

export default function PrivacyControlsRoutePage() {
  return <ConsentSanctuaryClient />
}
