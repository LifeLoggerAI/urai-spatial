
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

/**
 * Publishes a scene, making it and all its contents publicly accessible.
 * This function is idempotent. It increments a reference counter on each asset
 * to track how many published scenes it belongs to.
 */
export const publishScene = onCall({ region: "us-central1" }, async (req) => {
  if (!req.auth) {
    throw new HttpsError("unauthenticated", "Authentication is required.");
  }

  const isAdmin = (req.auth.token as any).admin === true;
  if (!isAdmin) {
    throw new HttpsError("permission-denied", "Only administrators can publish scenes.");
  }

  const { sceneId } = req.data;
  if (typeof sceneId !== "string" || !sceneId) {
    throw new HttpsError("invalid-argument", "sceneId must be a non-empty string.");
  }

  const sceneRef = db.collection("scenes").doc(sceneId);

  try {
    // Use a transaction to ensure atomicity, especially for the reference counters.
    await db.runTransaction(async (transaction) => {
      const sceneSnap = await transaction.get(sceneRef);
      if (!sceneSnap.exists) {
        throw new HttpsError("not-found", `Scene with ID ${sceneId} not found.`);
      }

      // If scene is already published, do nothing. This makes the function idempotent.
      if (sceneSnap.data()?.status === "published") {
        return;
      }

      const entitiesSnap = await db.collection("entities").where("sceneId", "==", sceneId).get();
      const anchorsSnap = await db.collection("anchors").where("sceneId", "==", sceneId).get();

      const assetIds = new Set<string>();
      entitiesSnap.forEach((doc) => {
        const entity = doc.data();
        if (entity.assetId) {
          assetIds.add(entity.assetId);
        }
      });

      // Increment the public reference counter for each asset.
      assetIds.forEach((assetId) => {
        const assetRef = db.collection("assets").doc(assetId);
        transaction.update(assetRef, {
          publicSceneCount: admin.firestore.FieldValue.increment(1),
        });
      });

      entitiesSnap.forEach((doc) => {
        transaction.update(doc.ref, { sceneIsPublished: true });
      });

      anchorsSnap.forEach((doc) => {
        transaction.update(doc.ref, { sceneIsPublished: true });
      });

      transaction.update(sceneRef, {
        status: "published",
        publishedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    // Audit log entry is created outside the transaction.
    await db.collection("auditLogs").add({
      uid: req.auth.uid,
      ts: admin.firestore.FieldValue.serverTimestamp(),
      action: "publishScene",
      resource: sceneRef.path,
      meta: { sceneId },
    });

    return { success: true, sceneId };
  } catch (error) {
    if (error instanceof HttpsError) {
      throw error;
    }
    console.error(`Failed to publish scene ${sceneId}:`, error);
    throw new HttpsError("internal", "An unexpected error occurred while publishing the scene.");
  }
});
