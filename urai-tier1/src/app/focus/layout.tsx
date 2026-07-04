'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import SpatialRealmPage from '@/app/spatial/ar-vr/SpatialRealmPage'

export default function FocusSpatialLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  return pathname === '/focus' ? <SpatialRealmPage realm="focus" /> : children
}
