export type MemoryNode = {
  id: string;
  position: [number, number, number];
  color: string;
  intensity: number;
};

const randomInSphere = (radius: number): [number, number, number] => {
    const x = Math.random() - 0.5;
    const y = Math.random() - 0.5;
    const z = Math.random() - 0.5;
    const d = Math.random() * radius;
    const len = Math.sqrt(x*x + y*y + z*z);
    return [d * x / len, d * y / len, d * z / len];
}

const colors = ['#ffaaaa', '#aaffaa', '#aaaaff', '#ffffaa', '#aaffff', '#ffaaff'];

export const mockMemoryNodes: MemoryNode[] = Array.from({ length: 100 }, (_, i) => ({
  id: `${i}`,
  position: randomInSphere(50),
  color: colors[i % colors.length],
  intensity: Math.random() * 0.5 + 0.5,
}));
