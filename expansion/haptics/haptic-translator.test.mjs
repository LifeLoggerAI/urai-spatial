import assert from "node:assert/strict";
import { translateHaptic, hapticVocabulary } from "./haptic-translator.mjs";

assert.equal(hapticVocabulary().length,9);

const warning = translateHaptic({symbol:"WARNING",intensity:2,repeat:30},{hapticsAvailable:true});
assert.equal(warning.intensity,1);
assert.equal(warning.repeat,20);
assert.equal(warning.physicalDispatchAllowed,false);
assert.ok(warning.physicalPattern.length > 0);
assert.equal(warning.equivalents.visual.required,true);
assert.equal(warning.equivalents.nonAudio.required,true);

const noHaptics = translateHaptic({symbol:"NAV_LEFT",intensity:0.4},{hapticsAvailable:false});
assert.deepEqual(noHaptics.physicalPattern,[]);
assert.equal(noHaptics.fallback,"equivalent_access_only");

assert.throws(()=>translateHaptic({symbol:"SECRET_PATTERN"}),/Unknown haptic symbol/);

console.log("Haptic/accessibility translation conformance: PASS");
