import { redirect } from 'next/navigation'

export const metadata = { title: 'UrAi System Status', description: 'Open the canonical UrAi release and system status surface.' }

export default function SystemCompatibilityPage() {
  redirect('/status?from=system')
}
