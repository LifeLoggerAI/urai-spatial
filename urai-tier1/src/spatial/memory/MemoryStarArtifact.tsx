'use client'

import { CSSProperties } from 'react'
import { MemoryMorphology } from './memoryMorphology'

function percentLabel(value: number) {
  return `${Math.round(value * 100)}%`
}

function styleFor(morphology: MemoryMorphology) {
  return {
    '--memory-intensity': morphology.signals.emotionalIntensity,
    '--memory-readiness': morphology.signals.replayReadiness,
    '--memory-recovery': morphology.signals.recoveryState,
    '--memory-boundary': morphology.signals.memoryBoundary,
    '--memory-pressure': morphology.signals.pressureScore,
    '--memory-waveform': morphology.signals.waveformDensity,
    '--memory-particles': morphology.signals.particleField,
  } as CSSProperties
}

export default function MemoryStarArtifact({ morphology, replay = false }: { morphology: MemoryMorphology; replay?: boolean }) {
  return (
    <div
      className={`memory-star-artifact ${morphology.auraClassName} ${replay ? 'memory-star-artifact--replay' : ''}`}
      data-memory-state={morphology.state}
      data-memory-tone={morphology.tone}
      style={styleFor(morphology)}
      aria-hidden="true"
    >
      <div className="memory-star-artifact__gravity" />
      <div className="memory-star-artifact__ring memory-star-artifact__ring--boundary"><span>boundary {percentLabel(morphology.signals.memoryBoundary)}</span></div>
      <div className="memory-star-artifact__ring memory-star-artifact__ring--readiness"><span>readiness {percentLabel(morphology.signals.replayReadiness)}</span></div>
      <div className="memory-star-artifact__ring memory-star-artifact__ring--intensity"><span>intensity {percentLabel(morphology.signals.emotionalIntensity)}</span></div>
      <div className="memory-star-artifact__waveform" />
      <div className="memory-star-artifact__particle memory-star-artifact__particle--one" />
      <div className="memory-star-artifact__particle memory-star-artifact__particle--two" />
      <div className="memory-star-artifact__particle memory-star-artifact__particle--three" />
      <div className="memory-star-artifact__particle memory-star-artifact__particle--four" />
      <div className="memory-star-artifact__orb">
        <div className="memory-star-artifact__halo" />
        <div className="memory-star-artifact__scar memory-star-artifact__scar--one" />
        <div className="memory-star-artifact__scar memory-star-artifact__scar--two" />
        <div className="memory-star-artifact__core">
          <div className="memory-star-artifact__inner-scene" />
        </div>
      </div>
    </div>
  )
}
