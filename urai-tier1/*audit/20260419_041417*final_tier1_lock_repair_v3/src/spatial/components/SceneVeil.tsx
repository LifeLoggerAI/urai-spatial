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
        transition: 'background 80ms linear',
      }}
    />
  )
}
