export type Emotion =
  | "joy"
  | "love"
  | "sadness"
  | "anger"
  | "calm"
  | "curiosity"
  | "focus"

export type MemoryId = number

export type MemoryMedia = {
  image?: string
  video?: string
  audio?: string
}

export type Memory = {
  id: MemoryId

  // temporal reference
  timestamp: number

  // emotional classification
  emotion: Emotion

  // media content
  media?: MemoryMedia

  // narrative metadata
  title?: string
  description?: string

  // spatial linkage to star in LifeMap
  starId?: number
}