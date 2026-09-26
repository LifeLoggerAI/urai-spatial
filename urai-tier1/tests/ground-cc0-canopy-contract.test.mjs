import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";

const source = readFileSync(resolve("src/app/GroundSpatialWorldClean.tsx"), "utf8");
const proof = readFileSync(resolve("../scripts/capture-ground-goldmaster-proof.mjs"), "utf8");

test("Ground natural profiles use the governed CC0 photoreal canopy and reject prior canopy stand-ins", () => {
  assert.match(source, /GROUND_BROADLEAF_CANOPY = "\/assets\/urai\/ground-production\/cc0\/polyhaven-jacaranda-web-v1\.glb"/);
  assert.match(source, /function useGroundBroadleafCanopy\(\)/);
  assert.match(source, /new KTX2Loader\(\)\.setTranscoderPath\("\/basis\/"\)\.detectSupport\(gl\)/);
  assert.match(source, /loader\.setKTX2Loader\(ktx2Loader\)/);
  assert.match(source, /const asset = useGroundBroadleafCanopy\(\)/);
  assert.match(source, /name="ground-cc0-jacaranda-canopy-v35"/);
  assert.match(source, /treatment: "cc0-photoreal-broadleaf-canopy-v35"/);
  assert.doesNotMatch(source, /useGLTF\.preload\(GROUND_BROADLEAF_CANOPY\)/);
  assert.match(source, /data-ground-art-revision="ground-v35-optimized-cc0-jacaranda-canopy"/);
  assert.match(source, /data-ground-canopy-repair="ground-v35-photoreal-broadleaf-edge-canopy"/);
  assert.match(source, /data-ground-foliage-repair="ground-v35-scanned-understory-plus-cc0-canopy"/);
  assert.doesNotMatch(source, /data-ground-(?:art-revision|canopy-repair|foliage-repair)="[^"]*v34/);
  assert.doesNotMatch(source, /ground-natural-canopy-v3\.glb/);
  assert.doesNotMatch(source, /CanopyLeafInstances/);
  assert.doesNotMatch(source, /makeOrganicTaperedTube/);
});


test("Ground ships the exact local Basis transcoder declared by provenance", () => {
  const receipt = JSON.parse(readFileSync(resolve("../operations/assets/third-party/three-r183-basis-transcoder.json"), "utf8"));
  assert.equal(receipt.dependencyId, "three-r183-basis-transcoder");
  assert.equal(receipt.status, "integrated-runtime-dependency");
  assert.equal(receipt.source.tag, "r183");
  assert.equal(receipt.source.license, "MIT");
  assert.deepEqual(receipt.integration.runtimePaths, [
    "/basis/basis_transcoder.js",
    "/basis/basis_transcoder.wasm",
  ]);
  assert.equal(receipt.integration.offlineLocalRuntime, true);

  const js = statSync(resolve("public/basis/basis_transcoder.js"));
  const wasm = statSync(resolve("public/basis/basis_transcoder.wasm"));
  assert.ok(js.isFile() && js.size > 50_000, `Basis JS payload missing or truncated: ${js.size}`);
  assert.ok(wasm.isFile() && wasm.size > 500_000, `Basis WASM payload missing or truncated: ${wasm.size}`);
});


test("Ground Gold Master proof fails closed when the governed canopy did not actually load", () => {
  assert.match(source, /data-ground-canopy-required=\{canopyRequired \? "true" : "false"\}/);
  assert.match(source, /data-ground-canopy-ready=\{canopyReady \? "true" : "false"\}/);
  assert.match(source, /if \(meshCount > 0\) onReady\(profile\.id\)/);
  assert.match(proof, /activePhase = 'wait-canopy-ready'/);
  assert.match(proof, /data-ground-canopy-required/);
  assert.match(proof, /data-ground-canopy-ready/);
  assert.match(proof, /governed canopy never reached loaded\/renderable state/);
  assert.match(proof, /canopyRequired: 'true'/);
  assert.match(proof, /canopyReady: 'true'/);
});


test("Ground canopy provenance matches the delivered binary and its embedded texture codec", () => {
  const receipt = JSON.parse(readFileSync(resolve("../operations/assets/third-party/ground-polyhaven-jacaranda-web-v1.json"), "utf8"));
  const binary = readFileSync(resolve("..", receipt.integration.repositoryPath));
  assert.equal(binary.length, receipt.derivative.sizeBytes);
  assert.equal(createHash("sha256").update(binary).digest("hex"), receipt.derivative.sha256);
  assert.equal(binary.readUInt32LE(0), 0x46546c67, "Expected GLB magic");
  assert.equal(binary.readUInt32LE(4), 2, "Expected glTF 2");
  assert.equal(binary.readUInt32LE(8), binary.length, "GLB length must match delivered bytes");
  assert.equal(binary.readUInt32LE(16), 0x4e4f534a, "Expected JSON chunk");
  const jsonLength = binary.readUInt32LE(12);
  const document = JSON.parse(binary.subarray(20, 20 + jsonLength).toString("utf8"));
  const binHeader = 20 + jsonLength;
  assert.equal(binary.readUInt32LE(binHeader + 4), 0x004e4942, "Expected BIN chunk");
  const binStart = binHeader + 8;
  assert.equal(binStart + binary.readUInt32LE(binHeader), binary.length);
  assert.ok(document.extensionsUsed.includes("EXT_meshopt_compression"));
  assert.ok(document.extensionsUsed.includes("KHR_texture_basisu"));
  assert.equal(document.images.length, receipt.derivative.embeddedTextureCount);
  assert.deepEqual([...new Set(document.images.map((image) => image.mimeType))].sort(), receipt.derivative.embeddedTextureMimeTypes);
  const ktx2Identifier = Buffer.from([0xab, 0x4b, 0x54, 0x58, 0x20, 0x32, 0x30, 0xbb, 0x0d, 0x0a, 0x1a, 0x0a]);
  for (const image of document.images) {
    assert.equal(image.uri, undefined, "Texture bytes must be delivered inside the GLB");
    assert.equal(image.mimeType, "image/ktx2");
    const view = document.bufferViews[image.bufferView];
    assert.equal(view.buffer, 0);
    assert.ok(view.byteLength >= ktx2Identifier.length);
    const start = binStart + (view.byteOffset ?? 0);
    assert.ok(start + view.byteLength <= binary.length, `${image.name}: out-of-bounds texture`);
    assert.deepEqual(binary.subarray(start, start + ktx2Identifier.length), ktx2Identifier, `${image.name}: codec payload must match declared MIME type`);
  }
});
