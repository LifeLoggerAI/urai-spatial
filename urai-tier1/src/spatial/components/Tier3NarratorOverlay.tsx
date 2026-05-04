'use client'

import React from 'react'
import { readSpatialRuntimeFlags } from '@/spatial/runtime/runtimeFlags'
import {
  resolveNarratorLine,
  resolveNarratorOpacity,
  resolveNarratorTransform,
  resolveNarratorTitleColor,
  resolveNarratorSubtitleColor,
} from '@/spatial/canon/tier3Narrator'

type Tier3NarratorOverlayProps = {
  mode: string
  transitionPhase: string
  visible?: boolean
}

export default function Tier3NarratorOverlay({
  mode,
  transitionPhase,
  visible = true,
}: Tier3NarratorOverlayProps) {
  const flags = readSpatialRuntimeFlags()
  if (!visible || flags.publicDemoMode || flags.recordingMode) return null

  const line = resolveNarratorLine(mode)
  const opacity = resolveNarratorOpacity(mode, transitionPhase)
  const transform = resolveNarratorTransform(mode, transitionPhase)
  const titleColor = resolveNarratorTitleColor(mode)
  const subtitleColor = resolveNarratorSubtitleColor(mode)

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        left: '50%',
        bottom: '7.5%',
        transform,
        pointerEvents: 'none',
        opacity,
        transition: 'opacity 260ms ease-out, transform 320ms cubic-bezier(0.22, 1, 0.36, 1)',
        textAlign: 'center',
        zIndex: 40,
        width: 'min(860px, 88vw)',
      }}
    >
      <div
        style={{
          display: 'inline-block',
          padding: '10px 18px 8px 18px',
          borderRadius: '999px',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.00))',
          boxShadow: '0 0 42px rgba(0,0,0,0.16)',
          backdropFilter: 'blur(1.5px)',
        }}
      >
        <div
          style={{
            fontSize: 'clamp(18px, 2.2vw, 28px)',
            lineHeight: 1.12,
            letterSpacing: '0.01em',
            color: titleColor,
            textShadow: '0 0 20px rgba(0,0,0,0.34)',
            marginBottom: '7px',
            fontWeight: 600,
          }}
        >
          {line.title}
        </div>
        <div
          style={{
            fontSize: 'clamp(12px, 1.25vw, 15px)',
            lineHeight: 1.34,
            letterSpacing: '0.018em',
            color: subtitleColor,
            textShadow: '0 0 16px rgba(0,0,0,0.28)',
            fontWeight: 420,
          }}
        >
          {line.subtitle}
        </div>
      </div>
    </div>
  )
}
