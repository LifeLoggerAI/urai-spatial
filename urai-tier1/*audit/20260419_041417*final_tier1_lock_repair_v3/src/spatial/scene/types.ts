export type GroundObject = {
  id: string;
  label?: string;
  description?: string;
  position: [number, number, number];
  color?: string;
  shape?: string;
};

export type MemoryStar = {
  id: string;
  position: [number, number, number];
  color?: string;
  baseScale?: number;
  category?: string;
};
