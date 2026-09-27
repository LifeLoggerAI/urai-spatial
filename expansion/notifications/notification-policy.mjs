function minutesSinceMidnight(hhmm) {
  const [h,m] = String(hhmm).split(":").map(Number);
  if (!Number.isInteger(h) || !Number.isInteger(m) || h<0 || h>23 || m<0 || m>59) {
    throw new Error("invalid HH:MM");
  }
  return h*60+m;
}

function inQuietHours(nowMinutes, start, end) {
  const s=minutesSinceMidnight(start);
  const e=minutesSinceMidnight(end);
  if (s===e) return false;
  return s<e ? nowMinutes>=s && nowMinutes<e : nowMinutes>=s || nowMinutes<e;
}

export function evaluateNotification(notification, policy) {
  const deny=(reason)=>({allowed:false,reason});
  if (!notification?.notificationId || !notification?.subjectId) return deny("INVALID_NOTIFICATION");
  if (policy?.consent !== "granted") return deny("CONSENT_REQUIRED");
  if (policy?.enabled !== true) return deny("CHANNEL_DISABLED");
  if (!policy.channels?.includes(notification.channel)) return deny("CHANNEL_NOT_ALLOWED");

  const now=minutesSinceMidnight(notification.localTime);
  if (
    policy.quietHours &&
    inQuietHours(now,policy.quietHours.start,policy.quietHours.end) &&
    notification.urgency !== "critical"
  ) return deny("QUIET_HOURS");

  if ((policy.sentInWindow ?? 0) >= (policy.maxPerWindow ?? 0)) return deny("RATE_CAP");
  if (notification.expiresAt && Date.parse(notification.expiresAt) <= Date.parse(notification.createdAt)) {
    return deny("EXPIRED");
  }
  if (notification.cancelled === true) return deny("CANCELLED");

  return {
    allowed:true,
    reason:"AUTHORIZED_SYNTHETIC_ROUTE",
    route:{
      channel:notification.channel,
      priority:notification.priority ?? "normal",
      payloadMinimized:true,
      providerDispatchAllowed:false,
    },
  };
}

export class MockNotificationRouter {
  synthetic=true;
  route(notification,policy){
    const decision=evaluateNotification(notification,policy);
    return {
      notificationId:notification.notificationId,
      synthetic:true,
      ...decision,
      providerReceipt:null,
    };
  }
}
