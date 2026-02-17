"use client"
export default () => <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.5, 0]} receiveShadow><planeGeometry args={[500, 500]} /><meshStandardMaterial color="#000000" roughness={0.5} /></mesh>;
