'use client'

import { useEffect } from 'react'
import AdaptiveLifeMapScene from './AdaptiveLifeMapScene'

const overviewActionLabels = new Set(['Overview', 'Open semantic overview'])

export default function LifeMapRouteBoundary() {
  useEffect(() => {
    const primeOverviewHistory = (event: MouseEvent) => {
