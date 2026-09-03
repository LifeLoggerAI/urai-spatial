import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: true,
    noarchive: true,
  },
  title: 'URAI Privacy',
  description: 'Open the canonical URAI Consent Sanctuary and privacy controls.',
  alternates: { canonical: 'https://urai.app/privacy-controls/' },
}

export default function PrivacyCompatibilityPage() {
  redirect('/privacy-controls/?from=privacy')
}
