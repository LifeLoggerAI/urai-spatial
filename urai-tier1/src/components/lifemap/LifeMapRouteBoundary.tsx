'use client'

import { useEffect } from 'react'
import AdaptiveLifeMapScene from './AdaptiveLifeMapScene'
import { markFirstSpatialFrame, useAdaptiveSpatialQuality } from '@/spatial/performance/useAdaptiveSpatialQuality'

const overviewActionLabels = new Set(['Overview', 'Open semantic overview'])

function primeOverviewIdentity() {
  const current = new URLSearchParams(window.location.search)
  current.delete('memory