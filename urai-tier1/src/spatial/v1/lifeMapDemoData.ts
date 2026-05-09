import type {
  HomeWorldState,
  LifeMapChapter,
  LifeMapEdge,
  LifeMapNode,
  LifeMapSeason,
  MirrorOfBecomingState,
  NarratorInsight,
  ReplayPath,
  UserSpatialPreferences,
} from './lifeMapTypes';

const now = '2026-05-09T00:00:00.000Z';

function node(input: Omit<LifeMapNode, 'createdAt' | 'updatedAt'>): LifeMapNode {
  return { ...input, createdAt: now, updatedAt: now };
}

function edge(input: Omit<LifeMapEdge, 'createdAt' | 'updatedAt'>): LifeMapEdge {
  return { ...input, createdAt: now, updatedAt: now };
}

export const demoHomeWorldState: HomeWorldState = {
  mode: 'home',
  mood: {
    primary: 'recovery',
    intensity: 0.62,
    auraColor: '#9fda7a',
    skyTone: 'green-gold reopening under blue haze',
    narratorTone: 'warm',
  },
  cognitive: {
    clarity: 'focused',
    fogDensity: 0.28,
    particleTempo: 0.42,
    portalSharpness: 0.74,
  },
  recovery: {
    phase: 'reopening',
    glow: 0.7,
    groundRootDepth: 0.56,
    smootherOrbPulse: true,
  },
  rhythm: {
    label: 'recovering',
    score: 74,
    horizonLevel: 0.58,
  },
  relationshipAtmosphere: {
    warmth: 0.57,
    silenceDistance: 0.33,
    repairGlow: 0.51,
    tensionParticles: 0.2,
  },
  signalFreshness: {
    lastUpdatedAt: now,
    freshness: 'demo',
    sourceCount: 7,
    privacyNote: 'Public-safe symbolic demo only; no raw private signal is shown.',
  },
  orbWhisper: 'The sky is ready when you are.',
  skyPortalReady: true,
};

