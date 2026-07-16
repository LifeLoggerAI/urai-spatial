'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import UraiWorldShell from './UraiWorldShell'
import { UraiWorldStateProvider } from './WorldStateProvider'

export function WorldRuntimeBoundary({ children }: { children: ReactNode }) {
  const pathname = usePathname() || '/home'

  return (
    <UraiWorldStateProvider pathname={pathname}>
      <UraiWorldShell>{children}</UraiWorldShell>
    </UraiWorldStateProvider>
  )
}

export default WorldRuntimeBoundary
