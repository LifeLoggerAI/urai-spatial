export type SpatialPhase = "home" | "lifemap" | "focus" | "replay";

export const PRIMARY_STAR_DEPTH = {
  baseRadius: 0.22,
  zMin: -34,
  zMax: -8,
};

export const STARFIELD_DEPTH_BANDS = [
  {
    count: 120,
    spreadX: 20,
    spreadY: 12,
    zMin: -34,
    zMax: -8,
    pointSize: 0.012,
    opacity: 0.25,
    parallax: 0.05,
    drift: 0.05,
  },
  {
    count: 90,
    spreadX: 16,
    spreadY: 10,
    zMin: -34,
    zMax: -8,
    pointSize: 0.016,
    opacity: 0.35,
    parallax: 0.12,
    drift: 0.08,
  },
  {
    count: 60,
    spreadX: 12,
    spreadY: 8,
    zMin: -34,
    zMax: -8,
    pointSize: 0.022,
    opacity: 0.5,
    parallax: 0.2,
    drift: 0.12,
  },
];

export const STARFIELD_IDLE = {
  xAmp: 0.2,
  yAmp: 0.25,
  zAmp: 0.15,
};

export const STARFIELD_PHASE_ALPHA: Record<SpatialPhase, number> = {
  home: 0.0,
  lifemap: 1.0,
  focus: 0.9,
  replay: 0.7,
};
