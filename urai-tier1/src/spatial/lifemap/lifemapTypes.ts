export type StarState = 'idle' | 'glowing' | 'active' | 'resolved';

export type MemoryEmotion =
  | 'calm'
  | 'joy'
  | 'grief'
  | 'focus'
  | 'threshold'
  | 'recovery'
  | 'dream'
  | 'mirror'
  | 'shadow';

export type ChapterId =
  | 'season-of-becoming'
  | 'threshold'
  | 'recovery-arc'
  | 'purple-dream-field'
  | 'mirror-of-becoming';

export type MemoryStar = {
  id: string;
  title: string;
  x: number;
  y: number;
  size: number;
  emotion: MemoryEmotion;
  chapterId: ChapterId;
  state: StarState;
  intensity: number;
  recency: number;
  unresolvedWeight: number;
  lastActivatedAt: number | null;
  narratorLine: string;
  connectedTo: string[];
};

export type LifeMapPhase = 'living' | 'focus' | 'cluster';
export type LifeMapCamera = { x: number; y: number; zoom: number };

export type MessagePriority = 'default' | 'glow' | 'cluster' | 'resolved' | 'focus';
export type MessageSource = 'default' | 'glow' | 'cluster' | 'resolved' | 'focus' | 'replay' | 'reflect' | 'escape';

export type ActiveMessage = {
  line: string;
  source: MessageSource;
  priority: MessagePriority;
  expiresAt: number | null;
};

export type LifeMapState = {
  stars: MemoryStar[];
  activeStarId: string | null;
  activeChapterId: ChapterId | null;
  camera: LifeMapCamera;
  activeMessage: ActiveMessage;
  phase: LifeMapPhase;
  reducedMotion: boolean;
};

export type LifeMapAction =
  | { type: 'SET_REDUCED_MOTION'; value: boolean }
  | { type: 'SET_GLOWING_STARS'; ids: string[] }
  | { type: 'FOCUS_STAR'; starId: string; now?: number }
  | { type: 'FOCUS_CLUSTER'; chapterId: ChapterId; camera: LifeMapCamera; companionLine: string; now?: number }
  | { type: 'MARK_RESOLVED'; starId: string; now?: number }
  | { type: 'SET_CAMERA'; camera: LifeMapCamera }
  | { type: 'CLEAR_FOCUS'; now?: number }
  | { type: 'UPSERT_MESSAGE'; line: string; source: MessageSource; priority: MessagePriority; ttlMs?: number | null; now?: number };
