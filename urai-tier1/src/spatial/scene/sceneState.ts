export type ScenePhase =
  | "home"
  | "enter_init"
  | "enter_ascent"
  | "enter_separation"
  | "enter_arrival"
  | "lifemap"
  | "focus_lock"
  | "focus_travel"
  | "focus_arrive"
  | "replay"
  | "return_from_replay"
  | "return_to_lifemap"
  | "return_home_descent"
  | "return_home_settle";

export type Vec3 = [number, number, number];

export type CameraPose = {
  position: Vec3;
  target: Vec3;
};

export type StarPoint = {
  id: string;
  position: Vec3;
  importance: number;
  band: "foreground" | "mid" | "background";
  radius: number;
  alpha: number;
  clickable: boolean;
};

export const DURATIONS: Record<ScenePhase, number> = {
  home: 0,
  enter_init: 650,
  enter_ascent: 1800,
  enter_separation: 1350,
  enter_arrival: 1500,
  lifemap: 0,
  focus_lock: 380,
  focus_travel: 1650,
  focus_arrive: 900,
  replay: 0,
  return_from_replay: 900,
  return_to_lifemap: 1200,
  return_home_descent: 3100,
  return_home_settle: 950,
};

export const HOME_POSE: CameraPose = {
  position: [0, 1.62, 6.8],
  target: [0, 0.35, -9.5],
};

export const ENTER_INIT_POSE: CameraPose = {
  position: [0, 1.86, 5.9],
  target: [0, 1.6, -17],
};

export const ENTER_ASCENT_POSE: CameraPose = {
  position: [0, 3.8, 0.8],
  target: [0, 4.9, -28],
};

export const ENTER_SEPARATION_POSE: CameraPose = {
  position: [0, 7.2, -10.5],
  target: [0, 7.9, -48],
};

export const LIFEMAP_POSE: CameraPose = {
  position: [0, 9.0, -22.0],
  target: [0, 9.2, -66.0],
};

export const PHASE_ORDER: ScenePhase[] = [
  "home",
  "enter_init",
  "enter_ascent",
  "enter_separation",
  "enter_arrival",
  "lifemap",
  "focus_lock",
  "focus_travel",
  "focus_arrive",
  "replay",
  "return_from_replay",
  "return_to_lifemap",
  "return_home_descent",
  "return_home_settle",
];

export function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

export function easeInOutCubic(t: number) {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

export function easeOutQuart(t: number) {
  const x = clamp01(t);
  return 1 - Math.pow(1 - x, 4);
}

export function easeOutQuad(t: number) {
  const x = clamp01(t);
  return 1 - (1 - x) * (1 - x);
}

export function easeInOutQuint(t: number) {
  const x = clamp01(t);
  return x * x * x * (x * (6 * x - 15) + 10);
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function mixVec3(a: Vec3, b: Vec3, t: number): Vec3 {
  return [
    lerp(a[0], b[0], t),
    lerp(a[1], b[1], t),
    lerp(a[2], b[2], t),
  ];
}

export function vec3Sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

export function vec3Add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export function vec3Scale(a: Vec3, s: number): Vec3 {
  return [a[0] * s, a[1] * s, a[2] * s];
}

export function vec3Length(a: Vec3) {
  return Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]);
}

export function vec3Normalize(a: Vec3): Vec3 {
  const len = vec3Length(a) || 1;
  return [a[0] / len, a[1] / len, a[2] / len];
}

export function computeFocusPoses(star: Vec3): {
  lock: CameraPose;
  travel: CameraPose;
  arrive: CameraPose;
} {
  const c0 = LIFEMAP_POSE.position;
  const d = vec3Normalize(vec3Sub(star, c0));

  const focusDistance = 4.8;
  const focusLift = 0.18;

  const travelPos = vec3Add(
    vec3Add(star, vec3Scale(d, -focusDistance)),
    [0, focusLift, 0]
  );
  const travelTarget: Vec3 = [star[0], star[1], star[2] - 0.35];

  const arrivePos = vec3Add(
    vec3Add(star, vec3Scale(d, -2.2)),
    [0, 0.1, 0]
  );
  const arriveTarget: Vec3 = [star[0], star[1], star[2]];

  const lockPos = LIFEMAP_POSE.position;
  const lockTarget = mixVec3(LIFEMAP_POSE.target, travelTarget, 0.12);

  return {
    lock: { position: lockPos, target: lockTarget },
    travel: { position: travelPos, target: travelTarget },
    arrive: { position: arrivePos, target: arriveTarget },
  };
}

export function isHomeFamily(phase: ScenePhase) {
  return (
    phase === "home" ||
    phase === "enter_init" ||
    phase === "enter_ascent" ||
    phase === "enter_separation" ||
    phase === "return_home_descent" ||
    phase === "return_home_settle"
  );
}

export function isLifemapFamily(phase: ScenePhase) {
  return (
    phase === "enter_arrival" ||
    phase === "lifemap" ||
    phase === "focus_lock" ||
    phase === "focus_travel" ||
    phase === "focus_arrive" ||
    phase === "replay" ||
    phase === "return_from_replay" ||
    phase === "return_to_lifemap" ||
    phase === "return_home_descent"
  );
}
