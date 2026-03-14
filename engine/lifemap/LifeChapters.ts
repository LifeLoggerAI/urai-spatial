export type LifeChapter = {
  id: string
  start: number
  end: number
}

export const lifeChapters: Record<string, LifeChapter> = {
  childhood: {
    id: "childhood",
    start: 1980,
    end: 1992,
  },

  adolescence: {
    id: "adolescence",
    start: 1993,
    end: 1998,
  },

  earlyAdulthood: {
    id: "earlyAdulthood",
    start: 1999,
    end: 2010,
  },

  midLife: {
    id: "midLife",
    start: 2011,
    end: 2030,
  },

  laterLife: {
    id: "laterLife",
    start: 2031,
    end: 2080,
  },
}