import assert from "node:assert/strict";
import {
  normalizeWearableSignal,
  revokeWearableSignal,
  wearableAvailability,
} from "./wearable-signals.mjs";

const signal=normalizeWearableSignal({
  synthetic:true,
  signalId:"sleep-001",
  subjectId:"subject-1",
  type:"sleep",
  observedAt:"2026-09-23T06:00:00.000Z",
  purpose:"personal_reflection",
  permissionRefs:["grant-health-synthetic"],
  value:{durationMinutes:420},
});
assert.equal(signal.interpretation,null);
assert.equal(signal.clinicalMeaning,null);
assert.equal(signal.localProcessingPreferred,true);

const revoked=revokeWearableSignal(signal,"grant-health-synthetic");
assert.equal(revoked.revoked,true);
assert.deepEqual(revoked.value,{});
assert.deepEqual(revoked.permissionRefs,[]);

assert.deepEqual(
  wearableAvailability({permission:"denied",providerAvailable:true}),
  {available:false,reason:"PERMISSION_NOT_GRANTED"},
);
assert.equal(
  wearableAvailability({permission:"granted",providerAvailable:true}).realIngestionAllowed,
  false,
);

assert.throws(()=>normalizeWearableSignal({...signal,synthetic:false}),/must be synthetic/);
assert.throws(()=>normalizeWearableSignal({
  ...signal,synthetic:true,type:"diagnosis",permissionRefs:["x"],
}),/unsupported wearable/);

console.log("Wearable/health synthetic signal conformance: PASS");
