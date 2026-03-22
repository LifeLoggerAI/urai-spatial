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

export function buildReplayModel(selectedStarId: SelectedStar): ReplayModel {
  const star = toCanonicalSelectedStar(selectedStarId);
  const primaryTitle = star.title ?? star.label ?? "Memory";
  const primaryBody = star.label ?? "Selected memory";
  const secondaryTitle = star.signature ?? "Replay";
  const secondaryBody = [star.chapter, star.timeband].filter(Boolean).join(" • ") || "Focused playback";
  const keywords = [star.chapter, star.timeband, star.signature, ...star.tags]
    .filter(Boolean)
    .map((item) => String(item));

  return {
    accentColor: star.color ?? "#ffffff",
    cards: [
      { title: primaryTitle, body: primaryBody },
      { title: secondaryTitle, body: secondaryBody },
    ],
    keywords,
  };
}

export function getReplayAccentColor(selectedStarId: SelectedStar): string {
  return toCanonicalSelectedStar(selectedStarId).color ?? "#ffffff";
}

export function getReplayKeywords(selectedStarId: SelectedStar): string[] {
  const star = toCanonicalSelectedStar(selectedStarId);
  return [star.chapter, star.timeband, star.signature, ...star.tags]
    .filter(Boolean)
    .map((item) => String(item));
}
