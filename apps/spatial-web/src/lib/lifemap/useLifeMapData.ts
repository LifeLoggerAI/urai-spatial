export function useLifeMapData() {
  return {
    memories: [
      {
        id: "memory1",
        chapterIndex: 0,
        emotionalIntensity: 0.6,
        createdAt: 1
      },
      {
        id: "memory2",
        chapterIndex: 0,
        emotionalIntensity: 0.9,
        createdAt: 2
      },
      {
        id: "memory3",
        chapterIndex: 1,
        emotionalIntensity: 0.4,
        createdAt: 3
      }
    ],
    loading: false,
    error: null
  };
}
