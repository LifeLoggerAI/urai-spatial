export type DemoMemoryStar = {
  id: string
  title: string
  dateLabel: string
  emotionalTone: string
  archetype: string
  summary: string
  color: string
  x: number
  y: number
  size: number
  intensity: number
  chapter: string
  relatedIds: string[]
}

export type DemoReplayScene = {
  id: string
  title: string
  timestamp: string
  mood: string
  narratorLine: string
  aura: string
}

export const demoMemoryStars: DemoMemoryStar[] = [
  { id: 'grief-softened-companion', title: 'Grief-Softened Companion', dateLabel: 'Winter marker', emotionalTone: 'Tender weight', archetype: 'Companion', summary: 'A quiet signal carried weight, so URAI rendered it softly instead of forcing brightness.', color: '#7dd3fc', x: 18, y: 38, size: 12, intensity: 0.78, chapter: 'Softening', relatedIds: ['quiet-recovery-marker', 'council-awakening'] },
  { id: 'first-signal-bloom', title: 'First Signal Bloom', dateLabel: 'Day 1', emotionalTone: 'New clarity', archetype: 'Bloom', summary: 'The first visible pattern opened as a small star in the home field.', color: '#86efac', x: 34, y: 24, size: 11, intensity: 0.7, chapter: 'Opening', relatedIds: ['living-map-opens'] },
  { id: 'quiet-recovery-marker', title: 'Quiet Recovery Marker', dateLabel: 'Recovery week', emotionalTone: 'Stable return', archetype: 'Healer', summary: 'A low-noise day became a recovery bloom rather than an empty gap.', color: '#c4b5fd', x: 48, y: 45, size: 10, intensity: 0.66, chapter: 'Recovery', relatedIds: ['ground-return', 'grief-softened-companion'] },
  { id: 'threshold-field', title: 'Threshold Field', dateLabel: 'Transition', emotionalTone: 'Charged pause', archetype: 'Gate', summary: 'The field recognized a before-and-after moment and held it as a threshold.', color: '#f0abfc', x: 63, y: 30, size: 13, intensity: 0.84, chapter: 'Threshold', relatedIds: ['rebirth-spark'] },
  { id: 'council-awakening', title: 'Council Awakening', dateLabel: 'Companion online', emotionalTone: 'Attuned', archetype: 'Council', summary: 'The orb and Council began organizing signals into careful, private reflections.', color: '#67e8f9', x: 74, y: 48, size: 12, intensity: 0.88, chapter: 'Council', relatedIds: ['inner-voice-mirror'] },
  { id: 'memory-weather-shift', title: 'Memory Weather Shift', dateLabel: 'Mood front', emotionalTone: 'Changing sky', archetype: 'Weather', summary: 'Mood weather shifted from static darkness into a readable emotional forecast.', color: '#fde68a', x: 56, y: 62, size: 10, intensity: 0.62, chapter: 'Weather', relatedIds: ['dream-residue'] },
  { id: 'social-echo', title: 'Social Echo', dateLabel: 'Relationship trace', emotionalTone: 'Resonant', archetype: 'Echo', summary: 'A relational pattern left a soft echo in the constellation rather than a harsh alert.', color: '#f9a8d4', x: 29, y: 67, size: 9, intensity: 0.58, chapter: 'Relationships', relatedIds: ['shadow-tension'] },
  { id: 'dream-residue', title: 'Dream Residue', dateLabel: 'Night signal', emotionalTone: 'Symbolic fog', archetype: 'Dreamer', summary: 'Nighttime patterns gathered into a faint blue fog memory.', color: '#93c5fd', x: 83, y: 68, size: 10, intensity: 0.64, chapter: 'Dreams', relatedIds: ['memory-weather-shift'] },
  { id: 'purpose-thread', title: 'Purpose Thread', dateLabel: 'Signal braid', emotionalTone: 'Directed', archetype: 'Thread', summary: 'Repeated signals began forming a visible direction of becoming.', color: '#a7f3d0', x: 42, y: 77, size: 11, intensity: 0.76, chapter: 'Purpose', relatedIds: ['legacy-thread'] },
  { id: 'inner-voice-mirror', title: 'Inner Voice Mirror', dateLabel: 'Reflection', emotionalTone: 'Recognized', archetype: 'Mirror', summary: 'The narrator learned to reflect patterns without taking over the user’s voice.', color: '#ddd6fe', x: 69, y: 76, size: 12, intensity: 0.82, chapter: 'Voice', relatedIds: ['council-awakening'] },
  { id: 'ground-return', title: 'Ground Return', dateLabel: 'Body field', emotionalTone: 'Settling', archetype: 'Ground', summary: 'The system represented safety as a return to the ground layer.', color: '#bbf7d0', x: 17, y: 80, size: 9, intensity: 0.6, chapter: 'Recovery', relatedIds: ['quiet-recovery-marker'] },
  { id: 'shadow-tension', title: 'Shadow Tension', dateLabel: 'Hidden load', emotionalTone: 'Compressed', archetype: 'Shadow', summary: 'Subtle friction and strain became a private shadow marker, not a public label.', color: '#c084fc', x: 21, y: 54, size: 10, intensity: 0.72, chapter: 'Shadow', relatedIds: ['social-echo'] },
  { id: 'rebirth-spark', title: 'Rebirth Spark', dateLabel: 'After threshold', emotionalTone: 'Ignition', archetype: 'Phoenix', summary: 'After the threshold, one small spark showed the system where recovery began.', color: '#fb7185', x: 78, y: 22, size: 12, intensity: 0.86, chapter: 'Rebirth', relatedIds: ['threshold-field'] },
  { id: 'legacy-thread', title: 'Legacy Thread', dateLabel: 'Long arc', emotionalTone: 'Continuity', archetype: 'Legacy', summary: 'A longer story line connected memory stars into a shareable life chapter.', color: '#fef3c7', x: 52, y: 18, size: 9, intensity: 0.65, chapter: 'Legacy', relatedIds: ['purpose-thread'] },
  { id: 'living-map-opens', title: 'Living Map Opens', dateLabel: 'Now', emotionalTone: 'Awake', archetype: 'Map', summary: 'The public seeded field opened into the first visible URAI life map.', color: '#67e8f9', x: 88, y: 42, size: 14, intensity: 0.94, chapter: 'Opening', relatedIds: ['first-signal-bloom'] }
]

