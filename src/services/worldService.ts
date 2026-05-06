import { SpatialRepository } from "../repositories/spatialRepository";
import { db } from "../config/firebase";
import { collection, addDoc } from "firebase/firestore";

export const WorldService = {
  // Composite action: Update world and log the "why"
  async updateWorldWithExplanation(userId: string, worldId: string, data: any, reason: string) {
    // 1. Update the actual world state
    await SpatialRepository.updateHomeWorld(userId, worldId, data);
    
    // 2. Log the explanation (Tier 2 Logic)
    const explainRef = collection(db, 'users', userId, 'homeWorldExplainability');
    await addDoc(explainRef, {
      reasoning: reason,
      sourceEventId: worldId,
      timestamp: Date.now()
    });
  }
};
