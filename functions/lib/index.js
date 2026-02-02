"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.onAnchorCreate = exports.onSessionWrite = exports.onWorldWrite = exports.finalizeBuild = exports.publishAsset = exports.requestScanSession = exports.createWorld = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = __importStar(require("firebase-admin"));
const zod_1 = require("zod");
admin.initializeApp();
const db = admin.firestore();
const nowTs = () => admin.firestore.Timestamp.now();
function assertAuthed(req) {
    if (!req.auth?.uid)
        throw new https_1.HttpsError("unauthenticated", "Auth required.");
    return req.auth.uid;
}
async function isSpatialAdmin(uid) {
    const u = await db.doc(`users/${uid}`).get();
    return !!u.exists && !!u.data()?.roles?.spatialAdmin;
}
const CreateWorldInput = zod_1.z.object({
    name: zod_1.z.string().min(1).max(80),
    visibility: zod_1.z.enum(["private", "public", "unlisted"]).default("private")
});
exports.createWorld = (0, https_1.onCall)({ cors: true }, async (req) => {
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
const RequestScanSessionInput = zod_1.z.object({
    worldId: zod_1.z.string().min(8).max(128),
    scanOptIn: zod_1.z.boolean()
});
exports.requestScanSession = (0, https_1.onCall)({ cors: true }, async (req) => {
    const uid = assertAuthed(req);
    const input = RequestScanSessionInput.parse(req.data);
    const world = await db.doc(`worlds/${input.worldId}`).get();
    if (!world.exists)
        throw new https_1.HttpsError("not-found", "World not found.");
    if (world.data()?.ownerId !== uid)
        throw new https_1.HttpsError("permission-denied", "Not owner.");
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
const PublishAssetInput = zod_1.z.object({
    type: zod_1.z.string().min(2).max(32), // glb, hdr, etc
    sha256: zod_1.z.string().min(16).max(128),
    storagePath: zod_1.z.string().min(5).max(512), // spatial/published/assets/<sha256>.glb
    bytes: zod_1.z.number().int().nonnegative(),
    meta: zod_1.z.record(zod_1.z.any()).optional()
});
exports.publishAsset = (0, https_1.onCall)({ cors: true }, async (req) => {
    const uid = assertAuthed(req);
    if (!(await isSpatialAdmin(uid)))
        throw new https_1.HttpsError("permission-denied", "Spatial admin required.");
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
const FinalizeBuildInput = zod_1.z.object({
    platform: zod_1.z.string().min(2).max(32), // webxr, quest, visionos...
    manifestSha256: zod_1.z.string().min(16).max(128),
    storagePath: zod_1.z.string().min(5).max(512) // spatial/builds/<platform>/<manifestSha256>.json
});
exports.finalizeBuild = (0, https_1.onCall)({ cors: true }, async (req) => {
    const uid = assertAuthed(req);
    if (!(await isSpatialAdmin(uid)))
        throw new https_1.HttpsError("permission-denied", "Spatial admin required.");
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
exports.onWorldWrite = (0, firestore_1.onDocumentUpdated)("worlds/{worldId}", async (e) => {
    await e.data.after.ref.update({ updatedAt: nowTs() });
});
exports.onSessionWrite = (0, firestore_1.onDocumentUpdated)("spatialSessions/{sessionId}", async (e) => {
    await e.data.after.ref.update({ updatedAt: nowTs() });
});
exports.onAnchorCreate = (0, firestore_1.onDocumentCreated)("worlds/{worldId}/anchors/{anchorId}", async (e) => {
    // server-side normalization hook (privacy-first): ensure no disallowed fields slip in.
    const d = e.data?.data() || {};
    const forbidden = ["rawFrame", "rawFrames", "cameraFrame", "cameraFrames", "video", "audio", "base64", "frameBytes", "imageBytes", "pixels"];
    for (const k of forbidden) {
        if (k in d) {
            await e.data.ref.delete();
            return;
        }
    }
});
