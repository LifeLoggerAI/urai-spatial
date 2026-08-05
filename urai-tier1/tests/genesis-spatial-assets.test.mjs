import assert from "node:assert/strict";
import test from "node:test";
import {
  SPATIAL_ASSET_MANIFEST,
  assetsForRealm,
  realmForPhase,
} from "../src/spatial/assets/spatialAssetManifest.ts";

const requiredRealms = [
  "home-sanctuary",
  "living-ground",
  "life-map-observatory",
  "mirror-of-becoming",
  "shadow-realm",
  "passport-archive",
  "council-chamber",
];

test("Genesis manifest covers every spatial realm", () => {
  for (const realm of requiredRealms) {
    assert.ok(assetsForRealm(realm).length > 0, `${realm} must own at least one spatial asset`);
  }
});

test("Genesis assets are procedural production assets", () => {
  assert.ok(SPATIAL_ASSET_MANIFEST.length >= 10);
  for (const asset of SPATIAL_ASSET_MANIFEST) {
    assert.equal(asset.procedural, true);
    assert.ok(asset.description.length >= 20);
    assert.ok(asset.id.includes("."));
  }
});

test("runtime phases resolve to authored realms", () => {
  assert.equal(realmForPhase("HOME"), "home-sanctuary");
  assert.equal(realmForPhase("GROUND"), "living-ground");
  assert.equal(realmForPhase("LIFEMAP"), "life-map-observatory");
  assert.equal(realmForPhase("FOCUS"), "mirror-of-becoming");
  assert.equal(realmForPhase("REPLAY"), "shadow-realm");
  assert.equal(realmForPhase("PASSPORT"), "passport-archive");
  assert.equal(realmForPhase("STATUS"), "council-chamber");
});
