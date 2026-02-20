import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { firestore } from "../firebase"; // Assuming firebase is initialized

// --- PHASE 2: FIRESTORE SCHEMA LOCK ---
export interface Star {
  id: string;
  schemaVersion: number;
  userId: string;
  position: { x: number; y: number; z: number };
  type: string;
  intensity: number;
  emotionScore: number;
  year: number;
  archetype: string;
  createdAt: any; // Use a proper timestamp type in a real app
}

export const useLifeMapData = () => {
  const [memories, setMemories] = useState<Star[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // --- PHASE 4: COST CONTROL (Batching) ---
        // This is a single getDocs call, which is efficient.
        const querySnapshot = await getDocs(collection(firestore, "lifemapStars"));
        const fetchedMemories = querySnapshot.docs.map((doc) => {
          const data = doc.data();
          // --- PHASE 5: FAILURE SAFETY (Data Validation) ---
          // This is a basic check. A more robust solution would use a validation library.
          if (!data.position || typeof data.position.x !== 'number') {
            return null;
          }
          return { id: doc.id, ...data } as Star;
        });

        setMemories(fetchedMemories.filter((m) => m !== null) as Star[]);
      } catch (err) {
        // --- PHASE 5: FAILURE SAFETY (API Failures) ---
        setError(err as Error);
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  return { memories, loading, error };
};
