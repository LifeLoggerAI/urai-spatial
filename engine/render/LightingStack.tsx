"use client"
export default () => <>
    <ambientLight intensity={0.15} />
    <directionalLight castShadow position={[10, 20, 5]} intensity={1.0} color="#c2b0ff" />
    <pointLight position={[0, 0.5, 0]} intensity={8} color="#7c6cff" distance={12} />
</>;
