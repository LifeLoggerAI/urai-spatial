'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MemoryMorphology } from '../memory/memoryMorphology'
import { ReplayPhase, ReplayPhaseDefinition, ReplaySegmentDefinition } from '../scene/replayState'

type ReplayActionState = 'idle' | 'saved' | 'hidden' | 'correction_open'

function percent(value: number) {
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`
}

function actionMessageFor(state: ReplayActionState) {
  if (state === 'saved') return 'Saved to your private replay space.'
  if (state === 'hidden') return 'Hidden from this replay path.'
  if (state === 'correction_open') return 'Correction mode opened. URAI will treat this reflection as user-adjusted.'
  return 'Private replay controls are ready.'
}

const panelStyle = {
  position: 'absolute',
  right: 22,
  top: 92,
  zIndex: 14,
  width: 'min(390px, calc(100vw - 44px))',
  padding: '18px 20px',
  border: '1px solid rgba(142, 220, 255, 0.25)',
  borderRadius: 24,
  background: 'linear-gradient(150deg, rgba(4, 12, 28, 0.78), rgba(15, 10, 38, 0.66))',
  boxShadow: '0 24px 90px rgba(0, 0, 0, 0.4), 0 0 42px rgba(34, 211, 238, 0.1)',
  backdropFilter: 'blur(18px)',
  WebkitBackdropFilter: 'blur(18px)',
} as const

const pillStyle = {
  minHeight: 34,
  borderRadius: 999,
  border: '1px solid rgba(142, 220, 255, 0.28)',
  background: 'rgba(95, 125, 255, 0.16)',
  color: '#edf7ff',
  padding: '6px 12px',
} as const

export function ReplayMetaPanel({
  morphology,
  phase,
  phaseDefinition,
  activeSegment,
  sourceLabel,
  manifestId,
  onReturnToFocus,
}: {
  morphology: MemoryMorphology
  phase: ReplayPhase
  phaseDefinition: ReplayPhaseDefinition
  activeSegment: ReplaySegmentDefinition
  sourceLabel: string
  manifestId?: string | null
  onReturnToFocus: () => void
}) {
  const router = useRouter()
  const [actionState, setActionState] = useState<ReplayActionState>('idle')
  const derivedSourceLabel = useMemo(() => {
    if (sourceLabel && sourceLabel !== 'LifeMap · Pattern Node') return sourceLabel
    return `LifeMap · ${morphology.systemLabel}`
  }, [morphology.systemLabel, sourceLabel])

  function openMirror() {
    if (!manifestId) return
    router.push(`/mirror?manifestId=${encodeURIComponent(manifestId)}&source=replay`)
  }

  return (
    <section style={panelStyle} data-testid="urai-replay-meta-panel" data-replay-phase={phase} data-replay-action-state={actionState} aria-label="Pattern replay details">
      <div style={{ color: 'rgba(182, 226, 255, 0.84)', fontSize: '0.68rem', letterSpacing: '0.2em', textTransform: 'uppercase' }}>Pattern Replay</div>
      <h2 style={{ margin: '8px 0', fontSize: '1.08rem', lineHeight: 1.2 }}>{activeSegment.narratorLine}</h2>
      <p style={{ margin: 0, color: 'rgba(235, 244, 255, 0.72)', fontSize: '0.84rem', lineHeight: 1.5 }}>{phaseDefinition.userVisibleUi}</p>

      <dl style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, margin: '14px 0' }}>
        <div><dt>Phase</dt><dd>{activeSegment.label}</dd></div>
        <div><dt>Source</dt><dd>{derivedSourceLabel}</dd></div>
        <div><dt>Signal</dt><dd>clarity · {percent(morphology.signals.replayReadiness)}</dd></div>
        <div><dt>Intensity</dt><dd>{percent(morphology.signals.emotionalIntensity)}</dd></div>
      </dl>

      <div style={{ borderTop: '1px solid rgba(142, 220, 255, 0.14)', paddingTop: 12 }}>
        <div style={{ color: 'rgba(182, 226, 255, 0.78)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.14em' }}>Why this appeared</div>
        <p style={{ margin: '6px 0 0', color: 'rgba(235, 244, 255, 0.74)', fontSize: '0.82rem', lineHeight: 1.48 }}>{activeSegment.trustLine}</p>
      </div>

      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 12, color: 'rgba(187, 247, 208, 0.92)', fontSize: '0.78rem' }} aria-label="Privacy status">
        <span aria-hidden="true">●</span>
        <span>Private · Only visible to you</span>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }} aria-label="Replay actions">
        <button type="button" data-testid="urai-replay-save" aria-pressed={actionState === 'saved'} onClick={() => setActionState('saved')} style={pillStyle}>Save</button>
        <button type="button" data-testid="urai-replay-hide" aria-pressed={actionState === 'hidden'} onClick={() => setActionState('hidden')} style={pillStyle}>Hide</button>
        <button type="button" data-testid="urai-replay-correct" aria-pressed={actionState === 'correction_open'} onClick={() => setActionState('correction_open')} style={pillStyle}>Correct</button>
        {manifestId ? <button type="button" data-testid="urai-replay-open-mirror" onClick={openMirror} style={pillStyle}>Open Mirror</button> : null}
      </div>

      <p data-testid="urai-replay-action-message" aria-live="polite" style={{ margin: '10px 0 0', color: 'rgba(235, 244, 255, 0.68)', fontSize: '0.78rem', lineHeight: 1.42 }}>{actionMessageFor(actionState)}</p>

      <button
        type="button"
        data-testid="urai-replay-return-control"
        style={{ width: '100%', minHeight: 40, marginTop: 14, borderRadius: 999, border: '1px solid rgba(255, 255, 255, 0.32)', background: 'linear-gradient(135deg, rgba(103, 232, 249, 0.96), rgba(139, 92, 246, 0.88))', color: '#050713', fontWeight: 800 }}
        onClick={onReturnToFocus}
      >
        Return to Focus
      </button>
    </section>
  )
}
