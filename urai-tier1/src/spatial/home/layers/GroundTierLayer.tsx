const motes = Array.from({ length: 34 }, (_, index) => ({
  x: (index * 29 + 9) % 100,
  y: 52 + ((index * 19) % 43),
  size: 2 + ((index * 7) % 5),
  delay: ((index * 23) % 17) / 3,
}));

export function GroundTierLayer() {
  return (
    <>
      <div className="ground ground-back" />
      <div className="ground ground-mid" />
      <div className="ground ground-front" data-testid="urai-home-ground" />
      <div className="ground-grid" />
    </>
  );
}

export function RootBloomLayer() {
  return (
    <>
      <div className="root-network" data-testid="home-layer-root-network" />
      <div className="bloom-field" data-testid="home-layer-bloom-field" />
      <div className="particles" data-testid="home-layer-particles">
        {motes.map((m, index) => (
          <i key={index} style={{ left: `${m.x}%`, top: `${m.y}%`, width: m.size, height: m.size, animationDelay: `${m.delay}s` }} />
        ))}
      </div>
    </>
  );
}
