import assert from "node:assert/strict";
import { XrSessionSimulator, comfortProfile } from "./xr-session-simulator.mjs";

const xr=new XrSessionSimulator({capabilities:{immersiveVr:true,controller:true,gaze:true}});
assert.equal(xr.physicalCertification,false);
assert.equal(xr.transition("REQUEST"),"requesting");
assert.equal(xr.transition("GRANTED"),"active");
assert.equal(xr.input("controller",{button:"select"}).accepted,true);
assert.equal(xr.input("hand",{}).reason,"CAPABILITY_UNAVAILABLE");
assert.equal(xr.transition("INTERRUPT"),"interrupted");
assert.equal(xr.input("gaze",{}).reason,"XR_SESSION_NOT_ACTIVE");
assert.equal(xr.transition("RECOVER"),"recovering");
assert.equal(xr.transition("RESTORED"),"active");
assert.equal(xr.transition("END"),"ended");

const comfort=comfortProfile({reducedMotion:true,seated:true,stimulation:"reduced"});
assert.equal(comfort.locomotion,"teleport_or_stationary");
assert.equal(comfort.snapTurn,true);
assert.equal(comfort.autoplayMotion,false);

assert.throws(()=>new XrSessionSimulator().transition("GRANTED"),/illegal XR/);

console.log("XR engineering harness conformance: PASS");
