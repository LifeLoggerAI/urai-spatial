export interface SpatialMemory {
  id?: string;
  userId: string;
  position: { x: number; y: number; z: number };
  timestamp: number;
}
export interface ReplayEvent {
  id?: string;
  userId: string;
  type: string;
  data: any;
  timestamp: number;
}
