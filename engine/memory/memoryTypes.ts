export type Emotion =
  | "joy"
  | "love"
  | "sadness"
  | "anger"
  | "calm"
  | "curiosity"
  | "focus"

export type Memory = {
  id: number

  // time reference
  timestamp: number
  year?: number

  // emotional classification
  emotion: Emotion

  // media content
  image?: string
  video?: string
  audio?: string

  // narrative metadata
  title?: string
  description?: string

  // spatial linkage
  starId?: number
}