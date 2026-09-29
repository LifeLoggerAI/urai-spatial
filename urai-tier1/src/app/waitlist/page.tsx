import { redirect } from 'next/navigation'

export const metadata = {
  title: 'URAI Waitlist',
  description: 'Review the current URAI launch status before joining future access programs.',
}

export default function WaitlistCompatibilityPage() {
  redirect('/status?from=waitlist')
}
