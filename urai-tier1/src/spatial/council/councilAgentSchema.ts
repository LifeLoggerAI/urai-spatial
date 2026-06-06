export type CouncilAgentRole = 'guardian' | 'mirror' | 'cartographer' | 'archivist' | 'guide'

export type CouncilAgent = {
  id: string
  name: string
  role: CouncilAgentRole
  focus: string
  tone: 'quiet' | 'clear' | 'warm' | 'protective'
  canExplainPlaces: boolean
  canExplainExports: boolean
  canSuggestNextSteps: boolean
}

export const DEMO_COUNCIL_AGENTS: CouncilAgent[] = [
  {
    id: 'council-cartographer',
    name: 'The Cartographer',
    role: 'cartographer',
    focus: 'Maps memory places, routes, and life geography.',
    tone: 'clear',
    canExplainPlaces: true,
    canExplainExports: false,
    canSuggestNextSteps: true,
  },
  {
    id: 'council-archivist',
    name: 'The Archivist',
    role: 'archivist',
    focus: 'Keeps chapters, replays, and legacy continuity organized.',
    tone: 'quiet',
    canExplainPlaces: true,
    canExplainExports: true,
    canSuggestNextSteps: false,
  },
  {
    id: 'council-guardian',
    name: 'The Guardian',
    role: 'guardian',
    focus: 'Protects permissions, gates, and export safety.',
    tone: 'protective',
    canExplainPlaces: true,
    canExplainExports: true,
    canSuggestNextSteps: true,
  },
]
