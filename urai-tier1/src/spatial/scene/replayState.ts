export type ReplayPhase =
  | 'idle'
  | 'loading_replay'
  | 'replay_ready'
  | 'replay_playing'
  | 'replay_paused'
  | 'replay_scrubbing'
  | 'replay_complete'
  | 'replay_empty'
  | 'replay_error'

export type ReplaySegmentId = 'memory' | 'emotion' | 'pattern' | 'return'

export type ReplayVisibleAction =
  | 'play_replay'
  | 'pause_replay'
  | 'scrub_replay'
  | 'return_to_focus'
  | 'save_replay'
  | 'hide_replay'
  | 'correct_replay'

export type ReplaySegmentDefinition = {
  id: ReplaySegmentId
  label: string
  startsAtMs: number
  durationMs: number
  narratorLine: string
  trustLine: string
}

export type ReplayPhaseInput = {
  mode: 'home' | 'ascent' | 'life-map' | 'demo' | 'replay' | 'focus' | 'unwind' | 'mirror'
  hasReplayTarget: boolean
  isManifestLoading: boolean
  isGateLoading: boolean
  isGateBlocked: boolean
  isPlaying: boolean
  isScrubbing: boolean
  progressMs: number
  durationMs?: number
}

export type ReplayPhaseDefinition = {
  label: string
  userVisibleUi: string
  allowedActions: ReplayVisibleAction[]
  disabledActions: ReplayVisibleAction[]
  accessibilityBehavior: string
  errorHandling: string
}

export const REPLAY_SEGMENTS: ReplaySegmentDefinition[] = [
  {
    id: 'memory',
    label: 'Memory',
    startsAtMs: 0,
    durationMs: 2400,
    narratorLine: 'The memory opens as a quiet field.',
    trustLine: 'URAI is replaying the selected Life Map node, not judging it.',
  },
  {
    id: 'emotion',
    label: 'Emotion',
    startsAtMs: 2400,
    durationMs: 2600,
    narratorLine: 'The emotional signal becomes visible without needing a label.',
    trustLine: 'This phase reflects intensity and boundary signals from the memory profile.',
  },
  {
    id: 'pattern',
    label: 'Pattern',
    startsAtMs: 5000,
    durationMs: 2800,
    narratorLine: 'A repeated shape appears across the moment.',
    trustLine: 'URAI surfaced this because a recurring signal became readable.',
  },
  {
    id: 'return',
    label: 'Return',
    startsAtMs: 7800,
    durationMs: 2200,
    narratorLine: 'The replay settles back into Focus.',
    trustLine: 'You can return, save, hide, or correct this replay at any time.',
  },
]

export const REPLAY_DURATION_MS = REPLAY_SEGMENTS.reduce((total, segment) => total + segment.durationMs, 0)

