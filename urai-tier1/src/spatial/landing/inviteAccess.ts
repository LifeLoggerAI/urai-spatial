import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { getFirebaseDb } from "../../lib/firebase/client";

export type InviteAccessStatus = "pending" | "invited" | "accepted" | "expired";

export type InviteAccessRecord = {
  email: string;
  inviteCode: string;
  status: InviteAccessStatus;
  createdAt: string;
  invitedAt?: string;
  acceptedAt?: string;
};

export type InviteAccessResult = {
  ok: boolean;
  code: string;
  status: "accepted" | "missing" | "invalid" | "offline";
};

const COLLECTION = "early_access_invites";

export function normalizeInviteCode(code: string) {
  return code.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
}

export async function acceptInvite(code: string, email?: string): Promise<InviteAccessResult> {
  const cleanCode = normalizeInviteCode(code);

  if (!cleanCode || cleanCode.length < 4) {
    return {
      ok: false,
      code: cleanCode,
      status: "invalid",
    };
  }

  try {
    const db = getFirebaseDb();
    const ref = doc(db, COLLECTION, cleanCode);
    const snapshot = await getDoc(ref);

    if (!snapshot.exists()) {
      return {
        ok: false,
        code: cleanCode,
        status: "missing",
      };
    }

    const data = snapshot.data();

    if (data.status !== "accepted") {
      await setDoc(
        ref,
        {
          ...data,
          status: "accepted",
          email: email ?? data.email ?? "",
          acceptedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    }

    if (typeof window !== "undefined") {
      window.localStorage.setItem("urai:invite-accepted", cleanCode);
    }

    return {
      ok: true,
      code: cleanCode,
      status: "accepted",
    };
  } catch (error) {
    console.warn("[URAI] Invite check failed; showing offline fallback.", error);

    return {
      ok: false,
      code: cleanCode,
      status: "offline",
    };
  }
}
