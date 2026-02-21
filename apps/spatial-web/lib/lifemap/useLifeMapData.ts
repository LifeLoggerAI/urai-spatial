export type Star = {
  id: string
  position: [number, number, number]
  color?: string
  size?: number
}

export function useLifeMapData(): { memories: Star[], loading: boolean, error: any } {
  return {
    memories: [],
    loading: false,
    error: null,
  }
}
