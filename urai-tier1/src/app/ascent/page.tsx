import { redirect } from 'next/navigation'

export const metadata = {
  title: 'URAI Ascent',
  description: 'Compatibility entry for the canonical Home-to-Life-Map ascent.',
}

export default function AscentCompatibilityPage() {
  redirect('/home?from=ascent')
}
