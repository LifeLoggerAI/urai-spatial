'use client';

import React, { useState, useCallback, createContext, useContext } from 'react';
import { useThree } from '@react-three/fiber';
import { Vector3, CatmullRomCurve3 } from 'three';
import { useSpatialCamera } from '@/components/spatial/SpatialCameraController';
import { SpatialTransitionState } from '@/packages/spatial-core/src/fsm/SpatialTransitionFSM';
import { AbstractionChamber } from '@/components/spatial/AbstractionChamber';
import { ConsentToken, SharedMemoryArchetype } from '@/lib/storytime';
import { v4 as uuidv4 } from 'uuid';

// Placeholder for a function that would securely hash memory data.
const hashMemory = async (memoryId: string) => `hash_${memoryId}`;

interface IStorytimeContext {
  startStorytime: (archetype: SharedMemoryArchetype) => void;
}

const StorytimeContext = createContext<IStorytimeContext | null>(null);

/**
 * Manages the full "Storytime" workflow, making it available to the entire app.
 */
export function StorytimeProvider({ children }: { children: React.ReactNode }) {
  const { controller, fsm } = useSpatialCamera();
  const { camera } = useThree();

  const [isSharing, setIsSharing] = useState(false);
  const [activeArchetype, setActiveArchetype] = useState<SharedMemoryArchetype | null>(null);
  const [originPosition, setOriginPosition] = useState<Vector3 | null>(null);

  const startStorytime = useCallback((archetype: SharedMemoryArchetype) => {
    if (!controller || fsm.state !== SpatialTransitionState.IDLE) return;

    const from = camera.position.clone();
    setOriginPosition(from);
    setActiveArchetype(archetype);

    const to = new Vector3(0, 100, 0); // Destination for the Abstraction Chamber
    const controlPoint1 = new Vector3().lerpVectors(from, to, 0.33).add(new Vector3(15, 0, 15));
    const controlPoint2 = new Vector3().lerpVectors(from, to, 0.66).add(new Vector3(-15, 50, -15));
    const ceremonialSpline = new CatmullRomCurve3([from, controlPoint1, controlPoint2, to]);

    fsm.send('START_TRANSITION');
    controller.startCommit(ceremonialSpline);
    setIsSharing(true);
  }, [controller, fsm, camera]);

  const endStorytime = useCallback(async (consented: boolean) => {
    if (!controller || !originPosition || !activeArchetype) return;

    if (consented) {
      console.log('Consent granted. Generating token...');
      const token: ConsentToken = {
        sourceMemoryHash: await hashMemory('memory_123'), // Replace with actual memory ID
        storyId: `story_${uuidv4()}`,
        archetype: activeArchetype,
        timestamp: Date.now(),
        protocolVersion: '1.0',
      };
      console.log('Consent Token Created:', token);
      // In a real app, this token would be sent to a secure backend.
    } else {
      console.log('Consent denied.');
    }

    // --- Return Journey ---
    const from = camera.position.clone();
    const to = originPosition;
    const controlPoint1 = new Vector3().lerpVectors(from, to, 0.33).add(new Vector3(5, -20, 10));
    const controlPoint2 = new Vector3().lerpVectors(from, to, 0.66).add(new Vector3(-5, -10, -10));
    const returnSpline = new CatmullRomCurve3([from, controlPoint1, controlPoint2, to]);

    fsm.send('LOAD_COMPLETE');
    fsm.send('REVEAL_COMPLETE');
    
    // Hacky timeout to ensure FSM is ready for the next transition
    setTimeout(() => {
        fsm.send('START_TRANSITION');
        controller.startCommit(returnSpline);
        setIsSharing(false);
        setActiveArchetype(null);
    }, 100);

  }, [controller, originPosition, activeArchetype, fsm, camera]);

  return (
    <StorytimeContext.Provider value={{ startStorytime }}>
      {children}

      {isSharing && fsm.state === SpatialTransitionState.PRELOADING && activeArchetype && (
        <AbstractionChamber 
          archetype={activeArchetype} 
          onConsent={() => endStorytime(true)} 
          onDeny={() => endStorytime(false)} 
        />
      )}
    </StorytimeContext.Provider>
  );
}

export const useStorytime = () => {
  const context = useContext(StorytimeContext);
  if (!context) {
    throw new Error('useStorytime must be used within a StorytimeProvider');
  }
  return context;
};
