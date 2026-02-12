'use client';

import React, { createContext, useState, useContext, useMemo } from 'react';
import * as THREE from 'three';

// Represents a significant chapter or event in the user's life map
export interface TimelineNodeData {
  id: string;
  position: THREE.Vector3;
  title: string;
  // Future properties like description, associated memories, etc.
  description?: string;
}

interface ILifeMapContext {
  activeChapter: TimelineNodeData | null;
  setActiveChapter: (chapter: TimelineNodeData | null) => void;
}

const LifeMapContext = createContext<ILifeMapContext | null>(null);

/**
 * Manages the state for the V3 Life-Map Walkthrough experience,
 * such as which chapter is currently active or focused.
 */
export function LifeMapProvider({ children }: { children: React.ReactNode }) {
  const [activeChapter, setActiveChapter] = useState<TimelineNodeData | null>(null);

  const value = useMemo(() => ({
    activeChapter,
    setActiveChapter,
  }), [activeChapter]);

  return (
    <LifeMapContext.Provider value={value}>
      {children}
    </LifeMapContext.Provider>
  );
}

export const useLifeMap = () => {
  const context = useContext(LifeMapContext);
  if (!context) {
    throw new Error('useLifeMap must be used within a LifeMapProvider');
  }
  return context;
};
