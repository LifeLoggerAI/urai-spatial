import { redirect } from 'next/navigation'

export const metadata = {
  title: 'URAI Ascent — Life Map',
  description: 'Continue the canonical ascent into the URAI Life Map.',
}

export default function AscentLifeMapCompatibilityPage() {
  redirect('/life-map?from=ascent-life-map')
}
