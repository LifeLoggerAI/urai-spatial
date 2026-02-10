export interface Memory {
  id: string;
  archetype: 'insight' | 'loss' | 'love' | 'creation' | 'default';
  transform: {
    position: {
      x: number;
      y: number;
      z: number;
    };
    rotation: {
      x: number;
      y: number;
      z: number;
    };
    scale: {
      x: number;
      y: number;
      z: number;
    };
  };
  emotionalWeight: number;
  intensity: number;
  activeRelevance: boolean;
}