export const REPLAY_PHASE_DEFINITIONS: Record<ReplayPhase, ReplayPhaseDefinition> = {
  idle: {
    label: 'Replay idle',
    userVisibleUi: 'Replay controls are hidden outside the replay route.',
    allowedActions: [],
    disabledActions: ['play_replay', 'pause_replay', 'scrub_replay', 'return_to_focus', 'save_replay', 'hide_replay', 'correct_replay'],
    accessibilityBehavior: 'Do not expose inactive replay controls to keyboard or screen readers.',
    errorHandling: 'Remain in the current non-replay route.',
  },
  loading_replay: {
    label: 'Loading Replay',
    userVisibleUi: 'Opening the selected memory replay.',
    allowedActions: ['return_to_focus'],
    disabledActions: ['play_replay', 'pause_replay', 'scrub_replay', 'save_replay', 'hide_replay', 'correct_replay'],
    accessibilityBehavior: 'Use polite live-region copy and keep Return to Focus reachable.',
    errorHandling: 'If loading fails, move to replay_error with a safe return action.',
  },
  replay_ready: {
    label: 'Replay Ready',
    userVisibleUi: 'The replay is ready to begin.',
    allowedActions: ['play_replay', 'scrub_replay', 'return_to_focus', 'save_replay', 'hide_replay', 'correct_replay'],
    disabledActions: ['pause_replay'],
    accessibilityBehavior: 'Expose play, scrub, and Return to Focus controls with clear labels.',
    errorHandling: 'If the replay target disappears, move to replay_empty.',
  },
  replay_playing: {
    label: 'Replay Playing',
    userVisibleUi: 'The memory pattern is unfolding.',
    allowedActions: ['pause_replay', 'scrub_replay', 'return_to_focus', 'save_replay', 'hide_replay', 'correct_replay'],
    disabledActions: ['play_replay'],
    accessibilityBehavior: 'Announce phase changes without stealing focus from controls.',
    errorHandling: 'Pause safely if progress cannot advance.',
  },
  replay_paused: {
    label: 'Replay Paused',
    userVisibleUi: 'The replay is paused at this moment.',
    allowedActions: ['play_replay', 'scrub_replay', 'return_to_focus', 'save_replay', 'hide_replay', 'correct_replay'],
    disabledActions: ['pause_replay'],
    accessibilityBehavior: 'Keep the current phase and scrubber position readable.',
    errorHandling: 'Keep the paused state stable until the user acts.',
  },
  replay_scrubbing: {
    label: 'Scrubbing Replay',
    userVisibleUi: 'The user is moving through the replay timeline.',
    allowedActions: ['play_replay', 'pause_replay', 'scrub_replay', 'return_to_focus'],
    disabledActions: [],
    accessibilityBehavior: 'Expose the current time and phase while scrubbing.',
    errorHandling: 'Clamp scrub position inside replay duration.',
  },
  replay_complete: {
    label: 'Replay Complete',
    userVisibleUi: 'The replay has returned to a settled state.',
    allowedActions: ['play_replay', 'scrub_replay', 'return_to_focus', 'save_replay', 'hide_replay', 'correct_replay'],
    disabledActions: ['pause_replay'],
    accessibilityBehavior: 'Announce completion and keep Return to Focus as the primary exit.',
    errorHandling: 'Allow replay restart from the beginning.',
  },
  replay_empty: {
    label: 'Replay Empty',
    userVisibleUi: 'No replay target is available.',
    allowedActions: ['return_to_focus'],
    disabledActions: ['play_replay', 'pause_replay', 'scrub_replay', 'save_replay', 'hide_replay', 'correct_replay'],
    accessibilityBehavior: 'Announce the empty state and keep one recovery action.',
    errorHandling: 'Return to Focus or Life Map without blame-oriented copy.',
  },
  replay_error: {
    label: 'Replay Needs Attention',
    userVisibleUi: 'Replay cannot open this memory right now.',
    allowedActions: ['return_to_focus'],
    disabledActions: ['play_replay', 'pause_replay', 'scrub_replay', 'save_replay', 'hide_replay', 'correct_replay'],
    accessibilityBehavior: 'Use calm assertive copy and keep recovery controls reachable.',
    errorHandling: 'Do not mask blocked access or loading failures as a ready replay.',
  },
}

export function clampReplayProgress(progressMs: number, durationMs: number = REPLAY_DURATION_MS) {
  return Math.max(0, Math.min(durationMs, progressMs))
}

export function getReplaySegmentAt(progressMs: number): ReplaySegmentDefinition {
  const clampedProgress = clampReplayProgress(progressMs)
  return (
    REPLAY_SEGMENTS.find((segment) => {
      const endAtMs = segment.startsAtMs + segment.durationMs
      return clampedProgress >= segment.startsAtMs && clampedProgress < endAtMs
    }) ?? REPLAY_SEGMENTS[REPLAY_SEGMENTS.length - 1]
  )
}

export function resolveReplayPhase(input: ReplayPhaseInput): ReplayPhase {
  if (input.mode !== 'replay') return 'idle'
  if (input.isGateBlocked && !input.isGateLoading) return 'replay_error'
  if (input.isGateLoading || input.isManifestLoading) return 'loading_replay'
  if (!input.hasReplayTarget) return 'replay_empty'
  if (input.isScrubbing) return 'replay_scrubbing'
  if (input.progressMs >= (input.durationMs ?? REPLAY_DURATION_MS)) return 'replay_complete'
  if (input.isPlaying) return 'replay_playing'
  if (input.progressMs > 0) return 'replay_paused'
  return 'replay_ready'
}

export function getReplayPhaseDefinition(phase: ReplayPhase): ReplayPhaseDefinition {
  return REPLAY_PHASE_DEFINITIONS[phase]
}
