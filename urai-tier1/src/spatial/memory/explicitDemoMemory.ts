import { buildExplicitDemoMemory, type SelectedMemory } from './selectedMemoryContract'

const QUIET_RESET_ID = 'demo:quiet-reset'
const QUIET_RESET_MANIFEST_ID = 'replay-recovery-thread'

export function buildNamedExplicitDemoMemory(id: string): SelectedMemory {
  const memory = buildExplicitDemoMemory(id)
  if (id !== QUIET_RESET_ID) return memory

  return {
    ...memory,
    title: 'The Quiet Reset',
    summary: 'A disclosed demonstration of a quiet reset after sustained pressure. This is not personal data.',
    emotionalState: 'relief',
    emotionalArc: ['pressure', 'permission', 'reset', 'return'],
    replayManifest: {
      ...memory.replayManifest,
      id: QUIET_RESET_MANIFEST_ID,
      durationMs: 12_000,
      transcript: 'Explicit demonstration replay: pressure softens, permission appears, and the scene returns to calm.',
      segments: [
        { id: 'quiet-reset-arrival', kind: 'symbolic-bridge', evidenceClass: 'SYMBOLIC', evidenceIds: ['demo-symbolic-fixture'], legacyPhase: 'memory', label: 'Arrival', caption: 'The pressure becomes visible.', narratorLine: 'This is an explicit demonstration memory.', startsAtMs: 0, durationMs: 2_800 },
        { id: 'quiet-reset-reflection', kind: 'reflection', evidenceClass: 'SYMBOLIC', evidenceIds: ['demo-symbolic-fixture'], legacyPhase: 'emotion', label: 'Reflection', caption: 'Permission creates room to breathe.', narratorLine: 'No personal inference is being made.', startsAtMs: 2_800, durationMs: 3_000 },
        { id: 'quiet-reset-context', kind: 'derived-context', evidenceClass: 'SYMBOLIC', evidenceIds: ['demo-symbolic-fixture'], legacyPhase: 'pattern', label: 'Context', caption: 'The reset interrupts the old loop.', narratorLine: 'This pattern exists only in the disclosed fixture.', startsAtMs: 5_800, durationMs: 3_200 },
        { id: 'quiet-reset-return', kind: 'symbolic-bridge', evidenceClass: 'SYMBOLIC', evidenceIds: ['demo-symbolic-fixture'], legacyPhase: 'return', label: 'Return', caption: 'The scene settles into quiet.', narratorLine: 'Return to the explicit demo Focus chamber.', startsAtMs: 9_000, durationMs: 3_000 },
      ],
    },
    narrator: {
      focus: 'Selected memory chamber. The quiet reset is ready as an explicit demonstration.',
      replay: 'Replay the thread from pressure through permission and return.',
    },
    star: {
      ...memory.star,
      id: 'quiet-reset',
    },
  }
}
