export function HorizonSystem() {
  return (
    <>
      <div className="horizon-bloom" data-testid="urai-home-horizon" />
      <div className="horizon-mist mist-far" data-testid="home-layer-horizon-mist-far" />
      <div className="horizon-mist mist-mid" data-testid="home-layer-horizon-mist-mid" />
      <div className="horizon-mist mist-near" data-testid="home-layer-horizon-mist-near" />
      <div className="symbolic-threshold" data-testid="home-layer-symbolic-threshold" />
      <div className="terrain terrain-far" data-testid="home-layer-terrain-far" />
      <div className="terrain terrain-mid" data-testid="home-layer-terrain-mid" />
      <div className="terrain terrain-near" data-testid="home-layer-terrain-near" />
    </>
  );
}
