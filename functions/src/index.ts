import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions/v2/https';

admin.initializeApp();
const db = admin.firestore();

const rateLimit = new Map<string, number>();

function allow(key: string) {
  const now = Date.now();
  const last = rateLimit.get(key) ?? 0;
  if (now - last < 1000) return false;
  rateLimit.set(key, now);
  return true;
}

export const seedSpatialDemoData = functions.onCall(async (req) => {
  if (!req.auth?.token?.email?.endsWith('@urai.app')) {
    throw new functions.HttpsError('permission-denied', 'admin only');
  }
  await db.collection('spatialScenes').doc('lifeMap').set({
    name: 'Life Map Demo',
    type: 'lifeMap',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return { ok: true };
});

export const logSpatialEvent = functions.onCall(async (req) => {
  if (!allow(req.auth?.uid ?? 'anon')) {
    throw new functions.HttpsError('resource-exhausted', 'rate limit');
  }
  await db.collection('spatialAuditLogs').add({
    ts: admin.firestore.FieldValue.serverTimestamp(),
    uid: req.auth?.uid ?? null,
    action: req.data.action,
    resource: req.data.resource,
  });
  return { ok: true };
});