export const lifeMapDemoNodes: LifeMapNode[] = [
  node({ id: 'quiet-reset', type: 'memory', title: 'The Quiet Reset', subtitle: 'A softer evening after overload', timestamp: '2026-01-04T20:15:00.000Z', emotionalTone: 'calm', emotionalIntensity: 0.54, importance: 0.7, unresolvedness: 0.18, position: { x: -22, y: 8, z: 12 }, color: '#8fdcff', auraColor: '#bfefff', size: 1.15, pulseSpeed: 0.72, glyph: '◌', relatedNodeIds: ['small-morning-win', 'first-signal-recovery'], narratorLine: 'A quieter rhythm returned before the week knew how to name it.', whyThis: 'Low friction, softer rhythm, and reduced pressure clustered around this moment.', privacyLevel: 'publicSafe', sourceSignals: ['rhythm-shift', 'low-friction-evening'], chapterId: 'chapter-repair', seasonId: 'season-winter-repair' }),
  node({ id: 'week-heavy-fog', type: 'shadow', title: 'A Week of Heavy Fog', subtitle: 'The horizon lowered but did not disappear', timestamp: '2026-01-12T09:00:00.000Z', emotionalTone: 'low', emotionalIntensity: 0.78, importance: 0.82, unresolvedness: 0.65, position: { x: -58, y: -18, z: -40 }, color: '#7c3a72', auraColor: '#a85584', size: 1.28, pulseSpeed: 0.38, glyph: '◒', relatedNodeIds: ['pattern-returned-again', 'quiet-reset'], narratorLine: 'The fog was not failure; it was the system protecting energy.', whyThis: 'Repeated low-energy atmosphere and slower recovery signals formed a shadow season.', privacyLevel: 'privateSummary', sourceSignals: ['fatigue-pattern', 'late-scroll', 'low-motion'], chapterId: 'chapter-shadow', seasonId: 'season-winter-repair' }),
  node({ id: 'first-signal-recovery', type: 'recovery', title: 'First Signal of Recovery', subtitle: 'A green-gold opening in the body field', timestamp: '2026-01-18T11:30:00.000Z', emotionalTone: 'recovery', emotionalIntensity: 0.66, importance: 0.86, unresolvedness: 0.22, position: { x: 6, y: 18, z: -24 }, color: '#b6e46c', auraColor: '#d9f99d', size: 1.35, pulseSpeed: 0.9, glyph: '✦', relatedNodeIds: ['quiet-reset', 'energy-came-back-slowly'], narratorLine: 'The first recovery signal was small enough to be trustworthy.', whyThis: 'Several calm signals appeared together without forcing a strong conclusion.', privacyLevel: 'publicSafe', sourceSignals: ['morning-stability', 'reduced-device-friction'], chapterId: 'chapter-repair', seasonId: 'season-winter-repair' }),
  node({ id: 'conversation-that-stayed', type: 'relationship', title: 'The Conversation That Stayed', subtitle: 'A social echo that kept orbiting', timestamp: '2026-01-23T19:45:00.000Z', emotionalTone: 'rose-warmth', emotionalIntensity: 0.69, importance: 0.78, unresolvedness: 0.42, position: { x: 42, y: 10, z: -62 }, color: '#fb7185', auraColor: '#fecdd3', size: 1.18, pulseSpeed: 0.62, glyph: '∞', relatedNodeIds: ['social-orbit-dimmed', 'paired-glow-repair'], narratorLine: 'Some conversations become gravity even after they end.', whyThis: 'Relationship warmth and lingering emotional echo were detected as a safe symbolic cluster.', privacyLevel: 'privateSummary', sourceSignals: ['social-frequency', 'tone-aftereffect'], chapterId: 'chapter-relationship', seasonId: 'season-rose-orbit' }),
  node({ id: 'pattern-returned-again', type: 'habitPattern', title: 'Pattern Returned Again', subtitle: 'The loop showed itself without judgment', timestamp: '2026-02-01T22:10:00.000Z', emotionalTone: 'shadow', emotionalIntensity: 0.72, importance: 0.75, unresolvedness: 0.74, position: { x: -76, y: 4, z: -105 }, color: '#9f1239', auraColor: '#f0abfc', size: 1.12, pulseSpeed: 0.45, glyph: '↻', relatedNodeIds: ['week-heavy-fog', 'habit-loop-softened'], narratorLine: 'A loop returned, but this time it became visible sooner.', whyThis: 'Repeated timing and friction signals formed a habit-loop marker.', privacyLevel: 'privateSummary', sourceSignals: ['repeat-timing', 'device-friction'], chapterId: 'chapter-shadow', seasonId: 'season-shadow-fog' }),
  node({ id: 'small-morning-win', type: 'milestone', title: 'A Small Morning Win', subtitle: 'Not dramatic, but real', timestamp: '2026-02-05T08:40:00.000Z', emotionalTone: 'joy', emotionalIntensity: 0.48, importance: 0.68, unresolvedness: 0.08, position: { x: -8, y: 38, z: -74 }, color: '#facc15', auraColor: '#fde68a', size: 1, pulseSpeed: 1.05, glyph: '✺', relatedNodeIds: ['quiet-reset', 'first-signal-recovery'], narratorLine: 'The win was small because the system was rebuilding trust.', whyThis: 'A minor stability signal mattered because it appeared after a low-pressure stretch.', privacyLevel: 'publicSafe', sourceSignals: ['morning-rhythm', 'positive-action'], chapterId: 'chapter-repair', seasonId: 'season-winter-repair' }),
  node({ id: 'doorway-season', type: 'threshold', title: 'The Doorway Season', subtitle: 'A threshold opened without rushing you through it', timestamp: '2026-02-14T17:00:00.000Z', emotionalTone: 'threshold', emotionalIntensity: 0.83, importance: 0.9, unresolvedness: 0.5, position: { x: 82, y: 35, z: -130 }, color: '#c084fc', auraColor: '#fbbf24', size: 1.42, pulseSpeed: 0.58, glyph: '◇', relatedNodeIds: ['threshold-rebirth-sequence', 'mirror-pattern-softened'], narratorLine: 'A doorway is not a demand; it is a place where the old shape loosens.', whyThis: 'Multiple symbolic transition signals clustered around a change in rhythm and relationship gravity.', privacyLevel: 'privateSummary', sourceSignals: ['transition-cluster', 'routine-break'], chapterId: 'chapter-threshold', seasonId: 'season-threshold' }),
  node({ id: 'social-orbit-dimmed', type: 'socialPattern', title: 'Social Orbit Dimmed', subtitle: 'Silence became visible as distance', timestamp: '2026-02-20T21:10:00.000Z', emotionalTone: 'relationship-distance', emotionalIntensity: 0.63, importance: 0.66, unresolvedness: 0.57, position: { x: 64, y: -22, z: -122 }, color: '#be6b7a', auraColor: '#fda4af', size: 1.05, pulseSpeed: 0.4, glyph: '○', relatedNodeIds: ['conversation-that-stayed', 'paired-glow-repair'], narratorLine: 'Distance is still a signal, even when nothing is said.', whyThis: 'A drop in interaction frequency was represented as distance, not judgment.', privacyLevel: 'privateSummary', sourceSignals: ['social-silence', 'interaction-gap'], chapterId: 'chapter-relationship', seasonId: 'season-rose-orbit' }),
  node({ id: 'energy-came-back-slowly', type: 'recovery', title: 'Energy Came Back Slowly', subtitle: 'The ground brightened first', timestamp: '2026-03-02T15:20:00.000Z', emotionalTone: 'recovery', emotionalIntensity: 0.59, importance: 0.8, unresolvedness: 0.16, position: { x: 14, y: -28, z: -156 }, color: '#84cc16', auraColor: '#bef264', size: 1.2, pulseSpeed: 0.84, glyph: '⌁', relatedNodeIds: ['first-signal-recovery', 'sprout-root-glow'], narratorLine: 'Energy returned from the ground, not the sky.', whyThis: 'Recovery signals appeared as steadier motion and less compressed evening rhythm.', privacyLevel: 'publicSafe', sourceSignals: ['movement-stability', 'sleep-window'], chapterId: 'chapter-repair', seasonId: 'season-green-return' }),
  node({ id: 'memory-became-thread', type: 'insight', title: 'A Memory Became a Thread', subtitle: 'One star connected to several others', timestamp: '2026-03-08T12:00:00.000Z', emotionalTone: 'insight', emotionalIntensity: 0.61, importance: 0.84, unresolvedness: 0.25, position: { x: -30, y: 64, z: -170 }, color: '#67e8f9', auraColor: '#cffafe', size: 1.22, pulseSpeed: 0.76, glyph: '✧', relatedNodeIds: ['quiet-reset', 'pattern-returned-again', 'doorway-season'], narratorLine: 'The moment mattered because it began connecting the map.', whyThis: 'The same symbolic pattern appeared across memory, habit, and threshold nodes.', privacyLevel: 'publicSafe', sourceSignals: ['pattern-correlation', 'narrator-synthesis'], chapterId: 'chapter-insight', seasonId: 'season-green-return' }),
];

