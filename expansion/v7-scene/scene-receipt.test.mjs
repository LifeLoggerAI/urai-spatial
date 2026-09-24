import assert from "node:assert/strict";
import { createSceneReceipt, compareSceneReceipts } from "./scene-receipt.mjs";

const a=createSceneReceipt({
  receiptId:"scene-r1",sceneId:"focus",route:"/focus",assetPackId:"v2-inactive",
  navigation:{from:"/life-map",to:"/focus",continuityId:"continuity-1"},
  stateVersion:"synthetic-1",dependencies:["orb","memory-star"],capturedAt:"2026-09-23T12:00:00.000Z",synthetic:true,
});
const b=createSceneReceipt({
  receiptId:"scene-r2",sceneId:"focus",route:"/focus",assetPackId:"v2-inactive",
  navigation:{from:"/life-map",to:"/focus",continuityId:"continuity-1"},
  stateVersion:"synthetic-1",dependencies:["memory-star","orb"],capturedAt:"2026-09-23T12:01:00.000Z",synthetic:true,
});
assert.equal(a.stateDigest,b.stateDigest);
assert.equal(a.mutationAuthority,false);
assert.equal(compareSceneReceipts(a,b).continuityPreserved,true);

const changed=createSceneReceipt({...b,stateVersion:"synthetic-2"});
assert.equal(compareSceneReceipts(a,changed).stateChanged,true);

console.log("V7 scene provenance receipt conformance: PASS");
