import { useRef, useState } from 'react';
import { Group } from 'three';
import { Billboard, Text } from '@react-three/drei';
import { ArchetypeColors } from './colors';
import { Memory } from './types';
import { Interactive } from '@react-three/xr';

interface StarProps {
  memory: Memory;
  onSelect: (memory: Memory) => void;
}

export function Star({ memory, onSelect }: StarProps) {
  const ref = useRef<Group>(null!);
  const [hovered, setHover] = useState(false);
  const [active, setActive] = useState(false);

  const color = ArchetypeColors[memory.archetype];

  const handleSelect = () => {
    setActive(!active);
    onSelect(memory);
  };

  return (
    <Interactive onSelect={handleSelect} onHover={() => setHover(true)} onBlur={() => setHover(false)}>
      <group
        ref={ref}
        position={[memory.transform.position.x, memory.transform.position.y, memory.transform.position.z]}
        rotation={[memory.transform.rotation.x, memory.transform.rotation.y, memory.transform.rotation.z]}
        scale={[memory.transform.scale.x, memory.transform.scale.y, memory.transform.scale.z]}
      >
        <pointLight color={color} distance={hovered ? 10 : 5} intensity={memory.intensity} />
        <Billboard>
          <Text fontSize={0.5} color={color}>
            {memory.id}
          </Text>
        </Billboard>
      </group>
    </Interactive>
  );
}
