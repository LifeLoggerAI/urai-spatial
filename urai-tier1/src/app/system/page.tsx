import { redirect } from 'next/navigation'

export const metadata = {
  title: 'URAI System Status',
  description: 'Open the canonical URAI status and release-authority surface.',
}

export default function SystemCompatibilityPage() {
  redirect('/status?from=system')
}
