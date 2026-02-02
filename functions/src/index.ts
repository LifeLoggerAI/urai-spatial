import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import { z } from "zod";

admin.initializeApp();
const db = admin.firestore();

const nowTs = () => admin.firestore.Timestamp.now();

function assertAuthed(req: any) {
  if (!req.auth?.uid) throw new HttpsError("unauthenticated", "Auth required.");
  return req.auth.uid as string;
}

async function isSpatialAdmin(uid: string): Promise<boolean> {
  const u = await db.doc(`users/${uid}`).get();
  return !!u.exists && !!u.data()?.roles?.spatialAdmin;
}

const CreateWorldInput = z.object({
  name: z.string().min(1).max(80),
  visibility: z.enum(["private", "public", "unlisted"]).default("private")
});

export const createWorld = onCall({ cors: true }, async (req) => {
  const uid = assertAuthed(req);
  const input = CreateWorldInput.parse(req.data);

  const ref = db.collection("worlds").doc();
  await ref.set({
    ownerId: uid,
    name: input.name,
    visibility: input.visibility,
    createdAt: nowTs(),
    updatedAt: nowTs(),
    version: 1
  });

  return { worldId: ref.id };
});

const RequestScanSessionInput = z.object({
  worldId: z.string().min(8).max(128),
  scanOptIn: z.boolean()
});

export const requestScanSession = onCall({ cors: true }, async (req) => {
  const uid = assertAuthed(req);
  const input = RequestScanSessionInput.parse(req.data);

  const world = await db.doc(`worlds/${input.worldId}`).get();
  if (!world.exists) throw new HttpsError("not-found", "World not found.");
  if (world.data()?.ownerId !== uid) throw new HttpsError("permission-denied", "Not owner.");

  const ref = db.collection("spatialSessions").doc();
  await ref.set({
    ownerId: uid,
    worldId: input.worldId,
    scanOptIn: input.scanOptIn,
    status: "active",
    createdAt: nowTs(),
    updatedAt: nowTs()
  });

  return { sessionId: ref.id, scanOptIn: input.scanOptIn };
});

// Publish assets via admin-only callable.
// (Pipeline should upload to Storage out-of-band, then register here.)
const PublishAssetInput = z.object({
  type: z.string().min(2).max(32),              // glb, hdr, etc
  sha256: z.string().min(16).max(128),
  storagePath: z.string().min(5).max(512),      // spatial/published/assets/<sha256>.glb
  bytes: z.number().int().nonnegative(),
  meta: z.record(z.any()).optional()
});

export const publishAsset = onCall({ cors: true }, async (req) => {
  const uid = assertAuthed(req);
  if (!(await isSpatialAdmin(uid))) throw new HttpsError("permission-denied", "Spatial admin required.");

  const input = PublishAssetInput.parse(req.data);

  const id = input.sha256.slice(0, 48);
  const ref = db.doc(`assets/${id}`);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists) {
      // idempotent
      tx.update(ref, {
        updatedAt: nowTs(),
        lastSeenBytes: input.bytes,
        lastSeenStoragePath: input.storagePath
      });
      return;
    }
    tx.set(ref, {
      type: input.type,
      sha256: input.sha256,
      storagePath: input.storagePath,
      bytes: input.bytes,
      meta: input.meta ?? {},
      createdAt: nowTs(),
      createdBy: uid,
      updatedAt: nowTs()
    });
  });

  return { assetId: id };
});

const FinalizeBuildInput = z.object({
  platform: z.string().min(2).max(32),           // webxr, quest, visionos...
  manifestSha256: z.string().min(16).max(128),
  storagePath: z.string().min(5).max(512)        // spatial/builds/<platform>/<manifestSha256>.json
});

export const finalizeBuild = onCall({ cors: true }, async (req) => {
  const uid = assertAuthed(req);
  if (!(await isSpatialAdmin(uid))) throw new HttpsError("permission-denied", "Spatial admin required.");

  const input = FinalizeBuildInput.parse(req.data);
  const buildId = `${input.platform}-${input.manifestSha256.slice(0, 24)}`;
  const ref = db.doc(`builds/${buildId}`);

  await ref.set({
    platform: input.platform,
    manifestSha256: input.manifestSha256,
    storagePath: input.storagePath,
    createdAt: nowTs(),
    createdBy: uid,
    updatedAt: nowTs(),
    status: "ready"
  }, { merge: true });

  return { buildId };
});

// Auto-maintain updatedAt on worlds/scenes/entities/anchors/sessions
export const onWorldWrite = onDocumentUpdated("worlds/{worldId}", async (e) => {
  await e.data.after.ref.update({ updatedAt: nowTs() });
});

export const onSessionWrite = onDocumentUpdated("spatialSessions/{sessionId}", async (e) => {
  await e.data.after.ref.update({ updatedAt: nowTs() });
});

export const onAnchorCreate = onDocumentCreated("worlds/{worldId}/anchors/{anchorId}", async (e) => {
  // server-side normalization hook (privacy-first): ensure no disallowed fields slip in.
  const d = e.data?.data() || {};
  const forbidden = ["rawFrame","rawFrames","cameraFrame","cameraFrames","video","audio","base64","frameBytes","imageBytes","pixels"];
  for (const k of forbidden) {
    if (k in d) {
      await e.data.ref.delete();
      return;
    }
  }
});
