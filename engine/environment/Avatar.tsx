"use client"
export default ({ position }: { position: [number, number, number] }) => <mesh position={position} castShadow><boxGeometry args={[1, 3.5, 1]} /><meshStandardMaterial color="#0a0a0a" /></mesh>;
