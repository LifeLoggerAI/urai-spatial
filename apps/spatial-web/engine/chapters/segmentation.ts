
export type StarData = {
  id: number;
  position: [number, number, number];
  emotionalWeight: number;
  timestamp: number;
};

export type LifeChapter = {
  id: number;
  title: string;
  startDate: number;
  endDate: number;
  starIds: number[];
};

// This is a placeholder for a sophisticated chapter detection algorithm.
// For now, it divides stars into simple, time-based chapters.
export function segmentIntoChapters(stars: StarData[]): LifeChapter[] {
  if (stars.length === 0) {
    return [];
  }

  // Sort stars by time to ensure chronological order
  const sortedStars = [...stars].sort((a, b) => a.timestamp - b.timestamp);

  const chapters: LifeChapter[] = [];
  const chapterCount = 5; // Example: divide life into 5 chapters
  const starsPerChapter = Math.ceil(sortedStars.length / chapterCount);

  for (let i = 0; i < chapterCount; i++) {
    const chapterStars = sortedStars.slice(
      i * starsPerChapter,
      (i + 1) * starsPerChapter
    );

    if (chapterStars.length > 0) {
      chapters.push({
        id: i,
        title: `Chapter ${i + 1}`,
        startDate: chapterStars[0].timestamp,
        endDate: chapterStars[chapterStars.length - 1].timestamp,
        starIds: chapterStars.map(star => star.id),
      });
    }
  }

  return chapters;
}
