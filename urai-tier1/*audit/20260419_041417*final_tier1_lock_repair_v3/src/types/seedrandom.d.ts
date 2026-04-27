declare module "seedrandom" {
  type SeedRandom = () => number;
  export default function seedrandom(seed?: string): SeedRandom;
}
