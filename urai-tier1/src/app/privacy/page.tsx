import { redirect } from 'next/navigation'
import { publicIndexing } from '../public-indexing'

export const metadata = {
  robots: publicIndexing,
  title: 'URAI Privacy',
  description: 'Open the canonical URAI Consent Sanctuary and privacy controls.',
}

export default function PrivacyCompatibilityPage() {
  redirect('/privacy-controls?from=privacy')
}
