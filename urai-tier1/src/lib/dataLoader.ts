import { doc, getDoc } from "firebase/firestore";
import { seedUserData } from "@/data/seedUser";
import { db, firebaseReady } from "@/lib/firebase";
import type { UraiSeedData } from "@/lib/types";

export type DataSource = "firestore" | "seed" | "seed-fallback" | "seed-error-fallback";

export async function loadUserData(userId = seedUserData.user.id): Promise<{ source: DataSource; data: UraiSeedData }> {
  if (!firebaseReady || !db) {
    return { source: "seed", data: seedUserData };
  }

  try {
    const snapshot = await getDoc(doc(db, "tier1UserData", userId));
    if (!snapshot.exists()) {
      return { source: "seed-fallback", data: seedUserData };
    }

    return { source: "firestore", data: snapshot.data() as UraiSeedData };
  } catch (_error) {
    return { source: "seed-error-fallback", data: seedUserData };
  }
}
