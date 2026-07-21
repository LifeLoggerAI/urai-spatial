'use client'

import { useCallback, useEffect, useState } from 'react'
import AdaptiveLifeMapScene from './AdaptiveLifeMapScene'

const overviewActionLabels = new Set(['Overview', 'Open semantic overview'])

function overviewHref() {
  const current = new URLSearchParams(window.location.search)
  current.delete('memoryId')
  current.delete('node')
  current.delete('returnNode')
  current.delete('from')
  current.set('overview', '1')
  return