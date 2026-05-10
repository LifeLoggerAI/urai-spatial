import type { SpatialAssetManifest } from '../assets/manifestTypes'

export type LifeMapNodeType =
  | 'memory'
  | 'insight'
  | 'ritual'
  | 'dream'
  | 'relationship'
  | 'recovery'
  | 'shadow'
  | 'milestone'
  | 'chapter'
  | 'voiceMoment'
  | 'locationMoment'
  | 'emotionalShift'
  | 'habitPattern'
  | 'socialPattern'
  | 'threshold'
  | 'rebirth'
  | 'legacy'
  | 'mirrorMoment'

export type EmotionalTone =
  | 'calm'
  | 'memory'
  | 'clarity'
  | 'recovery'
  | 'dream'
  | 'threshold'
  | 'ritual'
  | 'pain'
  | 'conflict'
  | 'rebirth'
  | 'shadow'
  | 'unresolved'

export type LifeMapSourceSignal =
  | 'rhythm'
  | 'voice-pattern'
  | 'location-shift'
  | 'relationship-frequency'
  | 'sleep-window'
  | 'activity-change'
  | 'reflection-thread'
  | 'replay-readiness'
  | 'habit-loop'
  | 'seasonal-context'

export type LifeMapUniverseNode = {
  id: string
  type: LifeMapNodeType
  title: string
  subtitle: string
  dateLabel: string
  timestamp: string
  emotionalTone: EmotionalTone
  emotionalIntensity: number
  importance: number
  unresolvedness: number
  position: readonly [number, number, number]
  color: string
  auraColor: string
  size: number
  pulseSpeed: number
  glyph: string
  relatedNodeIds: string[]
  connectedTo: string[]
  replayAvailable: boolean
  locked: boolean
  narratorLine: string
  whyThis: string
  privacyLevel: 'private' | 'demo-safe' | 'local-only'
  sourceSignals: LifeMapSourceSignal[]
  createdAt: string
  updatedAt: string
}

export type LifeMapUniverseEdge = {
  id: string
  from: string
  to: string
  arcType: 'recovery-path' | 'relationship-arc' | 'shadow-season' | 'purpose-thread' | 'habit-loop' | 'dream-memory' | 'threshold-rebirth'
  glow: string
  strength: number
}

const now = '2026-05-09T00:00:00.000Z'

const toneTokens: Record<EmotionalTone, Pick<LifeMapUniverseNode, 'color' | 'auraColor'>> = {
  calm: { color: '#d8ebff', auraColor: '#7dd3fc' },
  memory: { color: '#c7ddff', auraColor: '#67e8f9' },
  clarity: { color: '#eff6ff', auraColor: '#a5f3fc' },
  recovery: { color: '#f7d878', auraColor: '#8be78e' },
  dream: { color: '#c4b5fd', auraColor: '#8b5cf6' },
  threshold: { color: '#f4d784', auraColor: '#a855f7' },
  ritual: { color: '#ffe9a6', auraColor: '#c084fc' },
  pain: { color: '#fb7185', auraColor: '#7f1d1d' },
  conflict: { color: '#f97393', auraColor: '#a21caf' },
  rebirth: { color: '#ffffff', auraColor: '#bae6fd' },
  shadow: { color: '#3b1f5c', auraColor: '#111827' },
  unresolved: { color: '#6d28d9', auraColor: '#1e1b4b' },
}

function node(input: Omit<LifeMapUniverseNode, 'color' | 'auraColor' | 'createdAt' | 'updatedAt' | 'timestamp'> & { timestamp?: string }): LifeMapUniverseNode {
  const tone = toneTokens[input.emotionalTone]
  return {
    ...input,
    timestamp: input.timestamp ?? now,
    color: tone.color,
    auraColor: tone.auraColor,
    createdAt: now,
    updatedAt: now,
  }
}

