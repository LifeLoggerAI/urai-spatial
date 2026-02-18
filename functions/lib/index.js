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
exports.seedSpatialDemoData = exports.spatialBuildAsset = exports.spatialOnAssetUpload = void 0;
const crypto = __importStar(require("crypto"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const fs = __importStar(require("fs/promises"));
const storage_1 = require("firebase-functions/v2/storage");
const https_1 = require("firebase-functions/v2/https");
const firebase_functions_1 = require("firebase-functions");
const admin = __importStar(require("firebase-admin"));
const core_1 = require("@gltf-transform/core");
const extensions_1 = require("@gltf-transform/extensions");
const functions_1 = require("@gltf-transform/functions");
admin.initializeApp();
const db = admin.firestore();
const bucket = admin.storage().bucket();
const PIPELINE_VERSION = "spatial-pipeline-v1";
const SOURCE_PREFIX = "spatial/assets/source/";
const BUILDS_PREFIX = "spatial/assets/builds/";
function sha256Hex(buf) {
    return crypto.createHash("sha256").update(buf).digest("hex");
}
function buildIdFor(assetId, sha256) {
    return `${assetId}_${sha256.slice(0, 16)}_${PIPELINE_VERSION}`;
}
function assertSourcePath(objectName) {
    if (!objectName.startsWith(SOURCE_PREFIX))
        return null;
    const rel = objectName.slice(SOURCE_PREFIX.length); // {assetId}/{filename}
    const parts = rel.split("/");
    if (parts.length < 2)
        return null;
    const assetId = parts[0];
    const filename = parts.slice(1).join("/");
    return { assetId, filename };
}
async function upsertAssetUploaded(assetId, sourcePath, sourceSha256) {
    const ref = db.collection("assets").doc(assetId);
    await ref.set({
        kind: "model",
        name: assetId,
        sourcePath,
        sourceSha256,
        canonicalFormat: "glb",
        status: "uploaded",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
}
async function setAssetStatus(assetId, status, latestBuildId) {
    const ref = db.collection("assets").doc(assetId);
    const patch = {
        status,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    if (typeof latestBuildId !== "undefined")
        patch.latestBuildId = latestBuildId;
    await ref.set(patch, { merge: true });
}
async function createOrGetBuild(assetId, sourceSha256) {
    const buildId = buildIdFor(assetId, sourceSha256);
    const ref = db.collection("builds").doc(buildId);
    const snap = await ref.get();
    if (snap.exists)
        return { buildId, ref, existing: true };
    await ref.set({
        assetId,
        sourceSha256,
        pipelineVersion: PIPELINE_VERSION,
        status: "queued",
        outputs: {},
        metrics: {},
        error: null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    return { buildId, ref, existing: false };
}
async function runBuild(assetId, sourceSha256, sourceObjectPath) {
    const { buildId, ref } = await createOrGetBuild(assetId, sourceSha256);
    const current = await ref.get();
    if (current.exists && current.data()?.status === "ready") {
        firebase_functions_1.logger.info(`Build already ready: ${buildId}`);
        return buildId;
    }
    await ref.set({ status: "building", updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    await setAssetStatus(assetId, "building", buildId);
    const t0 = Date.now();
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "urai-spatial-"));
    const inFile = path.join(tmpDir, "in.glb");
    const outFile = path.join(tmpDir, "out.glb");
    const outDracoFile = path.join(tmpDir, "out.draco.glb");
    try {
        const [srcBuf] = await bucket.file(sourceObjectPath).download();
        await fs.writeFile(inFile, srcBuf);
        const io = new core_1.NodeIO().registerExtensions(extensions_1.KHRONOS_EXTENSIONS);
        const doc = await io.read(inFile);
        await doc.transform((0, functions_1.dedup)(), (0, functions_1.instance)(), (0, functions_1.weld)(), (0, functions_1.prune)(), (0, functions_1.join)(), (0, functions_1.quantize)({ quantizePosition: 14, quantizeNormal: 10, quantizeTexcoord: 12 }), (0, functions_1.resample)(), (0, functions_1.textureResize)({ size: [2048, 2048] }));
        await io.write(outFile, doc);
        const doc2 = await io.read(outFile);
        await doc2.transform((0, functions_1.draco)({ encoderMethod: "edgebreaker", quantizePosition: 14, quantizeNormal: 10, quantizeTexcoord: 12 }));
        await io.write(outDracoFile, doc2);
        const outBuf = await fs.readFile(outFile);
        const outDracoBuf = await fs.readFile(outDracoFile);
        const base = `${BUILDS_PREFIX}${assetId}/${sourceSha256}/${PIPELINE_VERSION}`;
        const outPath = `${base}/model.glb`;
        const outDracoPath = `${base}/model.draco.glb`;
        const reportPath = `${base}/report.json`;
        await bucket.file(outPath).save(outBuf, { contentType: "model/gltf-binary" });
        await bucket.file(outDracoPath).save(outDracoBuf, { contentType: "model/gltf-binary" });
        const report = { assetId, buildId, pipelineVersion: PIPELINE_VERSION, source: { path: sourceObjectPath, sha256: sourceSha256, bytes: srcBuf.length }, outputs: { glb: { path: outPath, bytes: outBuf.length }, glbDraco: { path: outDracoPath, bytes: outDracoBuf.length } }, timing: { durationMs: Date.now() - t0 } };
        await bucket.file(reportPath).save(JSON.stringify(report, null, 2), { contentType: "application/json" });
        await ref.set({ status: "ready", outputs: { glb: outPath, glbDraco: outDracoPath, report: reportPath }, metrics: { bytesIn: srcBuf.length, bytesOut: outBuf.length, durationMs: Date.now() - t0 }, error: null, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
        await setAssetStatus(assetId, "ready", buildId);
        return buildId;
    }
    catch (err) {
        const message = err?.message || String(err);
        const stack = err?.stack || "";
        await ref.set({ status: "failed", error: { message, stack }, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
        await setAssetStatus(assetId, "failed", null);
        throw err;
    }
    finally {
        try {
            await fs.rm(tmpDir, { recursive: true, force: true });
        }
        catch { }
    }
}
exports.spatialOnAssetUpload = (0, storage_1.onObjectFinalized)({ region: "us-central1" }, async (event) => {
    const objectName = event.data.name || "";
    const parsed = assertSourcePath(objectName);
    if (!parsed)
        return;
    const { assetId } = parsed;
    if (!objectName.toLowerCase().endsWith(".glb")) {
        firebase_functions_1.logger.info(`Skipping non-GLB upload: ${objectName}`);
        return;
    }
    const [buf] = await bucket.file(objectName).download();
    const sourceSha256 = sha256Hex(buf);
    await upsertAssetUploaded(assetId, objectName, sourceSha256);
    await runBuild(assetId, sourceSha256, objectName);
});
exports.spatialBuildAsset = (0, https_1.onCall)({ region: "us-central1" }, async (req) => {
    if (!req.auth)
        throw new https_1.HttpsError("unauthenticated", "Auth required.");
    const isAdmin = req.auth.token.admin === true;
    if (!isAdmin)
        throw new https_1.HttpsError("permission-denied", "Admin only.");
    const assetId = String(req.data?.assetId || "").trim();
    if (!assetId)
        throw new https_1.HttpsError("invalid-argument", "assetId required.");
    const assetRef = db.collection("assets").doc(assetId);
    const assetSnap = await assetRef.get();
    if (!assetSnap.exists)
        throw new https_1.HttpsError("not-found", "Asset not found.");
    const asset = assetSnap.data();
    if (!asset.sourcePath || !asset.sourceSha256) {
        throw new https_1.HttpsError("failed-precondition", "Asset missing sourcePath/sourceSha256.");
    }
    const buildId = await runBuild(assetId, asset.sourceSha256, asset.sourcePath);
    await db.collection("auditLogs").add({
        uid: req.auth.uid,
        ts: admin.firestore.FieldValue.serverTimestamp(),
        action: "spatialBuildAsset",
        resource: assetRef.path,
        meta: { assetId, buildId },
    });
    return { ok: true, buildId };
});
exports.seedSpatialDemoData = (0, https_1.onCall)({ region: "us-central1" }, async (req) => {
    if (!req.auth)
        throw new https_1.HttpsError("unauthenticated", "Auth required.");
    const isAdmin = req.auth.token.admin === true;
    if (!isAdmin)
        throw new https_1.HttpsError("permission-denied", "Admin only.");
    const worldRef = db.collection('worlds').doc('demoWorld');
    await worldRef.set({ name: 'Demo World', description: 'A world for the Life Map demo scene.', status: 'published', createdAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    const sceneRef = db.collection('scenes').doc('lifeMap');
    await sceneRef.set({ name: 'Life Map Demo', worldId: 'demoWorld', status: 'published', createdAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    await db.collection("auditLogs").add({
        uid: req.auth.uid,
        ts: admin.firestore.FieldValue.serverTimestamp(),
        action: "seedSpatialDemoData",
        resource: worldRef.path,
        meta: { worldId: worldRef.id, sceneId: sceneRef.id },
    });
    return { ok: true, worldId: worldRef.id, sceneId: sceneRef.id };
});
