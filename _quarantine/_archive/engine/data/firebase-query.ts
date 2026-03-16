import { doc, getDoc, Timestamp } from "firebase/firestore";
import { firestore } from "../../firebase/clientApp";
import { MemoryNode } from "./models";

const MEMORIES_COLLECTION = "memories";

function coerceDate(value: unknown): Date {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;

  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  return new Date();
}

/**
 * Fetches a single memory node from Firestore based on a star ID.
 *
 * @param starId The unique identifier for the star, which corresponds to the document ID.
 * @returns A MemoryNode object or null if not found or unreadable.
 */
export async function getMemoryForStar(
  starId: string
): Promise<MemoryNode | null> {
  if (!starId || typeof starId !== "string") {
    console.warn("getMemoryForStar called with invalid starId:", starId);
    return null;
  }

  try {
    const memoryDocRef = doc(firestore, MEMORIES_COLLECTION, starId);
    const memoryDocSnap = await getDoc(memoryDocRef);

    if (!memoryDocSnap.exists()) {
      console.warn(`No memory document found for starId: ${starId}`);
      return null;
    }

    const data = memoryDocSnap.data();

    const memory: MemoryNode = {
      id: memoryDocSnap.id,
      title: typeof data.title === "string" && data.title.trim()
        ? data.title
        : "Untitled Memory",
      timestamp: coerceDate(data.timestamp),
      emotion: typeof data.emotion === "string" && data.emotion.trim()
        ? data.emotion
        : "curiosity",
      imageURL: typeof data.imageURL === "string" && data.imageURL.trim()
        ? data.imageURL
        : "/memory-placeholder.png",
      content: typeof data.content === "string" ? data.content : "",
    };

    return memory;
  } catch (error) {
    console.error(`Error fetching memory for starId "${starId}":`, error);
    return null;
  }
}