'use client';

import { useMemo, useState } from 'react';
import * as THREE from 'three';
import { Tube, Sphere, Text, useCursor } from '@react-three/drei';
import { useSpatialCamera } from './SpatialCameraController';
import { useLifeMap, TimelineNodeData } from './LifeMapManager'; // Import the manager

/**
 * A single, interactive node on the life-map path.
 */
function TimelineNode({ node }: { node: TimelineNodeData }) {
  const [hovered, setHover] = useState(false);
  const { focusOnChapter } = useSpatialCamera();
  const { setActiveChapter } = useLifeMap(); // Get the state setter
  useCursor(hovered);

  const handleClick = () => {
    console.log(`Node '${node.title}' clicked. Setting as active chapter and transitioning camera.`);
    // 1. Set the application state to know which chapter is active.
    setActiveChapter(node);
    // 2. Execute the cinematic focus transition.
    focusOnChapter(node.position);
  };

  return (
    <group position={node.position}>
      <Sphere
        args={[0.2, 16, 16]}
        onClick={handleClick}
        onPointerOver={() => setHover(true)}
        onPointerOut={() => setHover(false)}
      >
        <meshStandardMaterial color={hovered ? '#ff6347' : '#fff'} emissive={hovered ? '#ff6347' : '#fff'} emissiveIntensity={0.6} />
      </Sphere>
      {hovered && (
        <Text position={[0, 0.4, 0]} fontSize={0.2} color="#fff" anchorX="center">
          {node.title}
        </Text>
      )}
    </group>
  );
}

/**
 * Renders a navigable 3D path representing a user's life timeline.
 */
export function TimelinePath({ nodes }: { nodes: TimelineNodeData[] }) {

  const path = useMemo(() => {
    const points = nodes.map(node => node.position);
    return new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);
  }, [nodes]);

  return (
    <group>
      <Tube args={[path, 64, 0.05, 8, false]} material-color="#666" />
      {nodes.map((node) => (
        <TimelineNode key={node.id} node={node} />
      ))}
    </group>
  );
}
