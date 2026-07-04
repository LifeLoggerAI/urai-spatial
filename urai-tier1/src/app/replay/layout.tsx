'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import SpatialRealmPage from '@/app/spatial/ar-vr/SpatialRealmPage'

export default function ReplaySpatialLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  return pathname === '/replay' ? <SpatialRealmPage realm="replay" /> : children
}
