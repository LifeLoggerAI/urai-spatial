import { create } from 'zustand';

export interface Insight {
  id: string;
  type: 'chapter' | 'trend' | 'forecast';
  message: string;
  timestamp: number;
}

interface InsightState {
  enabled: boolean;
  insights: Insight[];
  visible: boolean;

  setEnabled: (enabled: boolean) => void;
  setInsights: (insights: Insight[]) => void;
  setVisible: (visible: boolean) => void;
  clearInsights: () => void;
}

export const useInsightStore = create<InsightState>((set) => ({
  enabled: false,
  insights: [],
  visible: false,

  setEnabled: (enabled) => set({ enabled }),

  setInsights: (insights) => set({ insights }),

  setVisible: (visible) => set({ visible }),

  clearInsights: () => set({ insights: [], visible: false }),
}));
