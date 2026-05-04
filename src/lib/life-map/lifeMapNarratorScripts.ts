import { LifeMapNode } from './lifeMapTypes'

export const narratorFallbackByType: Partial<Record<LifeMapNode['nodeType'], string>> = {
  memory: 'This was not just a memory. It became a turning point.',
  recovery: 'This was the beginning of a recovery bloom.',
  relationship: 'This relationship changed shape here.',
  dream: 'You were becoming someone new before you had language for it.',
  shadow: 'This cluster carries grief, but also evidence of survival.',
  insight: 'This is one of your hidden growth arcs.'
}

export function buildNarratorLine(node: LifeMapNode) {
  return node.narratorLine || narratorFallbackByType[node.nodeType] || `Notice how this pattern returned across ${node.season ?? 'many'} seasons.`
}
