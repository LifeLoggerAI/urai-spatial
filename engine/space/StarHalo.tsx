"use client"

export default function StarHalo(){

  return (
    <mesh scale={[1.8,1.8,1.8]}>
      <sphereGeometry args={[0.25,12,12]} />
      <meshBasicMaterial
        color="#7aa6ff"
        transparent
        opacity={0.15}
      />
    </mesh>
  )

}
