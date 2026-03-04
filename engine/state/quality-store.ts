import { create } from 'zustand'

interface QualityState {
  emotionalEnvironment: boolean;
  setEmotionalEnvironment: (value: boolean) => void;
}

export const useQualityStore = create<QualityState>((set) => ({
  emotionalEnvironment: true,
  setEmotionalEnvironment: (value) => set({ emotionalEnvironment: value }),
}));