const moreNodes: LifeMapNode[] = [
  ['dream-door-opened','dream','The Dream Door Opened','A violet image repeated softly',-46,72,-230,'#8b5cf6','✧','dream-to-memory-bridge'],
  ['voice-moment-softened','voiceMoment','A Voice Moment Softened','The tone changed before the words did',34,58,-210,'#7dd3fc','◍','conversation-that-stayed'],
  ['old-room-glow','locationMoment','The Old Room Glowed','A place held more memory than expected',-88,-34,-250,'#93c5fd','⌂','memory-became-thread'],
  ['habit-loop-softened','habitPattern','The Loop Softened','The pattern came back with less force',-64,20,-285,'#a3e635','↺','pattern-returned-again'],
  ['paired-glow-repair','relationship','Paired Glow of Repair','Two lights moved closer again',78,-10,-255,'#fb7185','∞','social-orbit-dimmed'],
  ['threshold-rebirth-sequence','rebirth','Threshold Became Rebirth','The doorway became a new shape',104,48,-320,'#fbbf24','✺','doorway-season'],
  ['purpose-thread-visible','insight','Purpose Thread Became Visible','A quiet line ran through scattered days',-12,86,-330,'#bae6fd','⌁','memory-became-thread'],
  ['grief-season-protected','shadow','A Protected Grief Season','The map dimmed to protect the center',-116,8,-340,'#7f1d1d','◒','week-heavy-fog'],
  ['ritual-of-water','ritual','The Water Ritual Helped','A small action changed the sky tone',20,-62,-288,'#38bdf8','≋','energy-came-back-slowly'],
  ['morning-light-returned','emotionalShift','Morning Light Returned','The horizon rose by a little',8,42,-360,'#fde68a','☼','small-morning-win'],
  ['council-whisper-north','mirrorMoment','Council Whisper North','A guide light appeared near the threshold',70,92,-380,'#e0f2fe','✦','doorway-season'],
  ['legacy-thread-faint','legacy','A Faint Legacy Thread','A future story echoed backward',-92,96,-405,'#d8b4fe','◇','purpose-thread-visible'],
  ['chapter-of-repair','chapter','Chapter of Repair','Several small returns became one chapter',-22,-88,-390,'#bef264','▱','energy-came-back-slowly'],
  ['season-pressure','chapter','A Season of Pressure','Fog, loop, silence, and protection formed a season',-138,-18,-430,'#a855f7','◓','grief-season-protected'],
  ['social-warmth-returning','socialPattern','Social Warmth Returning','The orbit brightened without forcing closeness',94,18,-420,'#fda4af','○','paired-glow-repair'],
  ['hidden-pattern-lit','insight','A Hidden Pattern Lit Up','The map showed a shape before the mind did',-40,112,-456,'#67e8f9','✷','purpose-thread-visible'],
  ['dream-became-memory','dream','A Dream Became Memory','The violet image connected to an older room',-76,58,-486,'#818cf8','☾','dream-door-opened'],
  ['root-system-glowed','recovery','The Root System Glowed','Ground signals became steady again',12,-106,-470,'#84cc16','⌁','chapter-of-repair'],
  ['conflict-particles-settled','relationship','Conflict Particles Settled','Tension lost its sharp edge',122,-42,-488,'#fb7185','◌','social-warmth-returning'],
  ['mirror-pattern-softened','mirrorMoment','The Pattern Softened','The mirror showed movement, not blame',38,112,-520,'#e9d5ff','◇','hidden-pattern-lit'],
  ['the-small-clear-signal','insight','The Small Clear Signal','A single clean cue rose out of the noise',-6,128,-548,'#cffafe','✧','mirror-pattern-softened'],
  ['sprout-root-glow','recovery','Sprout and Root Glow','Recovery appeared both above and below',24,-132,-536,'#bef264','✺','root-system-glowed'],
  ['night-sky-reset','ritual','Night Sky Reset','A quiet ritual opened the portal again',58,70,-570,'#c4b5fd','✦','ritual-of-water'],
  ['chapter-becoming','chapter','Chapter of Becoming','The scattered stars began to read as one life arc',0,0,-640,'#f8fafc','◎','mirror-pattern-softened'],
].map(([id, type, title, subtitle, x, y, z, color, glyph, related], index) => node({
  id: id as string,
  type: type as LifeMapNode['type'],
  title: title as string,
  subtitle: subtitle as string,
  timestamp: `2026-03-${String(10 + (index % 18)).padStart(2, '0')}T12:00:00.000Z`,
  emotionalTone: type === 'shadow' ? 'shadow' : type === 'recovery' ? 'recovery' : type === 'relationship' || type === 'socialPattern' ? 'relationship' : type === 'dream' ? 'dream' : 'calm',
  emotionalIntensity: 0.45 + ((index % 7) * 0.07),
  importance: 0.58 + ((index % 6) * 0.06),
  unresolvedness: type === 'shadow' ? 0.68 : type === 'threshold' ? 0.48 : 0.2 + ((index % 4) * 0.08),
  position: { x: x as number, y: y as number, z: z as number },
  color: color as string,
  auraColor: color as string,
  size: 0.9 + ((index % 5) * 0.08),
  pulseSpeed: 0.46 + ((index % 6) * 0.08),
  glyph: glyph as string,
  relatedNodeIds: [related as string],
  narratorLine: `${title} became visible as a symbolic signal, not a diagnosis.`,
  whyThis: 'This star is included because multiple abstracted signals clustered into a safe symbolic life-map pattern.',
  privacyLevel: 'publicSafe',
  sourceSignals: ['symbolic-correlation', 'demo-signal'],
  chapterId: index > 18 ? 'chapter-becoming' : index > 8 ? 'chapter-insight' : 'chapter-repair',
  seasonId: index > 15 ? 'season-threshold' : index > 7 ? 'season-green-return' : 'season-rose-orbit',
}));

