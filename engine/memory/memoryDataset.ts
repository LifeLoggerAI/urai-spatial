// engine/memory/memoryDataset.ts

// Tier-3: Defines the structure for a single memory record.
export interface Memory {
  id: string; // Unique identifier for the memory/star
  position: [number, number, number]; // Star position in 3D space
  image: string; // Path to the memory image
  title: string; // Memory title
  date: string; // Memory date
}

// Tier-3: The master dataset of all memories in the system.
// This is a deterministic, seed-based dataset. For now, it's a static array.
// In a production system, this would be loaded from a database or API.
export const memoryDataset: Memory[] = [
  {
    id: "star-0",
    position: [0, 0, 0],
    image: "/memory/test-memory.jpg",
    title: "First Contact",
    date: "2023-10-26",
  },
  {
    id: "star-1",
    position: [10, 5, -5],
    image: "/memory/sample.jpg",
    title: "The Silent Forest",
    date: "2024-01-15",
  },
  {
    id: "star-2",
    position: [-10, -5, 5],
    image: "/memory/sample.jpg",
    title: "City of Glass",
    date: "2024-03-20",
  },
];
