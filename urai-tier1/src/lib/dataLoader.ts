import { seedUserData } from "@/data/seedUser";
import { db, firebaseReady } from "@/lib/firebase";

export async function loadUserData() {
  if (!firebaseReady || !db) {
    return { source: "seed", data: seedUserData };
  }

  try {
    // Placeholder: wire real collections in next pass
    return { source: "seed-fallback", data: seedUserData };
  } catch (e) {
    return { source: "seed-error-fallback", data: seedUserData };
  }
}
