import { useRef } from 'react';
import { Mesh, Matrix4, Vector3, Quaternion } from 'three';
import { useHitTest, Interactive } from '@react-three/xr';

interface PlacementIndicatorProps {
  onSelect: (transform: {
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
    scale: { x: number; y: number; z: number };
  }) => void;
}

export function PlacementIndicator({ onSelect }: PlacementIndicatorProps) {
  const ref = useRef<Mesh>(null!);

  useHitTest(hitMatrix => {
    if (ref.current) {
      ref.current.matrix.fromArray(hitMatrix);
    }
  });

  const handleSelect = () => {
    if (ref.current) {
      const matrix = new Matrix4();
      matrix.fromArray(ref.current.matrix.toArray());

      const position = new Vector3();
      const rotation = new Quaternion();
      const scale = new Vector3();
      matrix.decompose(position, rotation, scale);

      onSelect({
        position: { x: position.x, y: position.y, z: position.z },
        rotation: { x: rotation.x, y: rotation.y, z: rotation.z },
        scale: { x: scale.x, y: scale.y, z: scale.z },
      });
    }
  };

  return (
    <Interactive onSelect={handleSelect}>
      <mesh ref={ref}>
        <boxGeometry args={[0.1, 0.1, 0.1]} />
        <meshBasicMaterial color="lightblue" />
      </mesh>
    </Interactive>
  );
}
