'use client'

import { MemoryMorphology } from '../memory/memoryMorphology'
import { ReplayPhase, ReplayPhaseDefinition, ReplaySegmentDefinition } from '../scene/replayState'

function percent(value: number) {
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`
}

export function ReplayMetaPanel({
  morphology,
  phase,
  phaseDefinition,
  activeSegment,
  sourceLabel,
  onReturnToFocus,
}: {
  morphology: MemoryMorphology
  phase: ReplayPhase
  phaseDefinition: ReplayPhaseDefinition
  activeSegment: ReplaySegmentDefinition
  sourceLabel: string
  onReturnToFocus: () => void
}) {
  return (
    <section className="urai-replay-meta-panel" data-testid="urai-replay-meta-panel" data-replay-phase={phase} aria-label="Replay stream details">
      <div className="urai-replay-meta-panel__eyebrow">Replay Stream</div>
      <h2>{activeSegment.narratorLine}</h2>
      <p>{phaseDefinition.userVisibleUi}</p>

      <dl className="urai-replay-meta-panel__facts">
        <div>
          <dt>Phase</dt>
          <dd>{activeSegment.label}</dd>
        </div>
        <div>
          <dt>Source</dt>
          <dd>{sourceLabel}</dd>
        </div>
        <div>
          <dt>Signal</dt>
          <dd>clarity · {percent(morphology.signals.replayReadiness)}</dd>
        </div>
        <div>
          <dt>Intensity</dt>
          <dd>{percent(morphology.signals.emotionalIntensity)}</dd>
        </div>
      </dl>

      <div className="urai-replay-meta-panel__why">
        <div className="urai-replay-meta-panel__section-title">Why this appeared</div>
        <p>{activeSegment.trustLine}</p>
      </div>

      <div className="urai-replay-meta-panel__privacy" aria-label="Privacy status">
        <span aria-hidden="true">●</span>
        <span>Private to you</span>
      </div>

      <div className="urai-replay-meta-panel__actions" aria-label="Replay actions">
        <button type="button">Save</button>
        <button type="button">Hide</button>
        <button type="button">Correct</button>
      </div>

      <button type="button" className="urai-replay-meta-panel__return" onClick={onReturnToFocus}>
        Return to Focus
      </button>
    </section>
  )
}