export const LIFE_MAP_UNIVERSE_NODES: LifeMapUniverseNode[] = [
  node({ id: 'quiet-reset', type: 'memory', title: 'The Quiet Reset', subtitle: 'A calm signal returned after a compressed week.', dateLabel: 'Now', emotionalTone: 'calm', emotionalIntensity: 0.42, importance: 0.74, unresolvedness: 0.12, position: [-1.1, 1.1, 1.8], size: 1.15, pulseSpeed: 0.72, glyph: '◌', relatedNodeIds: ['small-morning-win', 'first-clear-morning'], connectedTo: ['small-morning-win'], replayAvailable: true, locked: false, narratorLine: 'The system noticed your rhythm becoming gentle again.', whyThis: 'URAI surfaced this because several quiet signals clustered around calmer rhythm, steadier recovery, and a lower active charge.', privacyLevel: 'demo-safe', sourceSignals: ['rhythm', 'activity-change', 'replay-readiness'] }),
  node({ id: 'heavy-fog-week', type: 'shadow', title: 'A Week of Heavy Fog', subtitle: 'The map holds this softly, without judgment.', dateLabel: '7 days ago', emotionalTone: 'shadow', emotionalIntensity: 0.86, importance: 0.82, unresolvedness: 0.72, position: [-4.8, 0.2, -6.2], size: 1.35, pulseSpeed: 1.1, glyph: '●', relatedNodeIds: ['night-too-loud', 'social-orbit-dimmed'], connectedTo: ['night-too-loud'], replayAvailable: false, locked: false, narratorLine: 'A dense season appeared, but it did not become the whole sky.', whyThis: 'URAI surfaced this because abstract changes in rhythm, sleep window, and relationship frequency formed a shadow season pattern.', privacyLevel: 'demo-safe', sourceSignals: ['sleep-window', 'relationship-frequency', 'rhythm'] }),
  node({ id: 'first-recovery-signal', type: 'recovery', title: 'First Signal of Recovery', subtitle: 'A small return of energy began to repeat.', dateLabel: '6 days ago', emotionalTone: 'recovery', emotionalIntensity: 0.61, importance: 0.86, unresolvedness: 0.2, position: [-2.5, 1.5, -2.4], size: 1.28, pulseSpeed: 0.88, glyph: '✦', relatedNodeIds: ['energy-returned-slowly', 'recovery-bloomed'], connectedTo: ['energy-returned-slowly'], replayAvailable: true, locked: false, narratorLine: 'Recovery did not arrive loudly. It returned as a thread.', whyThis: 'URAI surfaced this because recovery, rhythm, and activity-change signals began clustering in the same direction.', privacyLevel: 'demo-safe', sourceSignals: ['activity-change', 'rhythm', 'replay-readiness'] }),
  node({ id: 'conversation-stayed', type: 'voiceMoment', title: 'The Conversation That Stayed', subtitle: 'A voice moment kept orbiting the same emotional weather.', dateLabel: '5 days ago', emotionalTone: 'memory', emotionalIntensity: 0.7, importance: 0.78, unresolvedness: 0.38, position: [3.2, 1.6, -3.6], size: 1.18, pulseSpeed: 0.95, glyph: '◍', relatedNodeIds: ['pattern-returned', 'social-orbit-dimmed'], connectedTo: ['pattern-returned'], replayAvailable: true, locked: false, narratorLine: 'Some conversations stay because they are still teaching the pattern.', whyThis: 'URAI surfaced this because voice-pattern and relationship-frequency signals repeated near the same reflection thread.', privacyLevel: 'demo-safe', sourceSignals: ['voice-pattern', 'relationship-frequency', 'reflection-thread'] }),
  node({ id: 'pattern-returned', type: 'socialPattern', title: 'Pattern Returned Again', subtitle: 'A familiar relational loop became visible.', dateLabel: '5 days ago', emotionalTone: 'conflict', emotionalIntensity: 0.76, importance: 0.81, unresolvedness: 0.66, position: [4.8, 0.8, -5.1], size: 1.22, pulseSpeed: 1.25, glyph: '↺', relatedNodeIds: ['conversation-stayed', 'old-pattern-lost-grip'], connectedTo: ['old-pattern-lost-grip'], replayAvailable: true, locked: false, narratorLine: 'The old loop appeared again, but this time you could see it sooner.', whyThis: 'URAI surfaced this because repeated relationship-frequency and reflection-thread signals formed a recurring social pattern.', privacyLevel: 'demo-safe', sourceSignals: ['relationship-frequency', 'reflection-thread', 'habit-loop'] }),
  node({ id: 'small-morning-win', type: 'milestone', title: 'A Small Morning Win', subtitle: 'A tiny stable action had more weight than it seemed.', dateLabel: '4 days ago', emotionalTone: 'clarity', emotionalIntensity: 0.44, importance: 0.69, unresolvedness: 0.08, position: [-0.2, 2.2, 0.7], size: 1.05, pulseSpeed: 0.68, glyph: '✧', relatedNodeIds: ['quiet-reset', 'first-clear-morning'], connectedTo: ['first-clear-morning'], replayAvailable: true, locked: false, narratorLine: 'The smallest stable action became a star because it repeated.', whyThis: 'URAI surfaced this because low-intensity but consistent rhythm and activity-change signals aligned with recovery context.', privacyLevel: 'demo-safe', sourceSignals: ['rhythm', 'activity-change', 'seasonal-context'] }),
  node({ id: 'doorway-season', type: 'threshold', title: 'The Doorway Season', subtitle: 'The system marked a transition, not a diagnosis.', dateLabel: 'This month', emotionalTone: 'threshold', emotionalIntensity: 0.83, importance: 0.9, unresolvedness: 0.5, position: [0.2, 3.6, -7.2], size: 1.55, pulseSpeed: 1.08, glyph: '◇', relatedNodeIds: ['threshold-opened', 'rebirth-sequence'], connectedTo: ['threshold-opened'], replayAvailable: true, locked: false, narratorLine: 'This is not an ending. It is a doorway becoming visible.', whyThis: 'URAI surfaced this because seasonal context, reflection threads, and rhythm changes clustered around a life-transition shape.', privacyLevel: 'demo-safe', sourceSignals: ['seasonal-context', 'reflection-thread', 'rhythm'] }),
  node({ id: 'social-orbit-dimmed', type: 'relationship', title: 'Social Orbit Dimmed', subtitle: 'One orbit became quieter while the inner field stabilized.', dateLabel: '4 days ago', emotionalTone: 'unresolved', emotionalIntensity: 0.65, importance: 0.7, unresolvedness: 0.6, position: [5.9, 1.2, -1.2], size: 1.12, pulseSpeed: 1.05, glyph: '◒', relatedNodeIds: ['conversation-stayed', 'heavy-fog-week'], connectedTo: ['conversation-stayed'], replayAvailable: false, locked: false, narratorLine: 'Distance can be a signal, but URAI keeps it abstract and private.', whyThis: 'URAI surfaced this because relationship-frequency shifted while related emotional signals stayed active.', privacyLevel: 'demo-safe', sourceSignals: ['relationship-frequency', 'rhythm'] }),
  node({ id: 'energy-returned-slowly', type: 'recovery', title: 'Energy Came Back Slowly', subtitle: 'Recovery arced outward instead of snapping back.', dateLabel: '3 days ago', emotionalTone: 'recovery', emotionalIntensity: 0.58, importance: 0.76, unresolvedness: 0.18, position: [1.3, 2.4, -1.4], size: 1.22, pulseSpeed: 0.76, glyph: '✺', relatedNodeIds: ['first-recovery-signal', 'recovery-bloomed'], connectedTo: ['recovery-bloomed'], replayAvailable: true, locked: false, narratorLine: 'The return was gradual, and the map treated that as strength.', whyThis: 'URAI surfaced this because activity-change and rhythm signals improved gradually across repeated windows.', privacyLevel: 'demo-safe', sourceSignals: ['activity-change', 'rhythm'] }),
  node({ id: 'memory-thread', type: 'insight', title: 'A Memory Became a Thread', subtitle: 'Separate signals began forming one constellation.', dateLabel: '3 days ago', emotionalTone: 'memory', emotionalIntensity: 0.54, importance: 0.8, unresolvedness: 0.25, position: [-3.6, 2.7, 2.3], size: 1.2, pulseSpeed: 0.82, glyph: '⌁', relatedNodeIds: ['dream-memory-bridge', 'orb-remembered-thread'], connectedTo: ['orb-remembered-thread'], replayAvailable: true, locked: false, narratorLine: 'What looked separate began to arrange itself as a thread.', whyThis: 'URAI surfaced this because reflection-thread and replay-readiness signals connected across multiple memory-like moments.', privacyLevel: 'demo-safe', sourceSignals: ['reflection-thread', 'replay-readiness'] }),
  node({ id: 'night-too-loud', type: 'emotionalShift', title: 'The Night Everything Felt Too Loud', subtitle: 'An intensity star was placed deeper in the field.', dateLabel: '2 days ago', emotionalTone: 'pain', emotionalIntensity: 0.91, importance: 0.84, unresolvedness: 0.58, position: [-6.2, -0.1, -7.6], size: 1.42, pulseSpeed: 1.38, glyph: '✹', relatedNodeIds: ['heavy-fog-week', 'first-clear-morning'], connectedTo: ['first-clear-morning'], replayAvailable: true, locked: false, narratorLine: 'Intensity was real. It was also temporary weather.', whyThis: 'URAI surfaced this because high active charge appeared near rhythm and sleep-window disruption signals.', privacyLevel: 'demo-safe', sourceSignals: ['sleep-window', 'rhythm', 'activity-change'] }),
  node({ id: 'first-clear-morning', type: 'rebirth', title: 'The First Clear Morning', subtitle: 'A crystal-white node moved closer to the present.', dateLabel: 'Yesterday', emotionalTone: 'rebirth', emotionalIntensity: 0.63, importance: 0.88, unresolvedness: 0.05, position: [0.8, 2.9, 2.2], size: 1.42, pulseSpeed: 0.62, glyph: '✶', relatedNodeIds: ['small-morning-win', 'quiet-reset'], connectedTo: ['quiet-reset'], replayAvailable: true, locked: false, narratorLine: 'Clarity arrived as morning, not as proof you were fixed.', whyThis: 'URAI surfaced this because recovery and clarity signals aligned after a high-intensity window.', privacyLevel: 'demo-safe', sourceSignals: ['rhythm', 'activity-change', 'seasonal-context'] }),
  node({ id: 'recovery-bloomed', type: 'recovery', title: 'Recovery Bloomed Slowly', subtitle: 'The recovery path brightened across related nodes.', dateLabel: 'Yesterday', emotionalTone: 'recovery', emotionalIntensity: 0.69, importance: 0.87, unresolvedness: 0.1, position: [2.8, 2.2, 1.8], size: 1.36, pulseSpeed: 0.78, glyph: '✺', relatedNodeIds: ['first-recovery-signal', 'energy-returned-slowly'], connectedTo: ['first-clear-morning'], replayAvailable: true, locked: false, narratorLine: 'A bloom is not a switch. It is a rhythm that keeps returning.', whyThis: 'URAI surfaced this because repeated recovery signals became stable enough for replay.', privacyLevel: 'demo-safe', sourceSignals: ['replay-readiness', 'rhythm', 'activity-change'] }),
  node({ id: 'threshold-opened', type: 'threshold', title: 'A Threshold Opened', subtitle: 'A violet-gold portal formed at the edge of the old pattern.', dateLabel: 'Today', emotionalTone: 'threshold', emotionalIntensity: 0.74, importance: 0.92, unresolvedness: 0.34, position: [2.4, 4.0, -5.7], size: 1.52, pulseSpeed: 0.92, glyph: '◇', relatedNodeIds: ['doorway-season', 'rebirth-sequence'], connectedTo: ['rebirth-sequence'], replayAvailable: true, locked: false, narratorLine: 'The doorway is active because the old map no longer fully fits.', whyThis: 'URAI surfaced this because transition-shaped signals repeated around recovery, reflection, and seasonal context.', privacyLevel: 'demo-safe', sourceSignals: ['seasonal-context', 'reflection-thread', 'replay-readiness'] }),
  node({ id: 'old-pattern-lost-grip', type: 'insight', title: 'The Old Pattern Lost Its Grip', subtitle: 'The loop still existed, but its pull weakened.', dateLabel: 'Today', emotionalTone: 'clarity', emotionalIntensity: 0.66, importance: 0.86, unresolvedness: 0.18, position: [6.3, 2.0, 1.8], size: 1.28, pulseSpeed: 0.74, glyph: '⌁', relatedNodeIds: ['pattern-returned', 'conversation-stayed'], connectedTo: ['quiet-reset'], replayAvailable: true, locked: false, narratorLine: 'Seeing the pattern sooner changed its gravity.', whyThis: 'URAI surfaced this because a recurring loop appeared with lower unresolvedness and stronger clarity signals.', privacyLevel: 'demo-safe', sourceSignals: ['reflection-thread', 'relationship-frequency'] }),
  node({ id: 'orb-remembered-thread', type: 'mirrorMoment', title: 'The Orb Remembered the Thread', subtitle: 'The companion core kept the constellation coherent.', dateLabel: 'Now', emotionalTone: 'memory', emotionalIntensity: 0.5, importance: 0.77, unresolvedness: 0.06, position: [-0.8, 3.4, 4.8], size: 1.2, pulseSpeed: 0.7, glyph: '◉', relatedNodeIds: ['memory-thread', 'quiet-reset'], connectedTo: ['memory-thread'], replayAvailable: true, locked: false, narratorLine: 'I held the thread until it was safe to show it back to you.', whyThis: 'URAI surfaced this because replay-readiness and reflection-thread signals reached a stable, privacy-safe summary state.', privacyLevel: 'demo-safe', sourceSignals: ['replay-readiness', 'reflection-thread'] }),
  node({ id: 'dream-memory-bridge', type: 'dream', title: 'Dream Became Memory', subtitle: 'A violet thread connected imagination to lived rhythm.', dateLabel: 'This week', emotionalTone: 'dream', emotionalIntensity: 0.57, importance: 0.66, unresolvedness: 0.2, position: [-5.8, 3.1, 5.4], size: 1.1, pulseSpeed: 0.86, glyph: '☾', relatedNodeIds: ['memory-thread', 'orb-remembered-thread'], connectedTo: ['memory-thread'], replayAvailable: false, locked: false, narratorLine: 'The dream did not explain you. It echoed a pattern gently.', whyThis: 'URAI surfaced this because dream-like reflection language overlapped with a memory thread.', privacyLevel: 'demo-safe', sourceSignals: ['reflection-thread', 'seasonal-context'] }),
  node({ id: 'habit-loop-softened', type: 'habitPattern', title: 'The Habit Loop Softened', subtitle: 'A repeated behavior lost some of its charge.', dateLabel: 'This week', emotionalTone: 'calm', emotionalIntensity: 0.39, importance: 0.64, unresolvedness: 0.16, position: [4.2, 0.4, 4.6], size: 1.0, pulseSpeed: 0.64, glyph: '↺', relatedNodeIds: ['small-morning-win', 'old-pattern-lost-grip'], connectedTo: ['small-morning-win'], replayAvailable: false, locked: false, narratorLine: 'Softening is progress the nervous system can actually keep.', whyThis: 'URAI surfaced this because habit-loop intensity decreased near calmer rhythm signals.', privacyLevel: 'demo-safe', sourceSignals: ['habit-loop', 'rhythm'] }),
  node({ id: 'place-held-memory', type: 'locationMoment', title: 'A Place Held the Memory', subtitle: 'A location shift carried emotional residue without exposing raw place data.', dateLabel: 'This month', emotionalTone: 'memory', emotionalIntensity: 0.52, importance: 0.62, unresolvedness: 0.24, position: [-6.6, 1.2, 0.9], size: 1.0, pulseSpeed: 0.72, glyph: '⌖', relatedNodeIds: ['memory-thread'], connectedTo: ['memory-thread'], replayAvailable: false, locked: true, narratorLine: 'The place is private; only its symbolic weight remains visible.', whyThis: 'URAI surfaced this because an abstract location-shift aligned with a memory thread. Raw location is not shown here.', privacyLevel: 'local-only', sourceSignals: ['location-shift', 'reflection-thread'] }),
  node({ id: 'purpose-thread-lit', type: 'chapter', title: 'Purpose Thread Lit Up', subtitle: 'A far chapter star brightened behind recent recovery.', dateLabel: 'Legacy arc', emotionalTone: 'clarity', emotionalIntensity: 0.62, importance: 0.83, unresolvedness: 0.12, position: [7.4, 3.1, -8.4], size: 1.34, pulseSpeed: 0.68, glyph: '✧', relatedNodeIds: ['threshold-opened', 'legacy-star'], connectedTo: ['legacy-star'], replayAvailable: true, locked: false, narratorLine: 'A future-facing thread became easier to see from here.', whyThis: 'URAI surfaced this because chapter-level reflection and recovery signals converged around purpose language.', privacyLevel: 'demo-safe', sourceSignals: ['reflection-thread', 'seasonal-context'] }),
  node({ id: 'legacy-star', type: 'legacy', title: 'A Legacy Star Waited Farther Out', subtitle: 'A distant node marks continuity beyond the present chapter.', dateLabel: 'Far field', emotionalTone: 'rebirth', emotionalIntensity: 0.48, importance: 0.9, unresolvedness: 0.05, position: [9.2, 4.4, -11.8], size: 1.48, pulseSpeed: 0.55, glyph: '✶', relatedNodeIds: ['purpose-thread-lit'], connectedTo: ['purpose-thread-lit'], replayAvailable: false, locked: true, narratorLine: 'Some stars are not ready to replay. They simply hold direction.', whyThis: 'URAI surfaced this as a distant chapter marker using abstract, privacy-safe continuity signals.', privacyLevel: 'demo-safe', sourceSignals: ['seasonal-context', 'reflection-thread'] }),
  node({ id: 'rebirth-sequence', type: 'rebirth', title: 'The Rebirth Sequence Began', subtitle: 'Threshold energy turned white-crystal at the edge.', dateLabel: 'Next chapter', emotionalTone: 'rebirth', emotionalIntensity: 0.71, importance: 0.93, unresolvedness: 0.08, position: [4.5, 4.6, -7.4], size: 1.6, pulseSpeed: 0.7, glyph: '✶', relatedNodeIds: ['threshold-opened', 'purpose-thread-lit'], connectedTo: ['purpose-thread-lit'], replayAvailable: true, locked: false, narratorLine: 'The next chapter begins as a light thread, not a command.', whyThis: 'URAI surfaced this because threshold and recovery signals formed a stable transition-to-rebirth path.', privacyLevel: 'demo-safe', sourceSignals: ['replay-readiness', 'seasonal-context', 'rhythm'] }),
]

