export type MemoryNode = {
  id: number
  year: number
  title: string
  image: string
  description: string
}

export const memoryNodes: MemoryNode[] = [
  {
    id: 0,
    year: 1982,
    title: "Early Memory",
    image: "/memory/sample.jpg",
    description: "First recorded life memory"
  },
  {
    id: 1,
    year: 1987,
    title: "Childhood Event",
    image: "/memory/sample.jpg",
    description: "Important childhood event"
  },
  {
    id: 2,
    year: 1998,
    title: "Adulthood Beginning",
    image: "/memory/sample.jpg",
    description: "Transition into adulthood"
  }
]

/*
  Fast lookup table for star → memory resolution
*/
export const memoryYearIndex: Record<number, MemoryNode[]> = {}

for (const node of memoryNodes) {
  if (!memoryYearIndex[node.year]) {
    memoryYearIndex[node.year] = []
  }
  memoryYearIndex[node.year].push(node)
}