export const lifeMapNodes: LifeMapNode[] = [...lifeMapDemoNodes, ...moreNodes];

export const lifeMapEdges: LifeMapEdge[] = [
  edge({ id: 'edge-recovery-1', type: 'recoveryPath', fromNodeId: 'quiet-reset', toNodeId: 'first-signal-recovery', title: 'Quiet reset opened recovery', color: '#a3e635', strength: 0.82, narratorLine: 'Recovery began as a small quiet return.', privacyLevel: 'publicSafe' }),
  edge({ id: 'edge-recovery-2', type: 'recoveryPath', fromNodeId: 'first-signal-recovery', toNodeId: 'energy-came-back-slowly', title: 'Energy returned slowly', color: '#84cc16', strength: 0.78, narratorLine: 'The recovery path brightened near the ground.', privacyLevel: 'publicSafe' }),
  edge({ id: 'edge-relationship-1', type: 'relationshipArc', fromNodeId: 'conversation-that-stayed', toNodeId: 'social-orbit-dimmed', title: 'Conversation became distance', color: '#fb7185', strength: 0.66, narratorLine: 'The social orbit dimmed without disappearing.', privacyLevel: 'privateSummary' }),
  edge({ id: 'edge-relationship-2', type: 'relationshipArc', fromNodeId: 'social-orbit-dimmed', toNodeId: 'paired-glow-repair', title: 'Distance made room for repair', color: '#fda4af', strength: 0.61, narratorLine: 'Repair appeared as paired light.', privacyLevel: 'privateSummary' }),
  edge({ id: 'edge-shadow-1', type: 'shadowSeason', fromNodeId: 'week-heavy-fog', toNodeId: 'pattern-returned-again', title: 'Fog revealed the loop', color: '#a855f7', strength: 0.74, narratorLine: 'The shadow season made the loop easier to see.', privacyLevel: 'privateSummary' }),
  edge({ id: 'edge-purpose-1', type: 'purposeThread', fromNodeId: 'memory-became-thread', toNodeId: 'purpose-thread-visible', title: 'Memory became purpose thread', color: '#67e8f9', strength: 0.73, narratorLine: 'A scattered memory became direction.', privacyLevel: 'publicSafe' }),
  edge({ id: 'edge-habit-1', type: 'habitLoop', fromNodeId: 'pattern-returned-again', toNodeId: 'habit-loop-softened', title: 'Habit loop softened', color: '#bef264', strength: 0.67, narratorLine: 'The loop did not vanish; it softened.', privacyLevel: 'privateSummary' }),
  edge({ id: 'edge-dream-1', type: 'dreamToMemory', fromNodeId: 'dream-door-opened', toNodeId: 'dream-became-memory', title: 'Dream connected to memory', color: '#818cf8', strength: 0.7, narratorLine: 'The dream image attached to an older room.', privacyLevel: 'publicSafe' }),
  edge({ id: 'edge-threshold-1', type: 'thresholdToRebirth', fromNodeId: 'doorway-season', toNodeId: 'threshold-rebirth-sequence', title: 'Threshold became rebirth', color: '#fbbf24', strength: 0.86, narratorLine: 'The doorway became a shape of becoming.', privacyLevel: 'publicSafe' }),
  edge({ id: 'edge-mirror-1', type: 'chapterLine', fromNodeId: 'hidden-pattern-lit', toNodeId: 'mirror-pattern-softened', title: 'Pattern softened in the mirror', color: '#e9d5ff', strength: 0.75, narratorLine: 'The mirror showed movement rather than blame.', privacyLevel: 'publicSafe' }),
];

