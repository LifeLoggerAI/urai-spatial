import { redirect } from 'next/navigation'

export const metadata = {
  title: 'URAI Ground',
  description: 'The canonical first-person physical lived-world Ground experience.',
}

export default function LegacyGroundWorldPage() {
  redirect('/ground?from=legacy-world')
}
