
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { logger } from "firebase-functions";

const db = admin.firestore();

// A simple in-memory cache for cluster results
const clusterCache = new Map<string, any>();

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function calculateAndCacheClusters(uid: string): Promise<any> {
  const cached = clusterCache.get(uid);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return cached.data;
  }

  try {
    const snapshot = await db.collection("lifemapStars").where("userId", "==", uid).get();
    const stars = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Placeholder for a real clustering algorithm (e.g., k-means)
    // For now, we'll just group by year
    const clusters = stars.reduce((acc, star) => {
      const year = String(star.year);
      if (!acc[year]) {
        acc[year] = [];
      }
      acc[year].push(star.id);
      return acc;
    }, {} as Record<string, string[]>);

    const clusterData = { clusters, generatedAt: admin.firestore.FieldValue.serverTimestamp() };

    // Save to Firestore and update in-memory cache
    await db.collection("lifemapClusters").doc(uid).set(clusterData);
    clusterCache.set(uid, { data: clusterData, timestamp: Date.now() });

    return clusterData;
  } catch (error) {
    logger.error("Error calculating clusters:", error);
    throw new HttpsError("internal", "An internal error occurred while calculating clusters.");
  }
}

export const getClusters = onCall({ region: "us-central1" }, async (req) => {
  if (!req.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const uid = req.auth.uid;
  return await calculateAndCacheClusters(uid);
});
