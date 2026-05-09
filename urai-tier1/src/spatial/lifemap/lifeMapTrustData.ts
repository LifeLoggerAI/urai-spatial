export type LifeMapNodeKind = 'now' | 'memory' | 'ritual' | 'pattern' | 'void'
export type LifeMapConfidence = 'light' | 'emerging' | 'strong'

export type LifeMapNode = {
  id: string
  kind: LifeMapNodeKind
  title: string
  subtitle: string
  dateLabel: string
  seasonLabel?: string
  confidence: LifeMapConfidence
  position: [number, number, number]
  relatedNodeIds: string[]
  whyThisAppeared: string[]
  connectsTo?: string[]
  replayReady?: boolean
  privateToUser: boolean
  actions: { canRename: boolean; canHide: boolean; canCorrect: boolean; canUnlink: boolean }
}

const actions = { canRename: true, canHide: true, canCorrect: true, canUnlink: true }

export const LIFE_MAP_TRUST_NODES: LifeMapNode[] = [
  { id: 'now-anchor', kind: 'now', title: 'Now', subtitle: 'Your current point in the map.', dateLabel: 'Today', seasonLabel: 'Current season', confidence: 'strong', position: [50, 46, 10], relatedNodeIds: ['mirror-focus', 'morning-ritual', 'quiet-gap'], whyThisAppeared: ['Based on the most recent saved reflections.', 'Several nearby memories connect to return, focus, and ritual.'], connectsTo: ['Mirror Focus', 'Morning Ritual', 'Quiet Gap'], privateToUser: true, actions },
  { id: 'mirror-focus', kind: 'memory', title: 'Mirror Focus', subtitle: 'A moment where you returned to the same question with more clarity.', dateLabel: 'Apr 18', seasonLabel: 'Spring reflection', confidence: 'emerging', position: [66, 44, 14], relatedNodeIds: ['now-anchor', 'identity-pattern', 'return-walk'], whyThisAppeared: ['This may connect to repeated reflection notes about identity and direction.', 'Nearby memories use similar language around focus, return, and self-trust.'], connectsTo: ['Self-Reflection Thread', 'Return Walk'], replayReady: true, privateToUser: true, actions },
  { id: 'morning-ritual', kind: 'ritual', title: 'Morning Ritual', subtitle: 'A repeated practice that appears near calmer entries.', dateLabel: 'This week', seasonLabel: 'Daily rhythm', confidence: 'strong', position: [77, 27, 16], relatedNodeIds: ['now-anchor', 'return-walk', 'steady-light'], whyThisAppeared: ['Based on saved reflections that mention the same recurring practice.', 'This pattern appears near entries marked by steadier tone and clearer next steps.'], connectsTo: ['Return Walk', 'Steady Light'], replayReady: true, privateToUser: true, actions },
  { id: 'identity-pattern', kind: 'pattern', title: 'Self-Reflection Thread', subtitle: 'Several memories may be circling the same personal question.', dateLabel: 'Last 30 days', seasonLabel: 'Emerging pattern', confidence: 'emerging', position: [42, 30, 9], relatedNodeIds: ['mirror-focus', 'threshold-note', 'now-anchor'], whyThisAppeared: ['This pattern is still emerging from a few related reflection notes.', 'The connection is based on repeated themes, not a diagnosis or fixed conclusion.'], connectsTo: ['Mirror Focus', 'Threshold Note'], privateToUser: true, actions },
  { id: 'quiet-gap', kind: 'void', title: 'Quiet Gap', subtitle: 'A quieter stretch where the map has fewer saved signals.', dateLabel: 'Early April', seasonLabel: 'Unfilled space', confidence: 'light', position: [34, 57, 5], relatedNodeIds: ['now-anchor', 'threshold-note'], whyThisAppeared: ['There are fewer saved reflections in this period.', 'This is shown as a gap, not as a problem or interpretation.'], connectsTo: ['Threshold Note'], privateToUser: true, actions },
  { id: 'threshold-note', kind: 'memory', title: 'Threshold Note', subtitle: 'A saved moment that appears near a change in direction.', dateLabel: 'Mar 29', seasonLabel: 'Crossing point', confidence: 'emerging', position: [53, 68, 11], relatedNodeIds: ['quiet-gap', 'identity-pattern', 'small-return'], whyThisAppeared: ['This memory sits between a quiet period and a more active reflection thread.', 'The connection is based on timing and repeated words around crossing and return.'], connectsTo: ['Quiet Gap', 'Self-Reflection Thread'], replayReady: true, privateToUser: true, actions },
  { id: 'return-walk', kind: 'memory', title: 'Return Walk', subtitle: 'A grounding memory that appears connected to ritual and focus.', dateLabel: 'Apr 22', seasonLabel: 'Recent return', confidence: 'strong', position: [57, 31, 14], relatedNodeIds: ['mirror-focus', 'morning-ritual', 'steady-light'], whyThisAppeared: ['Based on a saved reflection with language around grounding and return.', 'This memory appears near the current ritual thread.'], connectsTo: ['Morning Ritual', 'Mirror Focus'], replayReady: true, privateToUser: true, actions },
  { id: 'steady-light', kind: 'ritual', title: 'Steady Light', subtitle: 'A stabilizing routine that may support the current season.', dateLabel: 'This month', seasonLabel: 'Supportive rhythm', confidence: 'emerging', position: [83, 57, 12], relatedNodeIds: ['morning-ritual', 'return-walk'], whyThisAppeared: ['Several reflections mention small repeated supports.', 'This ritual is shown as supportive, not prescriptive.'], connectsTo: ['Morning Ritual', 'Return Walk'], privateToUser: true, actions },
  { id: 'small-return', kind: 'memory', title: 'Small Return', subtitle: 'A recent re-entry into a familiar thread.', dateLabel: 'Apr 25', seasonLabel: 'Re-entry', confidence: 'light', position: [69, 72, 10], relatedNodeIds: ['threshold-note', 'future-signal'], whyThisAppeared: ['This may connect to an older thread that recently became relevant again.', 'The connection is light and can be corrected if it feels wrong.'], connectsTo: ['Threshold Note', 'Future Signal'], replayReady: true, privateToUser: true, actions },
  { id: 'future-signal', kind: 'pattern', title: 'Future Signal', subtitle: 'A possible next thread, based on nearby memories.', dateLabel: 'Looking ahead', seasonLabel: 'Light forecast', confidence: 'light', position: [74, 64, 8], relatedNodeIds: ['small-return', 'steady-light'], whyThisAppeared: ['This is a light reflective forecast from nearby entries.', 'It is not a prediction. You can hide or correct it anytime.'], connectsTo: ['Small Return', 'Steady Light'], privateToUser: true, actions },
  { id: 'dream-field', kind: 'memory', title: 'Dream Field', subtitle: 'A symbolic memory that may not need a fixed meaning.', dateLabel: 'Mar 11', seasonLabel: 'Night memory', confidence: 'light', position: [24, 31, 6], relatedNodeIds: ['quiet-gap', 'identity-pattern'], whyThisAppeared: ['This memory shares symbolic language with the reflection thread.', 'The connection is intentionally light and user-correctable.'], connectsTo: ['Quiet Gap', 'Self-Reflection Thread'], replayReady: true, privateToUser: true, actions },
  { id: 'ritual-echo', kind: 'ritual', title: 'Ritual Echo', subtitle: 'A repeated signal from an older practice.', dateLabel: 'Earlier season', seasonLabel: 'Older rhythm', confidence: 'emerging', position: [22, 68, 8], relatedNodeIds: ['quiet-gap', 'threshold-note'], whyThisAppeared: ['This may connect to an older ritual that appears near newer reflections.', 'You can unlink it if the connection feels inaccurate.'], connectsTo: ['Quiet Gap', 'Threshold Note'], privateToUser: true, actions },
]

export const CONFIDENCE_LABEL: Record<LifeMapConfidence, string> = { light: 'Light signal', emerging: 'Emerging pattern', strong: 'Strong pattern' }
