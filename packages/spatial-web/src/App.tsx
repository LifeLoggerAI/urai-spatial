import { Canvas } from '@react-three/fiber'
import './App.css'
import { OrbitControls, useGLTF, Line } from '@react-three/drei'
import { Star } from './Star'
import { Memory } from './types'
import { useEffect, useMemo, useState } from 'react'
import { VRButton, ARButton, XR } from '@react-three/xr'
import { MemoryDetails } from './MemoryDetails'
import './MemoryDetails.css'
import { PlacementIndicator } from './PlacementIndicator'

function Brain() {
  const { scene } = useGLTF('/brain.glb');
  return <primitive object={scene} />;
}

function App() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [placementMode, setPlacementMode] = useState<Memory | null>(null);

  useEffect(() => {
    fetch('/memories')
      .then(response => response.json())
      .then(data => setMemories(data));
  }, []);

  const timelinePoints = useMemo(() => {
    if (memories.length === 0) return [];
    const sortedMemories = [...memories].sort((a, b) => parseInt(a.id) - parseInt(b.id));
    return sortedMemories.map(m => [m.transform.position.x, m.transform.position.y, m.transform.position.z]);
  }, [memories]);

  const handleStarSelect = (memory: Memory) => {
    setSelectedMemory(memory);
    setPlacementMode(memory);
  };

  const handlePlaceMemory = (transform: {
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
    scale: { x: number; y: number; z: number };
  }) => {
    if (placementMode) {
      const updatedMemories = memories.map(m =>
        m.id === placementMode.id ? { ...m, transform } : m
      );
      setMemories(updatedMemories);
      setPlacementMode(null);
    }
  };

  const handleCloseDetails = () => {
    setSelectedMemory(null);
  };

  return (
    <>
      <VRButton />
      <ARButton />
      <Canvas>
        <XR>
          <ambientLight />
          <pointLight position={[10, 10, 10]} />
          {!placementMode && <Brain />}
          {!placementMode &&
            memories.map(memory => <Star key={memory.id} memory={memory} onSelect={handleStarSelect} />)}
          {!placementMode && timelinePoints.length > 1 && (
            <Line points={timelinePoints} color="white" lineWidth={1} />
          )}
          {placementMode && <PlacementIndicator onSelect={handlePlaceMemory} />}
          <OrbitControls />
        </XR>
      </Canvas>
      {selectedMemory && !placementMode && (
        <MemoryDetails memory={selectedMemory} memories={memories} onClose={handleCloseDetails} />
      )}
    </>
  );
}

export default App;
