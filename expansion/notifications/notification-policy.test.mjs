import assert from "node:assert/strict";
import { evaluateNotification, MockNotificationRouter } from "./notification-policy.mjs";

const base={
  notificationId:"notify-001",
  subjectId:"subject-1",
  channel:"push",
  urgency:"normal",
  localTime:"22:15",
  createdAt:"2026-09-23T22:15:00-05:00",
  expiresAt:"2026-09-24T22:15:00-05:00",
};
const policy={
  consent:"granted",
  enabled:true,
  channels:["push"],
  quietHours:{start:"22:00",end:"07:00"},
  sentInWindow:0,
  maxPerWindow:3,
};

assert.equal(evaluateNotification(base,policy).reason,"QUIET_HOURS");
assert.equal(evaluateNotification({...base,urgency:"critical"},policy).allowed,true);
assert.equal(evaluateNotification({...base,localTime:"12:00"},{...policy,sentInWindow:3}).reason,"RATE_CAP");
assert.equal(evaluateNotification({...base,localTime:"12:00"},{...policy,consent:"revoked"}).reason,"CONSENT_REQUIRED");
assert.equal(evaluateNotification({...base,localTime:"12:00",cancelled:true},policy).reason,"CANCELLED");

const routed=new MockNotificationRouter().route(
  {...base,localTime:"12:00"},
  policy,
);
assert.equal(routed.allowed,true);
assert.equal(routed.route.providerDispatchAllowed,false);
assert.equal(routed.providerReceipt,null);

console.log("Notification fabric synthetic policy conformance: PASS");
