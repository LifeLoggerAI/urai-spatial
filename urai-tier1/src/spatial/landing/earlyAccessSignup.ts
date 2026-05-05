export type EarlyAccessSignup = {
  email: string;
  source: "landing" | "demo" | "social" | "manual";
  status: "new" | "invited" | "active";
  createdAt: string;
};

const STORAGE_KEY = "urai:early-access-signups";

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
  };

  // Local fallback keeps the landing page deployable before Firebase wiring.
  if (typeof window !== "undefined") {
    const current = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]") as EarlyAccessSignup[];
    const next = [signup, ...current.filter((item) => item.email !== cleanEmail)].slice(0, 250);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  // Firestore target collection: early_access_signups
  // Replace local fallback with addDoc(collection(db, "early_access_signups"), signup) once Firebase client is available here.
  return signup;
}
