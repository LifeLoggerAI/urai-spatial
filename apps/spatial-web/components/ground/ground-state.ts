import { create } from 'zustand';

export type GroundObjectType = 'home' | 'work' | 'relationship' | 'health' | 'finance';

export interface GroundObject {
  id: string;
  type: GroundObjectType;
  position: [number, number, number];
  label: string;
  intensity?: number;
}

interface GroundState {
  selected: string | null;
  objects: GroundObject[];
  select: (id: string | null) => void;
}

export const useGroundState = create<GroundState>((set) => ({
  selected: null,
  select: (id) => set({ selected: id }),
  objects: [
    { id: "home", type: "home", position: [0, 0, 2], label: "Home", intensity: 0.8 },
    { id: "work", type: "work", position: [-3, 0, -2], label: "Work", intensity: 0.4 },
    { id: "relationship", type: "relationship", position: [3, 0, -2], label: "Relationship", intensity: 0.6 },
    { id: "health", type: "health", position: [-5, 0, -5], label: "Health", intensity: 0.3 },
    { id: "finance", type: "finance", position: [5, 0, -5], label: "Finance", intensity: 0.7 },
  ],
}));
