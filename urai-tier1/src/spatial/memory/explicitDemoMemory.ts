import { buildExplicitDemoMemory, type SelectedMemory } from './selectedMemoryContract'
import { DEMO_MEMORY_STAR_NODE_BY_ID } from './memoryStarSchema'

const QUIET_RESET_ID = 'demo:quiet-reset'
const QUIET_RESET_MANIFEST_ID = 'replay-recovery-thread'

export function buildNamedExplicitDemoMemory(id: string): SelectedMemory {
  const memory = buildExplicitDemoMemory(id)
  const starId = id.startsWith('demo:') ? id.slice('demo:'.length) : null
  const star = starId && Object.hasOwn(DEMO_MEMORY_STAR_NODE_BY_ID, starId) ? DEMO_MEMORY_STAR_NODE_BY_ID[starId] : null
  if (star?.privacyState === 'demo' && star.sourceType === 'demo' && star.userId === null) {
    // The bundled star is authoritative only for this disclosed sample. Never
    // add people, place, or personal inference from the generic fixture.
    return {
      ...memory,
      title: star.title,
      occurredAt: star.createdAt,
      summary: `${star.description} ${star.provenanceSummary}`,
      people: [],
      place: undefined,
      emotionalState: star.emotionalSignature.primary,
      emotionalArc: [],
      replayManifest: {
        ...memory.replayManifest,
        id: star.id,
        transcript: `Demonstration memory: ${star.title}. ${star.provenanceSummary} No personal inference is made.`,
        segments: memory.replayManifest.segments.map((segment) => ({
          ...segment,
          caption: segment.id === 'memory' ? star.description : 'This sequence belongs to the disclosed demonstration sample.',
          narratorLine: segment.id === 'memory' ? `Demonstration memory: ${star.title}.` : 'No personal inference is being made.',
        })),
      },
      narrator: {
        focus: `Demonstration memory: ${star.title}. ${star.provenanceSummary}`,
        replay: `Replay the disclosed ${star.title} sample. No personal inference is made.`,
      },
      star: { ...memory.star, id: star.id },
    }
  }
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
        { id: 'memory', label: 'Memory', caption: 'The pressure becomes visible.', narratorLine: 'This is an explicit demonstration memory.', startsAtMs: 0, durationMs: 2_800 },
        { id: 'emotion', label: 'Emotion', caption: 'Permission creates room to breathe.', narratorLine: 'No personal inference is being made.', startsAtMs: 2_800, durationMs: 3_000 },
        { id: 'pattern', label: 'Pattern', caption: 'The reset interrupts the old loop.', narratorLine: 'This pattern exists only in the disclosed fixture.', startsAtMs: 5_800, durationMs: 3_200 },
        { id: 'return', label: 'Return', caption: 'The scene settles into quiet.', narratorLine: 'Return to the explicit demo Focus star.', startsAtMs: 9_000, durationMs: 3_000 },
      ],
    },
    narrator: {
      focus: 'Selected memory star. The quiet reset is ready as an explicit demonstration.',
      replay: 'Replay the thread from pressure through permission and return.',
    },
    star: {
      ...memory.star,
      id: 'quiet-reset',
    },
  }
}
