'use client'

import React from 'react'

export default function SceneVeil(props: {
  visible: boolean
  opacity: number
}) {
  if (!props.visible) return null

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        background: `rgba(0,0,0,${props.opacity})`,
        transition: 'background 80ms linear',
      }}
    />
  )
}
