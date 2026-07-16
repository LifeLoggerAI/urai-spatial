'use client'

import { useCallback } from 'react'
import { requestUraiWorldTravel } from './worldEvents'
import { useUraiWorldState } from './WorldStateProvider'

export function GroundGateway() {
  const { world, phase } = useUraiWorldState()
  const isHome = world.destination === 'home'
  const disabled = !isHome || phase !== 'idle'

  const enterInfrastructure = useCallback(() => {
    if (disabled) return

    requestUraiWorldTravel({
      destination: 'infrastructure-hub',
      href: '/ground?from=ground-gateway',
      entryPortal: 'ground-gateway',
      cameraCheckpoint