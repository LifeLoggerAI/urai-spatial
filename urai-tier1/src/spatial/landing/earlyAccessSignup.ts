import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { firebasePublicEnvReady, getFirebaseDb } from "../../lib/firebase/client";

export type EarlyAccessSignup = {
  email: string;
  source: "landing" | "demo" | "social" | "manual";
  status: "new" | "invited" | "active";
  createdAt: string;
  updatedAt?: string;
};

const COLLECTION = "early_access_signups";

function emailToDocId(email: string) {
  return email.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "_");
}

export async function saveEarlyAccessSignup(email: string, source: EarlyAccessSignup["source"] = "landing") {
  const cleanEmail = email.trim().toLowerCase();

  if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
    throw new Error("Please enter a valid email.");
  }

  const signup: EarlyAccessSignup = {
    email: cleanEmail,
    source,
    status: "new",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // The marketing-to-UrAi handoff forbids persisting raw email locally.
  // Only a successful backend write can confirm a waitlist entry.
  if (!firebasePublicEnvReady) return { ...signup, persistedRemotely: false };

  try {
    const db = getFirebaseDb();
    const ref = doc(db, COLLECTION, emailToDocId(cleanEmail));
    const existing = await getDoc(ref);

    await setDoc(
      ref,
      {
        email: cleanEmail,
        source,
        status: existing.exists() ? existing.data().status ?? "new" : "new",
        createdAt: existing.exists() ? existing.data().createdAt ?? serverTimestamp() : serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
    return { ...signup, persistedRemotely: true };
  } catch (error) {
    console.warn("[URAI] Firestore signup failed; no local email copy retained.", error);
  }

  return { ...signup, persistedRemotely: false };
}
