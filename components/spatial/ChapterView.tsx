'use client';

import { useLifeMap } from './LifeMapManager';
import { Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';

/**
 * Displays the details of the currently active chapter in the Life-Map.
 * It appears when a chapter is selected and fades away when deselected.
 */
export function ChapterView() {
  const { activeChapter } = useLifeMap();
  const groupRef = useRef<THREE.Group>(null!);

  useFrame((_, delta) => {
    // Smoothly fade the chapter view in or out
    const targetOpacity = activeChapter ? 1 : 0;
    if (groupRef.current) {
      groupRef.current.traverse(child => {
        if (child instanceof THREE.Mesh && child.material) {
          if (!Array.isArray(child.material)) {
            child.material.transparent = true;
            child.material.opacity += (targetOpacity - child.material.opacity) * (delta * 5);
          }
        }
      });
      // If a chapter is active, move the view to its position
      if(activeChapter) {
        groupRef.current.position.lerp(activeChapter.position, delta * 8);
      }
    }
  });

  if (!activeChapter) {
    // Although opacity handles the visual, returning null when not needed is a good practice
    // We keep it rendered for the fade-out effect, the opacity will be 0.
  }

  return (
    <group ref={groupRef}>
        {activeChapter && (
            <group position={[0, 1, 0]}> 
                <Text fontSize={0.4} color="white" anchorX="center">
                    {activeChapter.title}
                </Text>
                <Text fontSize={0.15} color="#ccc" anchorX="center" position={[0, -0.5, 0]} maxWidth={3}>
                    {activeChapter.description}
                </Text>
            </group>
        )}
    </group>
  );
}
