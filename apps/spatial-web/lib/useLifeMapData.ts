import { useState, useEffect } from 'react';

export interface Star {
  id: string;
  position: {
    x: number;
    y: number;
    z: number;
  };
  intensity?: number;
}

export const useLifeMapData = () => {
  const [memories, setMemories] = useState<Star[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Simulate fetching data
        const mockData: Star[] = [
          { id: '1', position: { x: 0, y: 0, z: 0 }, intensity: 1 },
          { id: '2', position: { x: 1, y: 1, z: 1 }, intensity: 0.8 },
          { id: '3', position: { x: -1, y: -1, z: -1 }, intensity: 0.6 },
        ];
        setMemories(mockData);
      } catch (e) {
        if (e instanceof Error) {
            setError(e);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { memories, loading, error };
};
