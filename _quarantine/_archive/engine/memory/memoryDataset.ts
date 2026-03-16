export interface Memory {
  id: string
  image: string
  title: string
  date: string
}

export const memoryDataset: Memory[] = [
  {
    id: "star-0",
    image: "/memory/test-memory.jpg",
    title: "First Contact",
    date: "2023-10-26",
  },
  {
    id: "star-1",
    image: "/memory/sample.jpg",
    title: "The Silent Forest",
    date: "2024-01-15",
  },
  {
    id: "star-2",
    image: "/memory/sample.jpg",
    title: "City of Glass",
    date: "2024-03-20",
  },
]

/*
  Pre-index memories for fast lookup
*/
export const memoryIndex: Record<string, Memory> = Object.freeze(
  memoryDataset.reduce((acc, memory) => {
    acc[memory.id] = memory
    return acc
  }, {} as Record<string, Memory>)
)