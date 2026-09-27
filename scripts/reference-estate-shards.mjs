export function referenceEstateShard(states, indexValue = '0', countValue = '1') {
  const index = Number(indexValue), count = Number(countValue)
  if (!Number.isInteger(count) || count < 1 || count > 16 || !Number.isInteger(index) || index < 0 || index >= count) {
    throw new Error('Invalid reference estate shard; require 0 <= index < count <= 16')
  }
  const ids = states.map(state => state.id)
  if (new Set(ids).size !== ids.length) throw new Error('Duplicate reference capture IDs')
  const selected = states.filter((_, offset) => offset % count === index)
  if (!selected.length) throw new Error('Reference estate shard has no cases')
  return { selected, plan: { index, count, totalPlanned: states.length, plannedIds: selected.map(state => state.id), allPlannedIds: ids } }
}