export const lifeMapChapters: LifeMapChapter[] = [
  { id: 'chapter-repair', title: 'Chapter of Repair', subtitle: 'Small returns became trustworthy', startAt: '2026-01-04T00:00:00.000Z', dominantTone: 'recovery', nodeIds: ['quiet-reset', 'first-signal-recovery', 'small-morning-win', 'energy-came-back-slowly'], narratorLine: 'Repair arrived through small steady signals.' },
  { id: 'chapter-shadow', title: 'Chapter of Protected Fog', subtitle: 'The system conserved energy', startAt: '2026-01-12T00:00:00.000Z', dominantTone: 'shadow', nodeIds: ['week-heavy-fog', 'pattern-returned-again', 'grief-season-protected'], narratorLine: 'The fog protected the center while the pattern became visible.' },
  { id: 'chapter-relationship', title: 'Chapter of Social Orbit', subtitle: 'Distance and warmth both became visible', startAt: '2026-01-23T00:00:00.000Z', dominantTone: 'relationship', nodeIds: ['conversation-that-stayed', 'social-orbit-dimmed', 'paired-glow-repair'], narratorLine: 'Social warmth moved in arcs, not straight lines.' },
  { id: 'chapter-threshold', title: 'Chapter of Doorways', subtitle: 'The old shape loosened', startAt: '2026-02-14T00:00:00.000Z', dominantTone: 'threshold', nodeIds: ['doorway-season', 'threshold-rebirth-sequence'], narratorLine: 'The threshold did not force you; it opened.' },
  { id: 'chapter-insight', title: 'Chapter of Becoming', subtitle: 'The map began to read itself', startAt: '2026-03-08T00:00:00.000Z', dominantTone: 'insight', nodeIds: ['memory-became-thread', 'purpose-thread-visible', 'hidden-pattern-lit', 'mirror-pattern-softened'], narratorLine: 'The scattered stars began to form a pattern.' },
];

