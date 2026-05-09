import type {
  HomeWorldState,
  LifeMapChapter,
  LifeMapEdge,
  LifeMapNode,
  LifeMapSeason,
  MirrorOfBecomingState,
  NarratorInsight,
  ReplayPath,
  UserSpatialPreferences,
} from './lifeMapTypes';

export const lifeMapFirestorePaths = {
  homeWorldState: (userId: string) => `users/${userId}/homeWorldState/current`,
  lifeMapNode: (userId: string, nodeId: string) => `users/${userId}/lifeMapNodes/${nodeId}`,
  lifeMapEdge: (userId: string, edgeId: string) => `users/${userId}/lifeMapEdges/${edgeId}`,
  lifeMapChapter: (userId: string, chapterId: string) => `users/${userId}/lifeMapChapters/${chapterId}`,
  lifeMapSeason: (userId: string, seasonId: string) => `users/${userId}/lifeMapSeasons/${seasonId}`,
  narratorInsight: (userId: string, insightId: string) => `users/${userId}/narratorInsights/${insightId}`,
  replayPath: (userId: string, pathId: string) => `users/${userId}/replayPaths/${pathId}`,
  mirrorState: (userId: string, stateId: string) => `users/${userId}/mirrorStates/${stateId}`,
  spatialPreferences: (userId: string) => `users/${userId}/spatialPreferences/current`,
} as const;

export type LifeMapFirestoreSeed = {
  homeWorldState: HomeWorldState;
  nodes: LifeMapNode[];
  edges: LifeMapEdge[];
  chapters: LifeMapChapter[];
  seasons: LifeMapSeason[];
  narratorInsights: NarratorInsight[];
  replayPaths: ReplayPath[];
  mirrorStates: MirrorOfBecomingState[];
  preferences: UserSpatialPreferences;
};

export const lifeMapFirestorePrivacyNotes = [
  'Do not store raw private text, exact conversations, raw audio, or clinical inference in public UI fields.',
  'sourceSignals must remain abstracted categories such as rhythm-shift or social-frequency.',
  'privacyLevel controls display depth: publicSafe, privateSummary, privateDetail, hidden.',
  'Users must be able to hide node types and individual nodes.',
  'Narrator copy must avoid diagnosis, shame, medical claims, or crisis overclaiming.',
];

export const exampleLifeMapNodeDocument = {
  id: 'quiet-reset',
  type: 'memory',
  title: 'The Quiet Reset',
  subtitle: 'A softer evening after overload',
  timestamp: '2026-01-04T20:15:00.000Z',
  emotionalTone: 'calm',
  emotionalIntensity: 0.54,
  importance: 0.7,
  unresolvedness: 0.18,
  position: { x: -22, y: 8, z: 12 },
  color: '#8fdcff',
  auraColor: '#bfefff',
  glyph: '◌',
  relatedNodeIds: ['small-morning-win', 'first-signal-recovery'],
  privacyLevel: 'publicSafe',
  sourceSignals: ['rhythm-shift', 'low-friction-evening'],
};

export const exampleSpatialPreferencesDocument = {
  motionMode: 'full',
  highContrast: false,
  hiddenNodeTypes: [],
  showNarratorCaptions: true,
  showWhyThis: true,
  allowHaptics: false,
  defaultPrivacyLevel: 'privateSummary',
};
