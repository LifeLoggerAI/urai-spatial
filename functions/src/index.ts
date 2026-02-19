
import * as crypto from "crypto";
import * as path from "path";
import * as os from "os";
import * as fs from "fs/promises";

import { onObjectFinalized } from "firebase-functions/v2/storage";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";

import * as admin from "firebase-admin";

import { NodeIO } from "@gltf-transform/core";
import { KHRONOS_EXTENSIONS } from "@gltf-transform/extensions";
import {
  dedup,
  draco,
  instance,
  join,
  prune,
  quantize,
  resample,
  textureResize,
  weld
} from "@gltf-transform/functions";

admin.initializeApp();

const db = admin.firestore();
const bucket = admin.storage().bucket();

const PIPELINE_VERSION = "spatial-pipeline-v1";
const SOURCE_PREFIX = "spatial/assets/source/";
const BUILDS_PREFIX = "spatial/assets/builds/";

function sha256Hex(buf: Buffer): string {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function buildIdFor(assetId: string, sha256: string): string {
  return `${assetId}_${sha256.slice(0, 16)}_${PIPELINE_VERSION}`;
}

function assertSourcePath(objectName: string): { assetId: string; filename: string } | null {
  if (!objectName.startsWith(SOURCE_PREFIX)) return null;
  const rel = objectName.slice(SOURCE_PREFIX.length); // {assetId}/{filename}
  const parts = rel.split("/");
  if (parts.length < 2) return null;
  const assetId = parts[0];
  const filename = parts.slice(1).join("/");
  return { assetId, filename };
}

async function upsertAssetUploaded(assetId: string, sourcePath: string, sourceSha256: string) {
  const ref = db.collection("assets").doc(assetId);
  await ref.set(
    {
      kind: "model",
      name: assetId,
      sourcePath,
      sourceSha256,
      canonicalFormat: "glb",
      status: "uploaded",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    },
    { merge: true }
  );
}

async function setAssetStatus(assetId: string, status: string, latestBuildId?: string | null) {
  const ref = db.collection("assets").doc(assetId);
  const patch: any = {
    status,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };
  if (typeof latestBuildId !== "undefined") patch.latestBuildId = latestBuildId;
  await ref.set(patch, { merge: true });
}

async function createOrGetBuild(assetId: string, sourceSha256: string) {
  const buildId = buildIdFor(assetId, sourceSha256);
  const ref = db.collection("builds").doc(buildId);
  const snap = await ref.get();
  if (snap.exists) return { buildId, ref, existing: true };

  await ref.set(
    {
      assetId,
      sourceSha256,
      pipelineVersion: PIPELINE_VERSION,
      status: "queued",
      outputs: {},
      metrics: {},
      error: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    },
    { merge: true }
  );

  return { buildId, ref, existing: false };
}

async function runBuild(assetId: string, sourceSha256: string, sourceObjectPath: string) {
  const { buildId, ref } = await createOrGetBuild(assetId, sourceSha256);

  const current = await ref.get();
  if (current.exists && current.data()?.status === "ready") {
    logger.info(`Build already ready: ${buildId}`);
    return buildId;
  }

  const buildingBatch = db.batch();
  buildingBatch.set(ref, { status: "building", updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  buildingBatch.set(db.collection("assets").doc(assetId), { status: "building", latestBuildId: buildId, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  await buildingBatch.commit();

  const t0 = Date.now();

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "urai-spatial-"));
  const inFile = path.join(tmpDir, "in.glb");
  const outFile = path.join(tmpDir, "out.glb");
  const outDracoFile = path.join(tmpDir, "out.draco.glb");

  try {
    const [srcBuf] = await bucket.file(sourceObjectPath).download();
    await fs.writeFile(inFile, srcBuf);

    const io = new NodeIO().registerExtensions(KHRONOS_EXTENSIONS);
    const doc = await io.read(inFile);

    await doc.transform(
      dedup(), instance(), weld(), prune(), join(),
      quantize({ quantizePosition: 14, quantizeNormal: 10, quantizeTexcoord: 12 }),
      resample(),
      textureResize({ size: [2048, 2048] })
    );
    await io.write(outFile, doc);

    const doc2 = await io.read(outFile);
    await doc2.transform(draco({ method: "edgebreaker", quantizePosition: 14, quantizeNormal: 10, quantizeTexcoord: 12 }));
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

    const readyBatch = db.batch();
    readyBatch.set(ref, { status: "ready", outputs: { glb: outPath, glbDraco: outDracoPath, report: reportPath }, metrics: { bytesIn: srcBuf.length, bytesOut: outBuf.length, durationMs: Date.now() - t0 }, error: null, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    readyBatch.set(db.collection("assets").doc(assetId), { status: "ready", latestBuildId: buildId, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    await readyBatch.commit();

    return buildId;
  } catch (err: any) {
    const message = err?.message || String(err);
    const stack = err?.stack || "";
    const failedBatch = db.batch();
    failedBatch.set(ref, { status: "failed", error: { message, stack }, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    failedBatch.set(db.collection("assets").doc(assetId), { status: "failed", latestBuildId: null, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    await failedBatch.commit();
    throw err;
  } finally {
    try { await fs.rm(tmpDir, { recursive: true, force: true }); } catch {}
  }
}

export const spatialOnAssetUpload = onObjectFinalized({
  region: "us-central1",
  memory: "512MiB",
  timeoutSeconds: 300,
}, async (event) => {
  const objectName = event.data.name || "";
  const parsed = assertSourcePath(objectName);
  if (!parsed) return;

  const { assetId } = parsed;
  if (!objectName.toLowerCase().endsWith(".glb")) {
    logger.info(`Skipping non-GLB upload: ${objectName}`);
    return;
  }

  const [buf] = await bucket.file(objectName).download();
  const sourceSha256 = sha256Hex(buf);
  await upsertAssetUploaded(assetId, objectName, sourceSha256);
  await runBuild(assetId, sourceSha256, objectName);
});

export const spatialBuildAsset = onCall({
  region: "us-central1",
  memory: "512MiB",
  timeoutSeconds: 300,
  minInstances: 0,
}, async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Auth required.");
  const isAdmin = (req.auth.token as any).admin === true;
  if (!isAdmin) throw new HttpsError("permission-denied", "Admin only.");

  const assetId = String(req.data?.assetId || "").trim();
  if (!assetId) throw new HttpsError("invalid-argument", "assetId required.");

  const assetRef = db.collection("assets").doc(assetId);
  const assetSnap = await assetRef.get();
  if (!assetSnap.exists) throw new HttpsError("not-found", "Asset not found.");

  const asset = assetSnap.data()!;
  if (!asset.sourcePath || !asset.sourceSha256) {
    throw new HttpsError("failed-precondition", "Asset missing sourcePath/sourceSha256.");
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

export const seedSpatialDemoData = onCall({ region: "us-central1" }, async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Auth required.");
  const isAdmin = (req.auth.token as any).admin === true;
  if (!isAdmin) throw new HttpsError("permission-denied", "Admin only.");

  const batch = db.batch();

  const worldRef = db.collection('worlds').doc('demoWorld');
  batch.set(worldRef, { name: 'Demo World', description: 'A world for the Life Map demo scene.', status: 'published', createdAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp() });

  const sceneRef = db.collection('scenes').doc('lifeMap');
  batch.set(sceneRef, { name: 'Life Map Demo', worldId: 'demoWorld', status: 'published', createdAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp() });

  const auditLogRef = db.collection("auditLogs").doc();
  batch.set(auditLogRef, {
    uid: req.auth.uid,
    ts: admin.firestore.FieldValue.serverTimestamp(),
    action: "seedSpatialDemoData",
    resource: worldRef.path,
    meta: { worldId: worldRef.id, sceneId: sceneRef.id },
  });

  await batch.commit();

  return { ok: true, worldId: worldRef.id, sceneId: sceneRef.id };
});
