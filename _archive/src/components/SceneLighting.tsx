"use client";

export default function SceneLighting() {
  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[5, 5, 5]} intensity={1.1} />
      <pointLight position={[0, 0, 4]} intensity={0.45} />
    </>
  );
}