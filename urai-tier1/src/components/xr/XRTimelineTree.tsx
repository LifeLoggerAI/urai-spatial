"use client";

import { useMemo } from "react";

export default function XRTimelineTree({ branches, currentBranchId, setCurrentBranchId }: any) {
  const nodes = useMemo(() => {
    const list = Object.values(branches || {});

    return list.map((b: any, i: number) => {
      const depth = getDepth(branches, b.id);

      return {
        id: b.id,
        parentId: b.parentId,
        position: [
          depth * 1.5,
          i * 0.5 - list.length * 0.25,
          0
        ] as [number, number, number]
      };
    });
  }, [branches]);

  return (
    <group position={[0, -3, -2]}>
      {nodes.map((n: any) => (
        <mesh
          key={n.id}
          position={n.position}
          onClick={(e) => {
            e.stopPropagation();
            setCurrentBranchId(n.id);
          }}
        >
          <sphereGeometry args={[0.12, 12, 12]} />
          <meshStandardMaterial
            color={n.id === currentBranchId ? "orange" : "white"}
          />
        </mesh>
      ))}
    </group>
  );
}

function getDepth(branches: any, id: string, depth = 0): number {
  const b = branches?.[id];
  if (!b || !b.parentId) return depth;
  return getDepth(branches, b.parentId, depth + 1);
}
