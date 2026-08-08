import { redirect } from 'next/navigation'

export const metadata = {
  title: 'URAI Unwind',
  description: 'Return safely to the canonical Life Map overview.',
}

export default function UnwindCompatibilityPage() {
  redirect('/life-map?from=unwind&overview=1')
}
