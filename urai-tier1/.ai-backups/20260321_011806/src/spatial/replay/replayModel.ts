import type { SelectedStar } from "../state/selectedStarContract";
import { toCanonicalSelectedStar } from "../state/toCanonicalSelectedStar";

export type ReplayCard = {
  title: string;
  body: string;
};

export type ReplayModel = {
  accentColor: string;
  cards: ReplayCard[];
  keywords: string[];
};

export function buildReplayModel(selectedStar: SelectedStar): ReplayModel {
  const star = toCanonicalSelectedStar(selectedStar);

  const primaryTitle = star.title ?? star.label ?? "Memory";
  const primaryBody = star.label ?? "Selected memory";
  const secondaryTitle = star.signature ?? "Replay";
  const secondaryParts = [star.chapter, star.timeband].filter(Boolean);
  const secondaryBody = secondaryParts.length ? secondaryParts.join(" • ") : "Focused playback";
  const accentColor = star.color ?? "#ffffff";

  const keywords = [star.chapter, star.timeband, star.signature, ...(star.tags ?? [])]
    .filter(Boolean)
    .map((value) => String(value));

  return {
    accentColor,
    cards: [
      {
        title: primaryTitle,
        body: primaryBody,
      },
      {
        title: secondaryTitle,
        body: secondaryBody,
      },
    ],
    keywords,
  };
}

export function getReplayAccentColor(selectedStar: SelectedStar): string {
  return toCanonicalSelectedStar(selectedStar).color ?? "#ffffff";
}

export function getReplayKeywords(selectedStar: SelectedStar): string[] {
  const star = toCanonicalSelectedStar(selectedStar);
  return [star.chapter, star.timeband, star.signature, ...(star.tags ?? [])]
    .filter(Boolean)
    .map((value) => String(value));
}
