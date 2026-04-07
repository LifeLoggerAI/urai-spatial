export type Star = {
  id: string;
  significanceTier: 'dominant' | 'secondary' | 'outlier' | 'peripheral';
  clusterId: string;
  relationIds: string[];
  thresholdOutlier: boolean;
  replayEligible: boolean;
  narratorEligible: boolean;
  fadeWeight: number;
  peripheralWeight: number;
  name: string;
  ra: number;
  dec: number;
  dist: number;
  mass: number;
  radius: number;
  color: string;
};
