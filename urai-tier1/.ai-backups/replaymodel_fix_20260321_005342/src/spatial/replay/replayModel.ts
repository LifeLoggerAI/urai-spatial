import type { SelectedStar } from "../state/selectedStarContract";

export type ReplayStep = {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
};

export function buildReplaySteps(
  selectedStar: SelectedStar | null
): ReplayStep[] {
  if (!selectedStar) return [];

  return [
    {
      id: "memory",
      eyebrow: "Memory",
      title: selectedStar.title,
      body: selectedStar.label,
    },
    {
      id: "signature",
      eyebrow: "Signature",
      title: selectedStar.signature,
      body: `${selectedStar.chapter} • ${selectedStar.timeband}`,
    },
    {
      id: "return",
      eyebrow: "Return Vector",
      title: "Replay locked",
      body: "Esc or Back to Focus returns to the selected star.",
    },
  ];
}

export function getReplayGlow(selectedStar: SelectedStar | null) {
  return selectedStar?.color || "#ffffff";
}

export function getReplayMeta(selectedStar: SelectedStar | null) {
  if (!selectedStar) return [];
  return [
    selectedStar.chapter,
    selectedStar.timeband,
    selectedStar.signature,
  ];
}
