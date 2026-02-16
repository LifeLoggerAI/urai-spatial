import * as functions from "firebase-functions"
import * as admin from "firebase-admin"
import { EmotionVector } from "./archetype"

/**
 * A mapping from descriptive emotion tags to their corresponding EmotionVector values.
 * This is a simplified model; a more sophisticated approach could use NLP or user-defined mappings.
 */
const emotionTagMap: Record<string, EmotionVector> = {
  happy: { valence: 0.8, arousal: 0.6, agency: 0.7 },
  sad: { valence: -0.7, arousal: 0.3, agency: 0.2 },
  anxious: { valence: -0.4, arousal: 0.8, agency: 0.4 },
  calm: { valence: 0.3, arousal: 0.2, agency: 0.6 },
  excited: { valence: 0.7, arousal: 0.9, agency: 0.8 },
  // TODO: Expand this map with more emotions
};

/**
 * Calculates an EmotionVector from a list of descriptive tags.
 * It averages the vectors of all recognized tags.
 */
function calculateEmotion(tags: string[]): EmotionVector {
  if (!tags || tags.length === 0) {
    return { valence: 0, arousal: 0, agency: 0 };
  }

  const recognizedVectors = tags
    .map(tag => emotionTagMap[tag.toLowerCase()])
    .filter(v => v !== undefined);

  if (recognizedVectors.length === 0) {
    return { valence: 0, arousal: 0, agency: 0 };
  }

  // Simple average of the vectors
  const sum = recognizedVectors.reduce(
    (acc, v) => ({
      valence: acc.valence + v.valence,
      arousal: acc.arousal + v.arousal,
      agency: acc.agency + v.agency,
    }),
    { valence: 0, arousal: 0, agency: 0 }
  );

  return {
    valence: sum.valence / recognizedVectors.length,
    arousal: sum.arousal / recognizedVectors.length,
    agency: sum.agency / recognizedVectors.length,
  };
}

/**
 * Placeholder for a function that calculates the significance of a memory.
 * In a real implementation, this would analyze the content, connections, and user interactions.
 */
function calculateSignificance(data: any): number {
  // For now, return a random value
  return Math.random();
}

/**
 * Placeholder for the spiral calculation function.
 */
function calculateSpiral(timestamp: number) {
    const t = timestamp / 100000000;
    const radius = Math.sqrt(t) * 10;
    const angle = t * 0.5;

    return {
        x: radius * Math.cos(angle),
        y: radius * Math.sin(angle),
        z: Math.random() * 5,
    };
}


export const enrichMemoryNode = functions.firestore
  .document("users/{uid}/memoryNodes/{nodeId}")
  .onCreate(async (snap, context) => {
    const data = snap.data()

    const enriched = {
      emotionVector: calculateEmotion(data.emotionTags),
      significanceScore: calculateSignificance(data),
      spiralPosition: calculateSpiral(data.timestamp)
    }

    await snap.ref.update(enriched)
  })
