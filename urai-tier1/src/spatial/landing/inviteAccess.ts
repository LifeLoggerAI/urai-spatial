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

const COLLECTION = "early_access_invites";

export function normalizeInviteCode(code: string) {
  return code.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
}

export async function acceptInvite(inviteCode: string, email?: string) {
  const cleanCode = normalizeInviteCode(inviteCode);

  if (!cleanCode || cleanCode.length < 4) {
    throw new Error("Invite code is missing or invalid.");
  }

  const db = getFirebaseDb();
  const ref = doc(db, COLLECTION, cleanCode);
  const snapshot = await getDoc(ref);

  if (!snapshot.exists()) {
    throw new Error("Invite not found.");
  }

  const data = snapshot.data();

  if (data.status === "accepted") {
    return data;
  }

  const updated = {
    ...data,
    status: "accepted",
    email: email ?? data.email ?? "",
    acceptedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(ref, updated, { merge: true });

  if (typeof window !== "undefined") {
    window.localStorage.setItem("urai:invite-accepted", cleanCode);
  }

  return updated;
}
