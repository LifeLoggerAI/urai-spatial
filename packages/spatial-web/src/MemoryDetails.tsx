import { Memory } from './types';

interface MemoryDetailsProps {
  memory: Memory;
  memories: Memory[];
  onClose: () => void;
}

export function MemoryDetails({ memory, memories, onClose }: MemoryDetailsProps) {
  const handleSave = () => {
    fetch('/memories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(memories, null, 2),
    });
  };

  return (
    <div className="memory-details">
      <h2>Memory Details</h2>
      <p>ID: {memory.id}</p>
      <p>Archetype: {memory.archetype}</p>
      <p>Emotional Weight: {memory.emotionalWeight}</p>
      <p>Intensity: {memory.intensity}</p>
      <button onClick={onClose}>Close</button>
      <button onClick={handleSave}>Save</button>
    </div>
  );
}
