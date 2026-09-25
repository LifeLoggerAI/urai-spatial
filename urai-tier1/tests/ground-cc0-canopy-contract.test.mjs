import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

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
