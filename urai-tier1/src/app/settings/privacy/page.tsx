import { redirect } from 'next/navigation'

export const metadata = { title: 'UrAi Privacy Settings', description: 'Open the canonical UrAi consent and privacy controls.' }

export default function SettingsPrivacyCompatibilityPage() {
  redirect('/privacy-controls?from=settings-privacy')
}
