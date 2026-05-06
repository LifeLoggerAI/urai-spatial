export type AnchorLabel =
  | "that night"
  | "that morning"
  | "that afternoon"
  | "that evening"
  | "when things shifted"
  | "the first return"
  | "the recovery thread"
  | "the heavy loop"
  | "the quiet opening";

export type MemoryAnchor = {
  id: string;
  label: AnchorLabel;
  starId: string;
  title: string | null;
  tone: string;
  weight: string;
  createdAt: number;
  lastSeenAt: number;
  visits: number;
};

export type AnchorStore = Record<string, MemoryAnchor>;

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function timeOfDayLabel(timestamp: number): AnchorLabel {
  const hour = new Date(timestamp).getHours();
  if (hour < 5) return "that night";
  if (hour < 12) return "that morning";
  if (hour < 17) return "that afternoon";
  if (hour < 21) return "that evening";
  return "that night";
}

export function calendarTimeLabel(timestamp: number, nowMs = Date.now()) {
  const then = new Date(timestamp);
  const now = new Date(nowMs);
  const diffMs = Math.max(0, nowMs - timestamp);
  const dayMs = 86_400_000;

  if (diffMs < 60_000) return "a moment ago";
  if (diffMs < 3_600_000) {
    const minutes = Math.floor(diffMs / 60_000);
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }
  if (diffMs < dayMs) {
    const hours = Math.floor(diffMs / 3_600_000);
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }
  if (diffMs < dayMs * 2) return "yesterday";
  if (diffMs < dayMs * 7) {
    const days = Math.floor(diffMs / dayMs);
    return `${days} days ago`;
  }

  const sameYear = then.getFullYear() === now.getFullYear();
  const monthName = MONTHS[then.getMonth()];
  const monthDelta = (now.getFullYear() - then.getFullYear()) * 12 + now.getMonth() - then.getMonth();

  if (monthDelta === 1) return `last ${monthName}`;
  if (sameYear) return `this past ${monthName}`;
  return `${monthName} ${then.getFullYear()}`;
}

export function chooseAnchorLabel(args: {
  visits: number;
  tone: string;
  weight: string;
  recoveryArc: boolean;
  strainArc: boolean;
  looped: boolean;
  timestamp: number;
}): AnchorLabel {
  if (args.recoveryArc) return "the recovery thread";
  if (args.strainArc || args.weight === "threshold") return "when things shifted";
  if (args.looped) return "the heavy loop";
  if (args.visits === 1) return "the first return";
  if (args.tone === "calm" || args.tone === "awe") return "the quiet opening";
  return timeOfDayLabel(args.timestamp);
}

export function upsertMemoryAnchor(args: {
  store: AnchorStore;
  starId: string;
  title?: string | null;
  tone: string;
  weight: string;
  visits: number;
  recoveryArc: boolean;
  strainArc: boolean;
  looped: boolean;
  timestamp?: number;
}) {
  const t = args.timestamp ?? Date.now();
  const existing = args.store[args.starId];
  const label = existing?.label ?? chooseAnchorLabel({
    visits: args.visits,
    tone: args.tone,
    weight: args.weight,
    recoveryArc: args.recoveryArc,
    strainArc: args.strainArc,
    looped: args.looped,
    timestamp: t,
  });

  const anchor: MemoryAnchor = {
    id: existing?.id ?? `anchor:${args.starId}`,
    label,
    starId: args.starId,
    title: args.title ?? existing?.title ?? null,
    tone: args.tone,
    weight: args.weight,
    createdAt: existing?.createdAt ?? t,
    lastSeenAt: t,
    visits: (existing?.visits ?? 0) + 1,
  };

  return {
    ...args.store,
    [args.starId]: anchor,
  };
}

export function anchorCallback(anchor: MemoryAnchor | null | undefined, nowMs = Date.now()) {
  if (!anchor) return "";
  const calendar = calendarTimeLabel(anchor.createdAt, nowMs);
  if (anchor.visits <= 1) return `this may become ${anchor.label}. `;
  return `this remembers ${anchor.label} from ${calendar}. `;
}
