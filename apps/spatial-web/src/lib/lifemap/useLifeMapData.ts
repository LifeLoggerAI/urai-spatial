import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { firestore } from "../../lib/firebase"; // Assuming firebase is initialized

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

// --- PHASE 1: RENDER CORE HARDENING (Test Toggle) ---
const TEST_STAR_COUNT = parseInt(process.env.NEXT_PUBLIC_TEST_COUNT || "0", 10);

// Function to generate procedural star data for testing
const generateProceduralStars = (count: number): Star[] => {
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      id: `proc-${i}`,
      schemaVersion: 1,
      userId: "procedural-user",
      position: {
        x: (Math.random() - 0.5) * 100,
        y: (Math.random() - 0.5) * 100,
        z: (Math.random() - 0.5) * 100,
      },
      type: "procedural",
      intensity: Math.random(),
      emotionScore: Math.random(),
      year: 2024,
      archetype: "creator",
      createdAt: new Date(),
    });
  }
  return stars;
};

export const useLifeMapData = () => {
  const [memories, setMemories] = useState<Star[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (TEST_STAR_COUNT > 0) {
          console.warn(
            `[DEV] Generating ${TEST_STAR_COUNT} procedural stars. NOT FOR PRODUCTION.`
          );
          setMemories(generateProceduralStars(TEST_STAR_COUNT));
          setLoading(false);
          return;
        }

        // --- PHASE 4: COST CONTROL (Batching) ---
        // This is a single getDocs call, which is efficient.
        const querySnapshot = await getDocs(collection(firestore, "lifemapStars"));
        const fetchedMemories = querySnapshot.docs.map((doc) => {
          const data = doc.data();
          // --- PHASE 5: FAILURE SAFETY (Data Validation) ---
          // This is a basic check. A more robust solution would use a validation library.
          if (!data.position || typeof data.position.x !== 'number') {
            console.warn("Skipping invalid star:", doc.id);
            return null;
          }
          return { id: doc.id, ...data } as Star;
        });

        setMemories(fetchedMemories.filter((m) => m !== null) as Star[]);
      } catch (err) {
        // --- PHASE 5: FAILURE SAFETY (API Failures) ---
        setError(err as Error);
        console.error("Error fetching lifemap data:", err);
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  return { memories, loading, error };
};
