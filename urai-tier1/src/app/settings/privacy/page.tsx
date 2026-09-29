import { redirect } from 'next/navigation'

export const metadata = {
  title: 'URAI Privacy Settings',
  description: 'Open the canonical URAI Consent Sanctuary and privacy controls.',
}

export default function PrivacySettingsCompatibilityPage() {
  redirect('/privacy-controls?from=settings-privacy')
}
