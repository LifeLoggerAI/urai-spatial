export type Tier1Phase = "home" | "sky" | "lifemap" | "focus" | "replay";

export const SKY_HOLD_MS = 700;
export const RETURN_STEP_MS = 420;
export const DEFAULT_MAP_DWELL_MS = 1100;
export const DIVE_PULSE_MS = 520;

export const SIDE_DOCK_CLASS =
  "pointer-events-auto fixed right-6 top-1/2 z-[80] w-[min(360px,calc(100vw-2.5rem))] -translate-y-1/2";

export const BOTTOM_DOCK_CLASS =
  "pointer-events-auto fixed bottom-6 left-1/2 z-[80] w-[min(760px,calc(100vw-2.5rem))] -translate-x-1/2";

export const PANEL_CLASS =
  "rounded-[28px] border border-white/10 bg-slate-950/52 px-4 py-4 text-white shadow-[0_24px_80px_rgba(0,0,0,0.38)] backdrop-blur-xl";

export const PANEL_STRONG_CLASS =
  "rounded-[28px] border border-white/12 bg-slate-950/66 px-4 py-4 text-white shadow-[0_24px_80px_rgba(0,0,0,0.42)] backdrop-blur-xl";

export const HUD_TAG_CLASS =
  "inline-flex items-center rounded-full border border-white/12 bg-black/28 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-200 backdrop-blur-md";

export const TITLE_CLASS =
  "text-lg font-semibold tracking-tight text-white";

export const MICRO_LABEL_CLASS =
  "text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400";

export const BODY_TEXT_CLASS =
  "text-sm leading-6 text-slate-300";

export const PRIMARY_BUTTON_CLASS =
  "inline-flex items-center justify-center rounded-2xl border border-cyan-300/24 bg-cyan-400/12 px-3 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-400/18";

export const SECONDARY_BUTTON_CLASS =
  "inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/6 px-3 py-2 text-sm font-medium text-slate-100 transition hover:bg-white/10";

export const GHOST_BUTTON_CLASS =
  "inline-flex items-center justify-center rounded-2xl border border-white/8 bg-transparent px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/6";
