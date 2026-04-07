import dynamic from "next/dynamic";

const SpatialScene = dynamic(() => import("../spatial/scene/SpatialScene"), { ssr: false });

export default function Page(): JSX.Element {
  return (
    <main
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        background: "#01050f",
      }}
    >
      <SpatialScene />
    </main>
  );
}
