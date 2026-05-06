import { useState, useEffect } from 'react';
import { SpatialRepository } from '../repositories/spatialRepository';
import { SpatialMemory } from '../models/types';

export function useSpatialData(userId: string) {
  const [memories, setMemories] = useState<SpatialMemory[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshMemories = async () => {
    setLoading(true);
    const data = await SpatialRepository.getMemories(userId);
    setMemories(data);
    setLoading(false);
  };

  useEffect(() => {
    if (userId) refreshMemories();
  }, [userId]);

  return { memories, loading, refreshMemories };
}
