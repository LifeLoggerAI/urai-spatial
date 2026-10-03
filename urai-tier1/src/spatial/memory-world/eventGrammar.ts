export const MEMORY_WORLD_EVENT_GRAMMAR_VERSION = 'urai-memory-world-event-grammar-1' as const

export type MemoryWorldEventPrimitive =
  | 'enter'
  | 'leave'
  | 'walk'
  | 'sit'
  | 'stand'
  | 'hug'
  | 'wave'
  | 'speak'
  | 'listen'
  | 'cook'
  | 'eat'
  | 'read'
  | 'watch'
  | 'drive'
  | 'play'
  | 'dance'
  | 'sing'
  | 'pray'
  | 'celebrate'
  | 'open-gift'
  | 'light-candles'
  | 'blow-candles'
  | 'work'
  | 'teach'
  | 'wait'
  | 'travel'
  | 'care-for'
  | 'pet-animal'

export type MemoryWorldCompositeEvent = {
  id: string
  label: string
  primitives: readonly MemoryWorldEventPrimitive[]
  requiresExplicitContext: boolean
  culturalParametersRequired: boolean
}

export const MEMORY_WORLD_EVENT_PRIMITIVES: readonly MemoryWorldEventPrimitive[] = [
  'enter','leave','walk','sit','stand','hug','wave','speak','listen','cook','eat','read','watch','drive',
  'play','dance','sing','pray','celebrate','open-gift','light-candles','blow-candles','work','teach','wait',
  'travel','care-for','pet-animal',
]

export const MEMORY_WORLD_COMPOSITE_EVENTS: readonly MemoryWorldCompositeEvent[] = [
  { id:'event:birthday-gathering', label:'Birthday gathering', primitives:['enter','speak','eat','celebrate','light-candles','blow-candles','open-gift'], requiresExplicitContext:true, culturalParametersRequired:true },
  { id:'event:family-meal', label:'Family meal', primitives:['enter','cook','sit','speak','listen','eat','leave'], requiresExplicitContext:true, culturalParametersRequired:false },
  { id:'event:school-day', label:'School day', primitives:['enter','walk','sit','listen','teach','read','leave'], requiresExplicitContext:true, culturalParametersRequired:false },
  { id:'event:commute', label:'Commute', primitives:['enter','sit','travel','leave'], requiresExplicitContext:true, culturalParametersRequired:false },
  { id:'event:caregiving', label:'Caregiving', primitives:['enter','speak','listen','care-for','sit','leave'], requiresExplicitContext:true, culturalParametersRequired:false },
  { id:'event:celebration-generic', label:'Celebration', primitives:['enter','speak','listen','eat','dance','sing','celebrate','leave'], requiresExplicitContext:true, culturalParametersRequired:true },
  { id:'event:prayer-gathering', label:'Prayer gathering', primitives:['enter','sit','stand','listen','pray','leave'], requiresExplicitContext:true, culturalParametersRequired:true },
]

export function validateCompositeEvent(event: MemoryWorldCompositeEvent) {
  const allowed = new Set(MEMORY_WORLD_EVENT_PRIMITIVES)
  const errors: string[] = []
  if (!event.id) errors.push('EVENT_ID_REQUIRED')
  if (!event.label) errors.push('EVENT_LABEL_REQUIRED')
  if (!event.primitives.length) errors.push('EVENT_PRIMITIVES_REQUIRED')
  for (const primitive of event.primitives) if (!allowed.has(primitive)) errors.push(`UNKNOWN_EVENT_PRIMITIVE:${primitive}`)
  if (event.culturalParametersRequired && !event.requiresExplicitContext) errors.push('CULTURAL_EVENT_REQUIRES_EXPLICIT_CONTEXT')
  return errors
}
