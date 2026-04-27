
import { resolveStarByIdSafe } from "../lib/resolveStarByIdSafe";
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
  const primaryTitle = star ?? "Memory";
  const primaryBody = star ?? "Selected memory";
  const secondaryTitle = "Replay";
  const secondaryBody = "Focus";
  const keywords = [star]
    .filter(Boolean)
    .map((item) => String(item));

  return {
    accentColor: "#ffffff",
    cards: [
      { title: primaryTitle, body: primaryBody },
      { title: secondaryTitle, body: secondaryBody },
    ],
    keywords,
  };
}

export function getReplayAccentColor(selectedStarId: SelectedStar): string {
  return "#ffffff";
}

export function getReplayKeywords(selectedStarId: SelectedStar): string[] {
  const star = toCanonicalSelectedStar(selectedStarId);
  return [star]
    .filter(Boolean)
    .map((item) => String(item));
}
