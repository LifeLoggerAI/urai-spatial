import { create } from 'zustand'

export type Chapter = {
  chapterId: string
  timeStart: number
  timeEnd: number
  starIds: string[]
}

interface ChapterState {
  chapters: Chapter[]
  activeChapterId: string | null
  setChapters: (chapters: Chapter[]) => void
  setActiveChapter: (id: string | null) => void
}

export const useChapterStore = create<ChapterState>((set) => ({
  chapters: [],
  activeChapterId: null,
  setChapters: (chapters) => set({ chapters }),
  setActiveChapter: (id) => set({ activeChapterId: id })
}))
