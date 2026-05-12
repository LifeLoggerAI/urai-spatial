import { doc, setDoc, writeBatch } from "firebase/firestore";
import { getFirebaseDb } from "./firebaseClient";
import { SPATIAL_COLLECTIONS } from "./firebaseSpatialSchema";
import { demoCompanionState, demoConstellationEdges, demoDreamMapNodes, demoEmotionalBiome, demoLegacyScroll, demoLifeMapNodes, demoMemoryStars, demoMoodForecast, demoRitualEvents, demoShadowRealmEvent, demoSpatialWorld, DEMO_USER_ID } from "@/lib/spatial/publicSafeSpatialData";

export async function seedSpatialDemoData(userId = DEMO_USER_ID) {
  const db = getFirebaseDb();
  const batch = writeBatch(db);
  batch.set(doc(db, SPATIAL_COLLECTIONS.spatialWorlds, userId), { ...demoSpatialWorld, userId });
  batch.set(doc(db, SPATIAL_COLLECTIONS.companionStates, "demo-companion-state"), { ...demoCompanionState, userId });
  batch.set(doc(db, SPATIAL_COLLECTIONS.emotionalBiomes, demoEmotionalBiome.id), { ...demoEmotionalBiome, userId });
  batch.set(doc(db, SPATIAL_COLLECTIONS.moodForecasts, demoMoodForecast.id), { ...demoMoodForecast, userId });
  batch.set(doc(db, SPATIAL_COLLECTIONS.legacyScrolls, demoLegacyScroll.id), { ...demoLegacyScroll, userId });
  batch.set(doc(db, SPATIAL_COLLECTIONS.shadowRealmEvents, demoShadowRealmEvent.id), { ...demoShadowRealmEvent, userId });
  demoLifeMapNodes.forEach(({ id, ...node }) => batch.set(doc(db, SPATIAL_COLLECTIONS.lifeMapNodes, id), { ...node, userId }));
  demoMemoryStars.forEach(({ id, ...star }) => batch.set(doc(db, SPATIAL_COLLECTIONS.memoryStars, id), { ...star, userId }));
  demoConstellationEdges.forEach(({ id, ...edge }) => batch.set(doc(db, SPATIAL_COLLECTIONS.constellationEdges, id), { ...edge, userId }));
  demoRitualEvents.forEach(({ id, ...ritual }) => batch.set(doc(db, SPATIAL_COLLECTIONS.ritualEvents, id), { ...ritual, userId }));
  demoDreamMapNodes.forEach(({ id, ...dream }) => batch.set(doc(db, SPATIAL_COLLECTIONS.dreamMapNodes, id), { ...dream, userId }));
  await batch.commit();
  await setDoc(doc(db, SPATIAL_COLLECTIONS.userWorldSettings, userId), { reducedMotion: false, audioEnabled: false, hapticsEnabled: false, visualIntensity: "medium", defaultRealm: "home", accessibilityLabels: true, updatedAt: demoSpatialWorld.updatedAt }, { merge: true });
  return { userId, seeded: true, nodes: demoLifeMapNodes.length, stars: demoMemoryStars.length };
}
