"use client"

export default function GroundScene({ goBack }: { goBack: () => void }) {
  return (
    <>
      <mesh position={[0, -5, 0]}>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#222" />
      </mesh>

      <mesh position={[0, 0, 0]} onClick={goBack}>
        <sphereGeometry args={[2, 16, 16]} />
        <meshBasicMaterial color="white" />
      </mesh>

      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 5]} />
    </>
  )
}
