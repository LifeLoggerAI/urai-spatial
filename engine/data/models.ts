/*
  engine/data/models.ts

  This file defines the core data structures for the LifeMap application.
  It establishes the contract between the abstract spatial engine and the
  application-specific data it represents.
*/

// Represents the emotional valence of a memory.
export type Emotion = "joy" | "sadness" | "fear" | "anger" | "recovery";

// Represents a single, specific memory tied to a star.
export interface Memory {
  id: string; // Unique identifier for the memory
  title: string; // A short title for the memory
  date: string; // ISO 8601 date string
  emotion: Emotion;
  description: string; // A longer description of the memory
  media?: string[]; // Optional links to associated media
}

// Represents the data payload associated with a star in the lifemap.
export interface StarData {
  starId: number; // The instanceId from the Starfield, linking visuals to data
  memory: Memory;
}

// Represents a group of related memories forming a constellation.
export interface Constellation {
  id: string;
  title: string;
  memoryIds: string[];
}
