import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { getFirebaseDb } from "../../lib/firebase/client";

export type EarlyAccessSignup = {
  email: string;
  source: "landing" | "demo" | "social" | "manual";
  status: "new" | "invited" | "active";
  createdAt: string;
  updatedAt?: string;
};

const STORAGE_KEY = "urai:early-access-signups";
const COLLECTION = "early_access_signups";

function emailToDocId(email: string) {
  return email.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "_");
}

function writeLocal(signup: EarlyAccessSignup) {
  if (typeof window === "undefined") return;
  const current = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]") as EarlyAccessSignup[];
  const next = [signup, ...current.filter((item) => item.email !== signup.email)].slice(0, 250);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
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

  writeLocal(signup);

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
  } catch (error) {
    console.warn("[URAI] Firestore signup write failed; local fallback saved.", error);
  }

  return signup;
}
