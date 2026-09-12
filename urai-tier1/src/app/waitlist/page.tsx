import { redirect } from 'next/navigation'

export const metadata = { title: 'UrAi Early Access', description: 'Open the canonical UrAi early-access entry.' }

export default function WaitlistCompatibilityPage() {
  redirect('/early-access?from=waitlist')
}