export const demoReplayScenes: DemoReplayScene[] = [
  { id: 'quiet', title: 'The field goes quiet', timestamp: '00:00', mood: 'Stillness', narratorLine: 'Your field is quiet. Nothing is missing. The silence is part of the map.', aura: 'Deep blue hush' },
  { id: 'signal', title: 'A signal returns', timestamp: '00:02', mood: 'Recognition', narratorLine: 'A small pattern returns and the sky begins to hold its shape.', aura: 'Cyan pulse' },
  { id: 'rhythm', title: 'The orb notices a rhythm', timestamp: '00:04', mood: 'Attunement', narratorLine: 'The Council notices repetition without judgment.', aura: 'Violet orbit' },
  { id: 'bloom', title: 'A recovery bloom opens', timestamp: '00:06', mood: 'Repair', narratorLine: 'Recovery appears as a bloom, not a performance score.', aura: 'Green-gold bloom' },
  { id: 'map', title: 'The map becomes visible', timestamp: '00:08', mood: 'Integration', narratorLine: 'The stars connect. A living map begins to emerge.', aura: 'Full constellation' }
]

export const demoCouncilMembers = ['Signal Mapper', 'Memory Weaver', 'Privacy Guardian', 'Recovery Narrator']

export const demoPrivacyPrinciples = [
  'Private by default',
  'Exportable data',
  'Delete controls',
  'Opt-in public demo',
  'No ads inside URAI',
  'User-owned data philosophy'
]

export const demoPassportStatus = {
  title: 'URAI Passport',
  description: 'Your future permission layer for private memory, public sharing, and user-controlled data access.',
  status: 'Foundation active'
}
