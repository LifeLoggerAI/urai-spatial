import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'

export default function DemoLayout({ children }: { children: ReactNode }) {
  const allowDemo = process.env.NODE_ENV !== 'production' || process.env.URAI_ALLOW_PUBLIC_DEMO_ROUTES === 'true'
  if (!allowDemo) redirect('/home')
  return <>{children}</>
}
