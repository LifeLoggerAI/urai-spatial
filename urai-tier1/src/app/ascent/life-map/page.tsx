import { redirect } from 'next/navigation'

export const metadata = {
  title: 'URAI Ascent to Life Map',
  description: 'Compatibility handoff from Ascent into the canonical Life Map.',
}

export default function AscentLifeMapCompatibilityPage() {
  redirect('/life-map?from=ascent')
}
