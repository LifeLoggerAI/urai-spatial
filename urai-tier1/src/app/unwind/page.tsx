import { TierOneExperience } from "@/spatial/layout/TierOneExperience";

export default function UnwindPage() {
  return (
    <>
      <TierOneExperience mode="unwind" />
      <section
        data-testid="urai-unwind-scene"
        aria-label="Unwind recovery scene"
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          opacity: 0.001,
        }}
      />
    </>
  );
}
