'use client'

import { useCallback } from 'react'
import { requestUraiWorldTravel } from './worldEvents'
import { useUraiWorldState } from './WorldStateProvider'

function normalizePathname(value: string) {
  return value.replace(/\/+$/, '') || '/'
}

export function GroundGateway() {
  const { world, phase } = useUraiWorldState()
  const isHome = world.destination === 'home'
  const disabled = !isHome || phase !==