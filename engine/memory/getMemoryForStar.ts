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
  Build fast lookup table once
*/
const memoryIndex: Record<number, MemoryNode[]> = {}

for (const node of memoryNodes) {
  if (!memoryIndex[node.year]) {
    memoryIndex[node.year] = []
  }
  memoryIndex[node.year].push(node)
}

export function getMemoryForStar(
  star: LifeStar | null | undefined
): MemoryNode | null {

  if (!star) return null

  const matches = memoryIndex[star.year]

  if (!matches || matches.length === 0) return null

  return matches[0]
}