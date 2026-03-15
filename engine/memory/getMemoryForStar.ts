import { memoryNodes } from "./memoryNodes"

export type MemoryNode = {
  id: number
  year: number
  title?: string
  description?: string
}

export type LifeStar = {
  id: number
  year: number
  position: [number, number, number]
}

/*
  Build lookup index once at module load
  Using a Map avoids prototype collisions and improves lookup safety
*/
const memoryIndex = new Map<number, MemoryNode[]>()

for (const node of memoryNodes) {

  const existing = memoryIndex.get(node.year)

  if (existing) {
    existing.push(node)
  } else {
    memoryIndex.set(node.year, [node])
  }

}

/*
  Deterministic memory selection
  Same star always maps to same memory
*/
export function getMemoryForStar(
  star: LifeStar | null | undefined
): MemoryNode | null {

  if (!star) return null

  const matches = memoryIndex.get(star.year)

  if (!matches || matches.length === 0) {
    return null
  }

  const index = star.id % matches.length

  return matches[index]
}