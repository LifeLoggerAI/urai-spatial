"use client";

export default function XRTimelineScrubber({ history, scrubIndex, setScrubIndex }: any) {
  if (!history?.length) return null;

  return (
    <group position={[0, 3.2, 0]}>
      <mesh>
        <planeGeometry args={[6, 0.6]} />
        <meshStandardMaterial transparent opacity={0.25} />
      </mesh>

      <group>
        <mesh
          position={[-2.8 + (scrubIndex ?? history.length - 1) * (5.6 / history.length), 0, 0.1]}
        >
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshStandardMaterial color="orange" />
        </mesh>
      </group>

      {/* invisible hit zones */}
      {history.map((_: any, i: number) => (
        <mesh
          key={i}
          position={[-2.8 + i * (5.6 / history.length), 0, 0]}
          onClick={() => setScrubIndex(i)}
        >
          <boxGeometry args={[0.2, 0.6, 0.2]} />
          <meshBasicMaterial transparent opacity={0} />
        </mesh>
      ))}
    </group>
  );
}
