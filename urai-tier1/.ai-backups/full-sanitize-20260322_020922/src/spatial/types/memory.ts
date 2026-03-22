export type MemoryNode = {
  id: string;
  title: string;
  summary: string;
  chapter: string;
  timeband: string;
  label: string;
  color: string;
  timestamp: string;
  tags: string[];
};

export type ReplayScene = {
  id: string;
  memoryId: string;
  title: string;
  narration?: string;
  beats: string[];
};
