export function OrbCompanionLayer({ opening, onEnter }: { opening: boolean; onEnter: () => void }) {
  return (
    <>
      <button
        type="button"
        className="orb"
        data-testid="urai-orb-button"
        aria-label="Enter Life Map"
        aria-disabled={opening}
        onClick={onEnter}
        disabled={opening}
      >
        <span className="orb-core" />
        <span className="orb-ring ring-a" />
        <span className="orb-ring ring-b" />
        <span className="orb-glyph" />
      </button>
      <div className="orb-beam" />
      <div className="camera-path path-a" />
      <div className="camera-path path-b" />
    </>
  );
}