export const lifeMapSeasons: LifeMapSeason[] = [
  { id: 'season-winter-repair', title: 'Winter Repair Field', tone: 'winter', color: '#93c5fd', startAt: '2026-01-01T00:00:00.000Z', nodeIds: ['quiet-reset', 'week-heavy-fog', 'first-signal-recovery', 'small-morning-win'], nebulaPosition: { x: -30, y: 4, z: -68 } },
  { id: 'season-rose-orbit', title: 'Rose Social Orbit', tone: 'spring', color: '#fb7185', startAt: '2026-01-23T00:00:00.000Z', nodeIds: ['conversation-that-stayed', 'social-orbit-dimmed', 'paired-glow-repair'], nebulaPosition: { x: 68, y: -2, z: -160 } },
  { id: 'season-shadow-fog', title: 'Protected Shadow Fog', tone: 'autumn', color: '#7c3a72', startAt: '2026-02-01T00:00:00.000Z', nodeIds: ['pattern-returned-again', 'grief-season-protected'], nebulaPosition: { x: -94, y: 0, z: -250 } },
  { id: 'season-green-return', title: 'Green Return Field', tone: 'spring', color: '#84cc16', startAt: '2026-03-01T00:00:00.000Z', nodeIds: ['energy-came-back-slowly', 'root-system-glowed', 'sprout-root-glow'], nebulaPosition: { x: 18, y: -74, z: -380 } },
  { id: 'season-threshold', title: 'Threshold Aurora', tone: 'threshold', color: '#fbbf24', startAt: '2026-02-14T00:00:00.000Z', nodeIds: ['doorway-season', 'threshold-rebirth-sequence', 'council-whisper-north'], nebulaPosition: { x: 82, y: 54, z: -340 } },
];

export const narratorInsights: NarratorInsight[] = [
  { id: 'insight-recovery-small', nodeId: 'first-signal-recovery', line: 'The first recovery signal was small because it was honest.', tone: 'warm', createdAt: now },
  { id: 'insight-shadow-protective', nodeId: 'week-heavy-fog', line: 'The fog protected energy before the map could explain it.', tone: 'protective', createdAt: now },
  { id: 'insight-mirror-softened', nodeId: 'mirror-pattern-softened', line: 'This pattern is not proof of failure. It is proof of movement.', tone: 'gentle', createdAt: now },
];

export const replayPaths: ReplayPath[] = [
  {
    id: 'replay-recovery-thread',
    title: 'Recovery Thread',
    nodeIds: ['quiet-reset', 'first-signal-recovery', 'energy-came-back-slowly', 'root-system-glowed', 'sprout-root-glow'],
    edgeIds: ['edge-recovery-1', 'edge-recovery-2'],
    points: ['quiet-reset', 'first-signal-recovery', 'energy-came-back-slowly', 'root-system-glowed', 'sprout-root-glow'].map((id) => lifeMapNodes.find((n) => n.id === id)?.position ?? { x: 0, y: 0, z: 0 }),
    captionLines: ['The quiet reset appeared first.', 'Recovery brightened near the ground.', 'Energy returned slowly.', 'The root system glowed.'],
    durationMs: 9000,
    privacyLevel: 'publicSafe',
  },
];

export const mirrorStates: MirrorOfBecomingState[] = [
  { id: 'mirror-becoming-1', activeNodeId: 'mirror-pattern-softened', activeReplayPathId: 'replay-recovery-thread', patternTitle: 'The Pattern Softened', symbolicGlyph: '◇⌁✦', insight: 'You are not repeating the old shape exactly. The return has more softness than before.', safeLanguage: true, createdAt: now },
];

export const defaultSpatialPreferences: UserSpatialPreferences = {
  motionMode: 'full',
  highContrast: false,
  hiddenNodeTypes: [],
  showNarratorCaptions: true,
  showWhyThis: true,
  allowHaptics: false,
  defaultPrivacyLevel: 'privateSummary',
};
