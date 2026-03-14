export type Emotion =
  | "joy"
  | "love"
  | "sadness"
  | "fear"
  | "anger"
  | "calm"
  | "curiosity"
  | "focus"
  | "recovery"

export interface Memory {
  id: string
  title: string
  date: string
  emotion: Emotion
  description: string
}

export interface Star {
  id: string
  position: [number, number, number]
  image?: string
  story?: string
  voice?: string
  narrativeId?: string
}

export interface StarData {
  starId: number
  memory: Memory
}