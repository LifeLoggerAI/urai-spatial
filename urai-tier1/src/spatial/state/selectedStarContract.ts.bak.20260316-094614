import type { SelectedStar } from "./sceneStore";

export type SelectedStarNormalized = {
  id: string;
  position: [number, number, number];
  color: string;
  size: number;
  title: string;
  label: string;
  summary: string;
  detail: string;
  transcript: string;
  signature: string;
  chapter: string;
  timeband: string;
  dateLabel: string;
  tags: string[];
};

export function normalizeSelectedStar(
  selectedStar: SelectedStar | null
): SelectedStarNormalized | null {
  if (!selectedStar) return null;

  return {
    id: selectedStar.id,
    position: selectedStar.position,
    color: selectedStar.color,
    size: selectedStar.size,
    title: selectedStar.title,
    label: selectedStar.label,
    summary: selectedStar.summary ?? selectedStar.label,
    detail: selectedStar.detail ?? selectedStar.summary ?? selectedStar.label,
    transcript:
      selectedStar.transcript ??
      selectedStar.detail ??
      selectedStar.summary ??
      selectedStar.label,
    signature: selectedStar.signature,
    chapter: selectedStar.chapter,
    timeband: selectedStar.timeband,
    dateLabel: selectedStar.dateLabel ?? selectedStar.timeband,
    tags:
      selectedStar.tags && selectedStar.tags.length > 0
        ? selectedStar.tags
        : [selectedStar.chapter, selectedStar.timeband, selectedStar.signature].filter(Boolean),
  };
}
