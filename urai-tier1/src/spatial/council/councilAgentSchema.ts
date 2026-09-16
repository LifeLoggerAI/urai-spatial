import type { EvidenceSupport } from '@/lib/truth/truthTypes'

export type CouncilAgentRole = 'guardian' | 'mirror' | 'cartographer' | 'archivist' | 'guide' | 'builder' | 'trickster'
export type CouncilAgent = { id: string; name: string; role: CouncilAgentRole; focus: string; tone: 'quiet' | 'clear' | 'warm' | 'protective'; canExplainPlaces: boolean; canExplainExports: boolean; canSuggestNextSteps: boolean }
export type CouncilScenarioRole = Exclude<CouncilAgentRole, 'guide'>
export type ScenarioEvidenceBundle = { scenarioId: string; branchId: string; evidenceRefIds: readonly string[]; permissionReceiptIds: readonly string[] }
export type CouncilScenarioPerspective = { role: CouncilScenarioRole; viewpoint: string; evidenceRefIds: readonly string[]; support: EvidenceSupport; uncertaintyIds: readonly string[]; assumptionsQuestioned: readonly string[]; alternativeExplanations: readonly string[]; consensusClaimed: false; authorityClaimed: false }

export function validateCouncilScenarioPerspective(perspective: CouncilScenarioPerspective, bundle: ScenarioEvidenceBundle) {
  const allowed = new Set(bundle.evidenceRefIds)
  const errors: string[] = []
  for (const evidenceId of perspective.evidenceRefIds) if (!allowed.has(evidenceId)) errors.push(`COUNCIL_EVIDENCE_OUTSIDE_BUNDLE:${evidenceId}`)
  if (perspective.consensusClaimed !== false) errors.push('COUNCIL_CONSENSUS_FABRICATION_FORBIDDEN')
  if (perspective.authorityClaimed !== false) errors.push('COUNCIL_AUTHORITY_THEATER_FORBIDDEN')
  return errors
}

export const DEMO_COUNCIL_AGENTS: CouncilAgent[] = [
  { id:'council-cartographer', name:'The Cartographer', role:'cartographer', focus:'Maps memory places, routes, and life geography.', tone:'clear', canExplainPlaces:true, canExplainExports:false, canSuggestNextSteps:true },
  { id:'council-archivist', name:'The Archivist', role:'archivist', focus:'Keeps chapters, replays, and legacy continuity organized.', tone:'quiet', canExplainPlaces:true, canExplainExports:true, canSuggestNextSteps:false },
  { id:'council-guardian', name:'The Guardian', role:'guardian', focus:'Protects permissions, gates, and export safety.', tone:'protective', canExplainPlaces:true, canExplainExports:true, canSuggestNextSteps:true },
  { id:'council-builder', name:'The Builder', role:'builder', focus:'Turns insight into structures, systems, and practical next actions.', tone:'clear', canExplainPlaces:true, canExplainExports:false, canSuggestNextSteps:true },
  { id:'council-mirror', name:'The Mirror', role:'mirror', focus:'Reflects emotional patterns and contradictions without forcing an answer.', tone:'warm', canExplainPlaces:true, canExplainExports:false, canSuggestNextSteps:true },
  { id:'council-trickster', name:'The Trickster', role:'trickster', focus:'Breaks rigid patterns with reframing, humor, and useful surprise.', tone:'warm', canExplainPlaces:false, canExplainExports:false, canSuggestNextSteps:true },
]
