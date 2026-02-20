
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const db = admin.firestore();

// A simple in-memory rate limiter
const requests = new Map<string, { count: number; lastRequest: number }>();

const RATE_LIMIT_COUNT = 10; // 10 requests
const RATE_LIMIT_WINDOW = 60 * 1000; // 60 seconds

function rateLimit(key: string): boolean {
  const now = Date.now();
  const requestInfo = requests.get(key);

  if (requestInfo && (now - requestInfo.lastRequest) < RATE_LIMIT_WINDOW) {
    if (requestInfo.count >= RATE_LIMIT_COUNT) {
      return true; // Rate limit exceeded
    }
    requestInfo.count++;
    requestInfo.lastRequest = now;
  } else {
    requests.set(key, { count: 1, lastRequest: now });
  }

  return false; // Not rate limited
}

export const exportUserData = onCall({ region: "us-central1" }, async (req) => {
  if (!req.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const uid = req.auth.uid;
  const ip = req.rawRequest.ip;

  if (rateLimit(uid) || rateLimit(ip)) {
    throw new HttpsError("resource-exhausted", "Rate limit exceeded. Please try again later.");
  }

  try {
    const snapshot = await db.collection("lifemapStars").where("userId", "==", uid).get();
    const stars = snapshot.docs.map(doc => doc.data());
    return { stars };
  } catch (error) {
    console.error("Error exporting user data:", error);
    throw new HttpsError("internal", "An internal error occurred while exporting user data.");
  }
});
