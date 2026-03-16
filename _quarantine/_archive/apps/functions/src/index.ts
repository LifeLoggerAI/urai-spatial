
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {FieldValue} from "firebase-admin/firestore";
import * as ai from "./ai";

admin.initializeApp();

/**
 * A seeded pseudo-random number generator.
 * @param {number} seed The seed for the generator.
 * @return {() => number} A function that returns a new random number.
 */
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483647;
  };
}

/**
 * This function is triggered when a new memory is created in Firestore.
 * It enriches the memory with simulated AI data and creates a corresponding
 * star in the user\'s spatial galaxy.
 */
exports.processNewMemory = functions.firestore
    .document("users/{userId}/memories/{memoryId}")
    .onCreate(async (snap, context) => {
      const memory = snap.data();
      const {userId, memoryId} = context.params;

      console.log(`Processing new memory ${memoryId} for user ${userId}`);

      // --- 1. Enrich Memory Data (Simulated AI) ---

      // a. Emotion Tagging (Simulated)
      let emotionalWeight = 0.5; // Default neutral
      let emotion = "neutral";
      if (memory.text) {
        const text = memory.text.toLowerCase();
        if (text.includes("happy") || text.includes("joy")) {
          emotion = "joy";
          emotionalWeight = 0.85;
        } else if (text.includes("sad") || text.includes("miss")) {
          emotion = "sadness";
          emotionalWeight = 0.2;
        } else if (text.includes("love") || text.includes("beautiful")) {
          emotion = "love";
          emotionalWeight = 0.9;
        } else if (text.includes("focus") || text.includes("work")) {
            emotion = "focus";
            emotionalWeight = 0.7;
        }
      }

      // b. Transcription (Simulated)
      const transcription = memory.audioUrl ?
        "This is a simulated transcription of the audio." : null;

      // Update the memory document with enriched data.
      await snap.ref.update({
        enriched: true,
        processedTimestamp: FieldValue.serverTimestamp(),
        emotion: emotion,
        emotionalWeight: emotionalWeight,
        transcription: transcription,
      });

      // --- 2. Create Star from Memory ---

      // a. Deterministic Star Positioning
      // Create a seed from the memory ID and timestamp for positioning.
      const seed_str = memoryId + memory.timestamp.toMillis();
      let seed = 0;
      for (let i = 0; i < seed_str.length; i++) {
        seed += seed_str.charCodeAt(i);
      }
      const random = seededRandom(seed);

      const galaxyRadius = 1000;
      const angle = random() * 2 * Math.PI;
      const radius = Math.sqrt(random()) * galaxyRadius;
      const x = radius * Math.cos(angle);
      const y = (random() - 0.5) * 50; // Height variation
      const z = radius * Math.sin(angle);

      // b. Star Properties
      const starColorMap: {[key: string]: string} = {
        joy: "#FFD700",   // Gold
        sadness: "#ADD8E6", // Light Blue
        love: "#FF69B4",   // Hot Pink
        focus: "#FFFFFF",  // White
        neutral: "#E0E0E0", // Light Grey
      };
      const color = starColorMap[emotion] || "#E0E0E0";
      const size = 0.5 + emotionalWeight * 1.5;

      // c. Create the Star Document
      const starRef = admin.firestore()
          .collection("users").doc(userId)
          .collection("stars").doc(memoryId);

      await starRef.set({
        memoryId: memoryId,
        position: [x, y, z],
        color: color,
        size: size,
        emotion: emotion,
        timestamp: memory.timestamp,
        createdAt: FieldValue.serverTimestamp(),
      });

      console.log(`Successfully created star for memory ${memoryId}`);
      return null;
    });


// --- AI and Timeline Functions ---
exports.generateInsights = ai.generateInsights;
exports.aggregateTimeline = ai.aggregateTimeline;
exports.scoreRelationshipSignals = ai.scoreRelationshipSignals;
