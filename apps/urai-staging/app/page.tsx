import SceneEngine from "@/components/engine/SceneEngine";

export default function Page() {
  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      <SceneEngine />
    </div>
  );
}
