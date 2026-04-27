export type Star = {
  id: string;
  title?: string;
  label?: string;
  name?: string;
  position: [number, number, number];
  color?: string;
  size?: number;
  intensity?: number;
  description?: string;
  timestamp?: string | number;
  chapter?: string;
  mood?: string;
  significanceTier?: number;
  fadeWeight?: number;
  peripheralWeight?: number;
};

export type { LifeMapStar } from "./lifemapStar";
