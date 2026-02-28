
import { getDeterministicPosition } from './hashPosition';

// Represents a single star or memory node
export interface StarData {
  id: number;
  position: [number, number, number];
  emotionalWeight: number; // e.g., 0-1
  timestamp: number; // Unix timestamp
}

// Represents a chapter in the LifeMap, which is a collection of related stars
export interface LifeChapter {
  id: string;
  title: string;
  stars: StarData[];
  center: [number, number, number];
  radius: number;
}

const CHAPTER_BREAK_THRESHOLD = 1000 * 60 * 60 * 24 * 30; // 30 days

/**
 * Segments a list of stars into chapters based on temporal clustering.
 * @param stars A list of stars, sorted by timestamp.
 * @returns An array of LifeChapter objects.
 */
export function segmentIntoChapters(stars: StarData[]): LifeChapter[] {
  if (stars.length === 0) return [];

  const chapters: LifeChapter[] = [];
  let currentChapterStars: StarData[] = [stars[0]];

  for (let i = 1; i < stars.length; i++) {
    const prevStar = stars[i - 1];
    const currentStar = stars[i];
    const timeDiff = currentStar.timestamp - prevStar.timestamp;

    if (timeDiff > CHAPTER_BREAK_THRESHOLD) {
      chapters.push(createChapterFromStars(currentChapterStars));
      currentChapterStars = [];
    }
    currentChapterStars.push(currentStar);
  }

  // Add the last chapter
  chapters.push(createChapterFromStars(currentChapterStars));

  return chapters;
}

/**
 * Creates a single LifeChapter from a list of stars.
 * @param stars The stars belonging to this chapter.
 * @returns A LifeChapter object.
 */
function createChapterFromStars(stars: StarData[]): LifeChapter {
  const starCount = stars.length;
  if (starCount === 0) {
    // This should not happen in the current logic, but as a safeguard:
    return { id: 'empty', title: 'Empty Chapter', stars: [], center: [0, 0, 0], radius: 0 };
  }

  // Chapter ID from the first star
  const id = `chapter-${stars[0].id}`;

  // Simple title for now
  const title = `Chapter of ${starCount} memories`;

  // Calculate the geometric center (centroid) of the stars
  const center = stars
    .reduce(
      (acc, star) => [
        acc[0] + star.position[0],
        acc[1] + star.position[1],
        acc[2] + star.position[2],
      ],
      [0, 0, 0]
    )
    .map((v) => v / starCount) as [number, number, number];

  // Calculate the radius of the chapter's bounding sphere
  const radius = Math.max(
    ...stars.map((star) => {
      const dx = star.position[0] - center[0];
      const dy = star.position[1] - center[1];
      const dz = star.position[2] - center[2];
      return Math.sqrt(dx * dx + dy * dy + dz * dz);
    })
  );

  return { id, title, stars, center, radius };
}
