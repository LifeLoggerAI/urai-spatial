export function calculateSpiral(timestamp: number) {
  const t = timestamp / 100000000;
  const radius = Math.sqrt(t) * 10;
  const angle = t * 0.5;

  return {
    x: radius * Math.cos(angle),
    y: radius * Math.sin(angle),
    z: Math.random() * 5,
  };
}
