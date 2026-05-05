import type { ChapterId, MemoryEmotion, MemoryStar } from './lifemapTypes';

export const CHAPTERS: Array<{ id: ChapterId; title: string; subtitle: string }> = [
  { id: 'season-of-becoming', title: 'The Season of Becoming', subtitle: 'memory / calm / clarity' },
  { id: 'threshold', title: 'The Threshold', subtitle: 'conflict / shadow / pain' },
  { id: 'recovery-arc', title: 'The Recovery Arc', subtitle: 'recovery / growth / purpose' },
  { id: 'purple-dream-field', title: 'The Purple Dream Field', subtitle: 'dream / mystery / milestone' },
  { id: 'mirror-of-becoming', title: 'Mirror of Becoming', subtitle: 'rebirth / clarity / purpose' },
];

export const CHAPTER_LINES: Record<ChapterId, string> = {
  threshold: 'The threshold is where the pattern became visible.',
  'recovery-arc': 'The recovery arc is still growing.',
  'mirror-of-becoming': 'The mirror is showing who you are becoming.',
  'season-of-becoming': 'This season is asking to be understood.',
  'purple-dream-field': 'The dream field is speaking in symbols.',
};

export const GLOW_LINES = [
  'Something is asking to be seen.',
  'This memory is carrying weight.',
  'A pattern is lighting up.',
  'This moment connects to something older.',
];

const RAW_STARS: Array<[string, number, number, ChapterId, MemoryEmotion]> = [
  ['M', 16, 22, 'season-of-becoming', 'calm'],
  ['D', 28, 19, 'season-of-becoming', 'joy'],
  ['I', 22, 34, 'season-of-becoming', 'focus'],
  ['S', 37, 30, 'threshold', 'shadow'],
  ['R', 48, 24, 'threshold', 'grief'],
  ['T', 56, 31, 'threshold', 'threshold'],
  ['E', 65, 20, 'recovery-arc', 'recovery'],
  ['L', 72, 28, 'recovery-arc', 'focus'],
  ['V', 79, 37, 'recovery-arc', 'joy'],
  ['H', 68, 44, 'purple-dream-field', 'dream'],
  ['A', 58, 47, 'purple-dream-field', 'mirror'],
  ['N', 46, 43, 'purple-dream-field', 'dream'],
  ['K', 34, 45, 'threshold', 'shadow'],
  ['P', 24, 50, 'season-of-becoming', 'calm'],
  ['O', 14, 43, 'season-of-becoming', 'focus'],
  ['Y', 19, 63, 'mirror-of-becoming', 'mirror'],
  ['C', 31, 68, 'mirror-of-becoming', 'recovery'],
  ['B', 44, 66, 'mirror-of-becoming', 'joy'],
  ['F', 56, 63, 'mirror-of-becoming', 'focus'],
  ['G', 67, 66, 'mirror-of-becoming', 'mirror'],
  ['Q', 79, 61, 'recovery-arc', 'recovery'],
  ['U', 87, 50, 'recovery-arc', 'focus'],
  ['W', 86, 33, 'purple-dream-field', 'dream'],
  ['J', 10, 58, 'threshold', 'grief'],
];

export const INITIAL_STARS: MemoryStar[] = RAW_STARS.map((s, idx, arr) => ({
  id: `star-${s[0]}-${idx}`,
  title: String(s[0]),
  x: Number(s[1]),
  y: Number(s[2]),
  chapterId: s[3],
  emotion: s[4],
  size: 16 + (idx % 5),
  state: 'idle',
  intensity: 0.4 + ((idx * 7) % 6) / 10,
  recency: 0.3 + ((idx * 3) % 7) / 10,
  unresolvedWeight: 0.2 + ((idx * 5) % 8) / 10,
  lastActivatedAt: null,
  narratorLine: `${s[0]} carries a thread that still matters.`,
  connectedTo: [arr[(idx + 1) % arr.length][0], arr[(idx + 5) % arr.length][0]].map(
    (letter) => `star-${letter}-${arr.findIndex((x) => x[0] === letter)}`,
  ),
}));
