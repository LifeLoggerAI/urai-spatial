const stars = Array.from({ length: 120 }, (_, index) => ({
  x: (index * 37 + 11) % 100,
  y: (index * 53 + 17) % 100,
  opacity: 0.18 + (((index * 13) % 72) / 100),
  delay: ((index * 17) % 11) / 10,
}));

export function StarfieldLayer() {
  return (
    <>
      <div className="constellation-web" data-testid="home-layer-constellations" />
      <div className="stars" aria-hidden="true" data-testid="home-layer-stars">
        {stars.map((s, index) => (
          <i key={index} style={{ left: `${s.x}%`, top: `${s.y}%`, opacity: s.opacity, animationDelay: `${s.delay}s` }} />
        ))}
      </div>
    </>
  );
}
