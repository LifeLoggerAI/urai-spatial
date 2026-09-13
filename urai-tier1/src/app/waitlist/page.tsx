import { redirect } from 'next/navigation'

export const metadata = {
  title: 'UrAi Waitlist Status',
  description: 'Open UrAi system status while durable early-access intake is unavailable.',
}

export default function WaitlistCompatibilityPage() {
  redirect('/status?from=waitlist')
}
