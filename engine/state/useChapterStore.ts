import { create } from "zustand"

export type Chapter = {
  chapterId: string
  timeStart: number
  timeEnd: number
  starIds: string[]
}

interface ChapterState {

  chapters: Chapter[]

  activeChapterId: string | null
  activeChapter: Chapter | null

  setChapters: (chapters: Chapter[]) => void
  setActiveChapter: (id: string | null) => void

  clearActiveChapter: () => void
  resetChapters: () => void
}

export const useChapterStore = create<ChapterState>((set, get) => ({

  chapters: [],

  activeChapterId: null,
  activeChapter: null,

  setChapters: (chapters) =>
    set({ chapters }),

  setActiveChapter: (id) => {

    const chapter =
      id ? get().chapters.find(c => c.chapterId === id) ?? null : null

    set({
      activeChapterId: id,
      activeChapter: chapter
    })
  },

  clearActiveChapter: () =>
    set({
      activeChapterId: null,
      activeChapter: null
    }),

  resetChapters: () =>
    set({
      chapters: [],
      activeChapterId: null,
      activeChapter: null
    })

}))