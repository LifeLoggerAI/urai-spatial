import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

// Dummy function to calculate emotional score (replace with actual logic)
function calculateEmotion(tags: string[]): number {
  if (!tags || tags.length === 0) return 0;
  // Example: simple weighted average
  let score = 0;
  tags.forEach(tag => {
    if (tag.toLowerCase() === 'joy') score += 0.8;
    if (tag.toLowerCase() === 'sadness') score -= 0.6;
    if (tag.toLowerCase() === 'anger') score -= 0.4;
    if (tag.toLowerCase() === 'love') score += 0.9;
  });
  return Math.max(-1, Math.min(1, score / tags.length));
}

// Dummy function to calculate significance
function calculateSignificance(data: any): number {
  // Example: based on transcript length or interaction meta
  const text = data.transcript || "";
  return Math.min(1, text.length / 500);
}

// Function to calculate spiral position
function calculateSpiral(timestamp: number): { x: number; y: number; z: number } {
  const t = timestamp / 10000000000; // Scale timestamp
  const radius = Math.sqrt(t) * 25; // Increase radius for a wider spiral
  const angle = t * 2 * Math.PI;
  return {
    x: radius * Math.cos(angle),
    y: radius * Math.sin(angle),
    z: (Math.random() - 0.5) * 5,
  };
}

export const enrichMemoryNode = functions.firestore
  .document("users/{uid}/memoryNodes/{nodeId}")
  .onCreate(async (snap, context) => {
    try {
      const data = snap.data();

      if (!data) {
        console.error("No data found in snapshot");
        return;
      }

      const enriched = {
        emotionalScore: calculateEmotion(data.emotionTags || []),
        significanceScore: calculateSignificance(data),
        spiralPosition: calculateSpiral(data.timestamp || Date.now()),
      };

      await snap.ref.update(enriched);
      console.log(`Enriched memory node ${context.params.nodeId} for user ${context.params.uid}`);

    } catch (error) {
      console.error("Error enriching memory node:", error);
    }
  });
