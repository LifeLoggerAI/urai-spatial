
import { doc, getDoc } from "firebase/firestore";
import { firestore } from "../../firebase/clientApp";
import { MemoryNode } from "./models";

const memoriesCollection = "memories"; // Assuming this is your collection name

/**
 * Fetches a single memory node from Firestore based on a star ID.
 *
 * @param starId The unique identifier for the star, which corresponds to the document ID.
 * @returns A MemoryNode object or null if not found.
 */
export const getMemoryForStar = async (starId: string): Promise<MemoryNode | null> => {
  try {
    const memoryDocRef = doc(firestore, memoriesCollection, starId);
    const memoryDocSnap = await getDoc(memoryDocRef);

    if (memoryDocSnap.exists()) {
      const data = memoryDocSnap.data();
      // Basic validation to ensure the data matches the MemoryNode shape
      return {
        id: memoryDocSnap.id,
        title: data.title || "Untitled Memory",
        timestamp: data.timestamp?.toDate() || new Date(),
        emotion: data.emotion || "curiosity",
        imageURL: data.imageURL || "/memory-placeholder.png",
        content: data.content || "",
      } as MemoryNode;
    } else {
      console.warn(`No memory document found for starId: ${starId}`);
      return null;
    }
  } catch (error) {
    console.error("Error fetching memory from Firestore:", error);
    return null;
  }
};
