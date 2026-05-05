import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { getFirebaseDb } from "../../lib/firebase/client";

export type LaunchEventName =
  | "landing_viewed"
  | "demo_viewed"
  | "demo_cta_clicked"
  | "early_access_signup_started"
  | "early_access_signup_completed"
  | "invite_opened"
  | "invite_accepted"
  | "life_map_entered"
  | "first_light_started"
  | "first_light_completed"
  | "pro_interest_clicked";

export async function trackLaunchEvent(name: LaunchEventName, properties: Record<string, unknown> = {}) {
  const payload = {
    name,
    properties,
    path: typeof window !== "undefined" ? window.location.pathname : "server",
    search: typeof window !== "undefined" ? window.location.search : "",
    createdAt: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    const key = "urai:launch-events";
    const current = JSON.parse(window.localStorage.getItem(key) ?? "[]");
    window.localStorage.setItem(key, JSON.stringify([payload, ...current].slice(0, 500)));
  }

  try {
    const db = getFirebaseDb();
    await addDoc(collection(db, "launch_events"), {
      ...payload,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.warn("[URAI] launch event fallback only", error);
  }

  return payload;
}