export const LIFE_MAP_UNIVERSE_EDGES: LifeMapUniverseEdge[] = [
  { id: 'edge-recovery-1', from: 'heavy-fog-week', to: 'first-recovery-signal', arcType: 'recovery-path', glow: '#a7f3d0', strength: 0.72 },
  { id: 'edge-recovery-2', from: 'first-recovery-signal', to: 'energy-returned-slowly', arcType: 'recovery-path', glow: '#fde68a', strength: 0.8 },
  { id: 'edge-recovery-3', from: 'energy-returned-slowly', to: 'recovery-bloomed', arcType: 'recovery-path', glow: '#f7d878', strength: 0.86 },
  { id: 'edge-recovery-4', from: 'recovery-bloomed', to: 'first-clear-morning', arcType: 'recovery-path', glow: '#bae6fd', strength: 0.9 },
  { id: 'edge-relationship-1', from: 'conversation-stayed', to: 'pattern-returned', arcType: 'relationship-arc', glow: '#e879f9', strength: 0.7 },
  { id: 'edge-relationship-2', from: 'pattern-returned', to: 'old-pattern-lost-grip', arcType: 'relationship-arc', glow: '#a5f3fc', strength: 0.78 },
  { id: 'edge-shadow-1', from: 'heavy-fog-week', to: 'night-too-loud', arcType: 'shadow-season', glow: '#7c3aed', strength: 0.65 },
  { id: 'edge-shadow-2', from: 'night-too-loud', to: 'first-clear-morning', arcType: 'shadow-season', glow: '#dbeafe', strength: 0.72 },
  { id: 'edge-purpose-1', from: 'threshold-opened', to: 'purpose-thread-lit', arcType: 'purpose-thread', glow: '#fef3c7', strength: 0.74 },
  { id: 'edge-purpose-2', from: 'purpose-thread-lit', to: 'legacy-star', arcType: 'purpose-thread', glow: '#bae6fd', strength: 0.62 },
  { id: 'edge-habit-1', from: 'small-morning-win', to: 'habit-loop-softened', arcType: 'habit-loop', glow: '#7dd3fc', strength: 0.58 },
  { id: 'edge-dream-1', from: 'dream-memory-bridge', to: 'memory-thread', arcType: 'dream-memory', glow: '#c4b5fd', strength: 0.66 },
  { id: 'edge-thread-1', from: 'memory-thread', to: 'orb-remembered-thread', arcType: 'dream-memory', glow: '#67e8f9', strength: 0.84 },
  { id: 'edge-threshold-1', from: 'doorway-season', to: 'threshold-opened', arcType: 'threshold-rebirth', glow: '#f4d784', strength: 0.86 },
  { id: 'edge-threshold-2', from: 'threshold-opened', to: 'rebirth-sequence', arcType: 'threshold-rebirth', glow: '#ffffff', strength: 0.94 },
]

export const LIFE_MAP_FIRESTORE_COLLECTION_PATHS = [
  'users/{userId}/homeWorldState/current',
  'users/{userId}/lifeMapNodes/{nodeId}',
  'users/{userId}/lifeMapEdges/{edgeId}',
  'users/{userId}/lifeMapChapters/{chapterId}',
  'users/{userId}/lifeMapSeasons/{seasonId}',
  'users/{userId}/narratorInsights/{insightId}',
  'users/{userId}/replayPaths/{pathId}',
  'users/{userId}/mirrorStates/{stateId}',
  'users/{userId}/spatialPreferences/current',
] as const

export function lifeMapNodeToManifest(node: LifeMapUniverseNode): SpatialAssetManifest {
  return {
    manifestId: node.id,
    manifestVersion: '2026-05-09.urai-spatial.locked.v1',
    jobId: `lifemap-${node.id}`,
    ownerId: 'launch-demo',
    projectId: 'urai-spatial',
    assetType: `${node.type} star`,
    artifacts: [],
    provider: 'seed',
    model: 'life-map-universe-v1',
    promptPreview: `${node.title}. ${node.subtitle} ${node.narratorLine}`,
    spatialCompatibility: { supported: true, type: 'model3d' },
  }
}
