import { notFound } from 'next/navigation'
import FirstPrivateMemoryDevClient from './FirstPrivateMemoryDevClient'

export const metadata = {
  title: 'UrAi — Isolated First Private Memory Import',
  robots: { index: false, follow: false, nocache: true },
}

/** This is a synthetic developer handoff, never a production upload surface. */
export default function FirstPrivateMemoryDevPage() {
  if (process.env.NODE_ENV !== 'development'
    || process.env.NEXT_PUBLIC_URAI_AUTH_JOURNEY_EMULATOR !== 'true'
    || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== 'demo-urai-auth-journey') notFound()
  return <FirstPrivateMemoryDevClient />
}
