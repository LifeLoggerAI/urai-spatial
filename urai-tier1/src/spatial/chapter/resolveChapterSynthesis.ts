export type ChapterSynthesis = {
id: string;
title: string;
summary: string;
};

export function resolveChapterSynthesis(chapterId: string, memoryCount: number): ChapterSynthesis {
return {
id: chapterId,
title: memoryCount > 1 ? "Chapter Synthesis" : "Single Memory Chapter",
summary:
memoryCount > 1
? `Chapter ${chapterId} contains ${memoryCount} linked memories.`
: "This memory currently stands alone in its chapter band, ready for richer future chapter grouping.",
};
}
