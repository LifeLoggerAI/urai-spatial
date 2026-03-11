// --- Tier-3: Canonical Memory Dataset ---
// Single source of truth for spatial memory stars.
// Production systems would fetch this from API / Firestore.

export interface StarDataItem {
  id: number
  position: [number, number, number]
  image: string
  title: string
  date: string
  emotion: string
}

export const STAR_DATA: StarDataItem[] = [
  {
    id: 1,
    position: [-8, 4, -10],
    image: "/memory/memory-1.jpg",
    title: "First Contact",
    date: "2023-03-15",
    emotion: "joy",
  },
  {
    id: 2,
    position: [8, -4, -12],
    image: "/memory/memory-2.jpg",
    title: "Project Orion",
    date: "2023-06-22",
    emotion: "love",
  },
  {
    id: 3,
    position: [5, 5, -15],
    image: "/memory/memory-3.jpg",
    title: "Supernova Witness",
    date: "2023-09-01",
    emotion: "sadness",
  },
  {
    id: 4,
    position: [-5, -5, -8],
    image: "/memory/memory-4.jpg",
    title: "Galaxy NGC-1300",
    date: "2023-11-19",
    emotion: "anger",
  },
  {
    id: 5,
    position: [0, 0, -20],
    image: "/memory/memory-5.jpg",
    title: "The Anomaly",
    date: "2024-01-05",
    emotion: "calm",
  },
  {
    id: 6,
    position: [10, 2, -9],
    image: "/memory/memory-6.jpg",
    title: "First Jump",
    date: "2024-02-11",
    emotion: "joy",
  },
]