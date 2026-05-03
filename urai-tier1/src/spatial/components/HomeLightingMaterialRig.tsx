export default function HomeLightingMaterialRig() {
  return (
    <>
      {/* KEY LIGHT */}
      <directionalLight position={[3, 5, 2]} intensity={1.2} />

      {/* RIM LIGHT */}
      <directionalLight position={[-4, 2, -3]} intensity={0.6} color="#7ec8ff" />

      {/* AMBIENT BASE */}
      <ambientLight intensity={0.25} />
    </>
  );
}
