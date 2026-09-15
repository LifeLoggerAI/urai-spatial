'use client'

import type { ComponentProps } from 'react'
import { HomeAAAVisualRepair } from './HomeAAAVisualRepair'
import { HomeWorldProductionV223 } from './HomeWorldProductionV223'

type HomeWorldProductionProps = ComponentProps<typeof HomeWorldProductionV223>

// Canonical Home export is the current literal-pixel candidate.
// Certification still requires fresh exact-head CI, accessibility, literal pixels and independent approval.
export function HomeWorldProduction(props: HomeWorldProductionProps) {
  return (
    <>
      <HomeWorldProductionV223 {...props} />
      <HomeAAAVisualRepair />
    </>
  )
}
