
import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';

interface TimeContextType {
  time: number;
  setTime: (time: number) => void;
  isPlaying: boolean;
  play: () => void;
  pause: () => void;
}

const TimeContext = createContext<TimeContextType | null>(null);

// 1 real second = 1 simulated month. This can be adjusted.
const TIME_MULTIPLIER = 1000 * 60 * 60 * 24 * 30;

/**
 * Provides a global timeline state, including the current time, and controls for playing/pausing the simulation.
 * This component should wrap the main 3D scene.
 */
export const TimeProvider = ({ children }: { children: ReactNode }) => {
  const [time, setTime] = useState(Date.now());
  const [isPlaying, setIsPlaying] = useState(true);

  useFrame((_, delta) => {
    if (isPlaying) {
      // Advance time based on the multiplier
      setTime(t => t + delta * TIME_MULTIPLIER);
    }
  });

  const play = useCallback(() => setIsPlaying(true), []);
  const pause = useCallback(() => setIsPlaying(false), []);

  const value = { time, setTime, isPlaying, play, pause };

  return <TimeContext.Provider value={value}>{children}</TimeContext.Provider>;
};

/**
 * Hook to access the global timeline context (time, play, pause).
 * Must be used within a <TimeProvider>.
 */
export const useTimeline = (): TimeContextType => {
  const context = useContext(TimeContext);
  if (!context) {
    throw new Error('useTimeline must be used within a TimeProvider');
  }
  return context;
};
