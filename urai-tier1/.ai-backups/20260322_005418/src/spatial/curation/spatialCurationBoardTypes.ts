export type SpatialCurationBoardItemKind =
  | "bundle"
  | "star"
  | "memory"
  | "scene"
  | "note"
  | "deck"
  | "card"
  | "unknown";

export interface SpatialCurationBoardItem {
  id?: string;
  title?: string;
  label?: string;
  name?: string;
  kind?: SpatialCurationBoardItemKind | string;
  type?: string;
  description?: string;
  summary?: string;
  chapter?: string;
  chapterLabel?: string;
  chapterId?: string;
  timeband?: string;
  timestamp?: string;
  createdAt?: string;
  updatedAt?: string;
  source?: string;
  tags?: string[];
  starId?: string;
  memoryId?: string;
  bundleId?: string;
  score?: number;
  rank?: number;
  selected?: boolean;
  payload?: any;
  bundle?: any;
  note?: any;
  card?: any;
  [key: string]: any;
}

export interface SpatialCurationBoardState {
  items: SpatialCurationBoardItem[];
  selectedIds: string[];
  activeItemId: string | null;
  query?: string;
  filter?: string;
  mode?: string;
  status?: string;
  [key: string]: any;
}
