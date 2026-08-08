import { redirect } from 'next/navigation'

export const metadata = {
  title: 'URAI Privacy',
  description: 'Open the canonical URAI Consent Sanctuary and privacy controls.',
}

export default function PrivacyCompatibilityPage() {
  redirect('/privacy-controls?from=privacy')
}
