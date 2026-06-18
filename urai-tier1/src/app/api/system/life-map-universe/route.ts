import { NextResponse } from 'next/server';
import { URAI_SPATIAL_TIER_LOCK_VERSION } from '@/components/lifemap/uraiSpatialTierLockContract';
import {
  LIFE_MAP_FIRESTORE_COLLECTION_PATHS,
  LIFE_MAP_UNIVERSE_EDGES,
  LIFE_MAP_UNIVERSE_NODES,
} from '@/spatial/lifemap/lifeMapUniverseData';

export const dynamic = 'force-static';
export const revalidate = false;

const NODE_TYPES = Array.from(new Set(LIFE_MAP_UNIVERSE_NODES.map((node) => node.type))).sort();
const EMOTIONAL_TONES = Array.from(new Set(LIFE_MAP_UNIVERSE_NODES.map((node) => node.emotionalTone))).sort();
const REPLAYABLE_NODE_IDS = LIFE_MAP_UNIVERSE_NODES.filter((node) => node.replayAvailable && !node.locked).map((node) => node.id);
const LOCKED_NODE_IDS = LIFE_MAP_UNIVERSE_NODES.filter((node) => node.locked).map((node) => node.id);
const SAFE_NODES = LIFE_MAP_UNIVERSE_NODES.map((node) => ({
  id: node.id,
  type: node.type,
  title: node.title,
  subtitle: node.subtitle,
  dateLabel: node.dateLabel,
  emotionalTone: node.emotionalTone,
  emotionalIntensity: node.emotionalIntensity,
  importance: node.importance,
  unresolvedness: node.unresolvedness,
  position: node.position,
  color: node.color,
  auraColor: node.auraColor,
  size: node.size,
  pulseSpeed: node.pulseSpeed,
  glyph: node.glyph,
  relatedNodeIds: node.relatedNodeIds,
  connectedTo: node.connectedTo,
  replayAvailable: node.replayAvailable,
  locked: node.locked,
  narratorLine: node.narratorLine,
  whyThis: node.whyThis,
  privacyLevel: node.privacyLevel,
  sourceSignals: node.sourceSignals,
}));

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'urai-spatial-life-map-universe',
    lockVersion: URAI_SPATIAL_TIER_LOCK_VERSION,
    privacyMode: 'demo-safe-fallback',
    nodeCount: LIFE_MAP_UNIVERSE_NODES.length,
    edgeCount: LIFE_MAP_UNIVERSE_EDGES.length,
    firestorePaths: LIFE_MAP_FIRESTORE_COLLECTION_PATHS,
    nodeTypes: NODE_TYPES,
    emotionalTones: EMOTIONAL_TONES,
    replayableNodeIds: REPLAYABLE_NODE_IDS,
    lockedNodeIds: LOCKED_NODE_IDS,
    nodes: SAFE_NODES,
    edges: LIFE_MAP_UNIVERSE_EDGES,
  });
}
