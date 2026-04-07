
'use client'

import React from 'react'

export default function RuntimeHud(props: {
  mode: string
  subtitle: string
  starCount: number
  selectedStarLabel: string | null
  onHome: () => void
  onEsc: () => void
  onOpenLifeMap: () => void
  onOpenFocus: () => void
  onOpenReplay: () => void
  canOpenLifeMap: boolean
  canOpenFocus: boolean
  canOpenReplay: boolean
  interactionSuppressed: boolean
}) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 14,
          left: 14,
          right: 14,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 12,
        }}
      >
        <div
          style={{
            pointerEvents: 'none',
            padding: '8px 10px',
            borderRadius: 10,
            background: 'rgba(7,11,19,0.34)',
            border: '1px solid rgba(255,255,255,0.06)',
            color: '#dce6f5',
            fontFamily: 'sans-serif',
            fontSize: 12,
            backdropFilter: 'blur(4px)',
          }}
        >
          <div style={{ fontWeight: 600 }}>{props.mode.toUpperCase()}</div>
          {props.selectedStarLabel ? (
            <div style={{ opacity: 0.72, marginTop: 2 }}>{props.selectedStarLabel}</div>
          ) : null}
        </div>

        <div
          style={{
            pointerEvents: 'auto',
            display: 'flex',
            gap: 6,
            flexWrap: 'wrap',
            justifyContent: 'flex-end',
            opacity: 0.8,
          }}
        >
          <button disabled={props.interactionSuppressed || !props.canOpenLifeMap} onClick={props.onOpenLifeMap}>Map</button>
          <button disabled={props.interactionSuppressed || !props.canOpenFocus} onClick={props.onOpenFocus}>Focus</button>
          <button disabled={props.interactionSuppressed || !props.canOpenReplay} onClick={props.onOpenReplay}>Replay</button>
          <button disabled={props.interactionSuppressed} onClick={props.onEsc}>ESC</button>
          <button disabled={props.interactionSuppressed} onClick={props.onHome}>Home</button>
        </div>
      </div>
    </div>
  )
}
