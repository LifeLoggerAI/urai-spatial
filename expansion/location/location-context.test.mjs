import assert from "node:assert/strict";
import {
  normalizeLocationEvent,
  isStaleLocation,
  revokeLocation,
} from "./location-context.mjs";

const coarse=normalizeLocationEvent({
  synthetic:true,
  signalId:"loc-001",
  subjectId:"subject-1",
  eventType:"snapshot",
  observedAt:"2026-09-23T12:00:00.000Z",
  permissionPrecision:"coarse",
  permissionRefs:["grant-location-synthetic"],
  coordinates:{latitude:32.812345,longitude:-97.112345},
});
assert.deepEqual(coarse.coordinates,{latitude:32.81,longitude:-97.11});
assert.equal(coarse.onDeviceFiltered,true);
assert.equal(coarse.passiveStreamingAllowed,false);

const fine=normalizeLocationEvent({
  ...coarse,
  synthetic:true,
  signalId:"loc-002",
  permissionPrecision:"fine",
  coordinates:{latitude:32.812345,longitude:-97.112345},
});
assert.deepEqual(fine.coordinates,{latitude:32.8123,longitude:-97.1123});

assert.equal(isStaleLocation(coarse,"2026-09-23T12:20:01.000Z"),true);
assert.equal(isStaleLocation(coarse,"2026-09-23T12:10:00.000Z"),false);

const revoked=revokeLocation(coarse,"grant-location-synthetic");
assert.equal(revoked.revoked,true);
assert.equal(revoked.coordinates,null);
assert.deepEqual(revoked.permissionRefs,[]);

assert.throws(()=>normalizeLocationEvent({...coarse,synthetic:false}),/must be synthetic/);

console.log("Location/context synthetic conformance: PASS");
