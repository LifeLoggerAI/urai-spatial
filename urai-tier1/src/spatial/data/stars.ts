'''import seedrandom from 'seedrandom';

const STAR_COUNT = 5000;
const RADIUS = 520;
const HEIGHT = 90;

export type Star = {
  id: number;
  position: [number, number, number];
  scale: number;
};

function mulberry32(a: number) {
    return function() {
      var t = a += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

export const generateStars = (seed: string): Star[] => {
  const data: Star[] = [];
  const random = mulberry32(19);

  const arms = 4;
  const armSpread = 0.5;

  for (let i = 0; i < STAR_COUNT; i++) {
    const arm = Math.floor(random() * arms);
    const radius = Math.pow(random(), 0.5) * RADIUS;
    const spin = radius * 0.02;
    const baseAngle = (arm / arms) * Math.PI * 2;
    const angle = baseAngle + spin + (random() - 0.5) * armSpread;
    const height = (random() - 0.5) * HEIGHT;

    const x = Math.cos(angle) * radius;
    const y = height;
    const z = Math.sin(angle) * radius;

    const scale = random() * 0.7 + 0.2;

    data.push({
      id: i,
      position: [x, y, z],
      scale,
    });
  }

  return data;
};
'''