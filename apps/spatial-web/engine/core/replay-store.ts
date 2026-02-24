import { create } from 'zustand';

type ReplayState = {
  memoryId: string | null;
  emotionalWeight: number;
  timestamp: number;
  setReplayData: (data: { memoryId: string; emotionalWeight: number; timestamp: number }) => void;
};

export const useReplayStore = create<ReplayState>((set) => ({
  memoryId: null,
  emotionalWeight: 0,
  timestamp: 0,
  setReplayData: (data) => set({ ...data }),
}));
