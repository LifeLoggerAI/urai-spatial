'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import HomeSanctuaryFallback from './HomeSanctuaryFallback'
import HomeSpatialCanvas, { useWebGLAvailable } from './HomeSpatialCanvas'
import { requestUraiWorldOrbOpen } from '@/spatial/world/worldEvents'

export default function HomeSpatialRuntimeLayer() {
  const pathname = usePathname() ?? '/'
