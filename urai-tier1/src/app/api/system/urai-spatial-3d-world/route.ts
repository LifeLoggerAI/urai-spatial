import { NextResponse } from 'next/server';
import {
  URAI_CAMERA_PRESETS,
  URAI_SPATIAL_CONSTELLATION_PATHS_3D,
  URAI_SPATIAL_STARS_3D,
  assertUraiSpatial3DWorldModel,
} from '@/spatial/world/uraiSpatialWorldModel';
import { URAI_SPATIAL_TIER_LOCK_VERSION } from '@/components/lifemap/uraiSpatialTierLockContract';

export async function GET() {
  return NextResponse.json({
    ...assertUraiSpatial3DWorldModel(),
    lockVersion: URAI_SPATIAL_TIER_LOCK_VERSION,
    cameraPresets: URAI_CAMERA_PRESETS,
    starCount: URAI_SPATIAL_STARS_3D.length,
    pathCount: URAI_SPATIAL_CONSTELLATION_PATHS_3D.length,
    stars: URAI_SPATIAL_STARS_3D.map((star) => ({
      id: star.id,
      kind: star.kind,
      position: star.position,
      relatedStarIds: star.relatedStarIds,
    })),
    paths: URAI_SPATIAL_CONSTELLATION_PATHS_3D.map((path) => ({
      id: path.id,
      kind: path.kind,
      starIds: path.starIds,
      points: path.points,
    })),
  });
}
