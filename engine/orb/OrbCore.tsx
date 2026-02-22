"use client"
import { useFrame } from "@react-three/fiber"; import { useRef } from "react"; import { Mesh } from "three";
export default ({ onClick }: { onClick: () => void }) => {
    const ref = useRef<Mesh>(null!);
    useFrame((s) => { ref.current.rotation.y += 0.002; ref.current.position.y = -0.1 + Math.sin(s.clock.elapsedTime) * 0.15; });
    return <mesh ref={ref} onClick={onClick} castShadow><sphereGeometry args={[1.5, 32, 32]} /><meshStandardMaterial color="#3a2d6e" emissive="#7c6cff" emissiveIntensity={1.8} metalness={0.1} roughness={0.2} /></mesh>;
};
