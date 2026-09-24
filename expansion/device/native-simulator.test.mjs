import assert from "node:assert/strict";
import { PLATFORM_CAPABILITIES, createNativeSimulator } from "./native-simulator.mjs";

for (const platform of Object.keys(PLATFORM_CAPABILITIES)) {
  const sim = createNativeSimulator(platform);
  assert.equal(sim.synthetic,true);
  assert.equal(sim.physicalCertification,false);
}

const ios = createNativeSimulator("ios");
assert.equal(ios.permissionState("location.when_in_use"),"not_requested");
assert.equal(ios.canUse("location","location.when_in_use"),false);
ios.setPermission("location.when_in_use","granted");
assert.equal(ios.canUse("location","location.when_in_use"),true);
ios.setPermission("location.when_in_use","revoked");
assert.equal(ios.canUse("location","location.when_in_use"),false);
assert.equal(ios.lifecycle("background").synthetic,true);

const windows = createNativeSimulator("windows");
assert.equal(windows.canUse("haptics"),false);

assert.throws(()=>createNativeSimulator("unknown"),/unsupported/);
assert.throws(()=>ios.setPermission("x","magic"),/invalid permission/);

console.log("Native/device simulator conformance: PASS");
