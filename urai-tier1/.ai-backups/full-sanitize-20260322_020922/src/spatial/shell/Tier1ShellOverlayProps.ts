export type Tier1ShellMode = "home" | "sky" | "lifemap" | "focus" | "replay";

export type Tier1ShellSelected = {
  title: string;
  chapter: string;
  domain: string;
  summary: string;
  tags: readonly string[];
  [key: string]: unknown;
};

export type Tier1ShellOverlayProps = {
  mode: Tier1ShellMode;
  uiLocked: boolean;
  showMapWorld: boolean;
  selectedId: string;
  transitioning: boolean;
  selected: Tier1ShellSelected;
  enterLifeMap: () => void;
  returnHome: () => void;
  enterReplay: () => void;
  clearFocus: () => void;
  exitReplay: () => void;
  pillLabel: (mode: Tier1ShellMode) => string;
};
