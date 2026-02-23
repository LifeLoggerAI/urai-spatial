'use client'

// Using a large sphere to create a subtle, curved horizon.
// This replaces the flat plane to provide a more realistic planetary feel.
export default function Ground() {
  return (
    // By setting the position to just below the sphere's radius, its top surface aligns perfectly with Y=1.
    <mesh position={[0, -199, 0]}>
      {/* A large radius (200) flattens the curve, making the orb feel grounded on a massive world. */}
      <sphereGeometry args={[200, 64, 64]} />
      {/* The ground color is lifted to a navy blue to create a tonal bridge and reduce contrast. */}
      <meshStandardMaterial color="#0b1c30" roughness={1} metalness={0} />
    </mesh>
  )
}
