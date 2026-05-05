import { collection, doc, getDocs, orderBy, query, serverTimestamp, setDoc } from "firebase/firestore";
import { getFirebaseDb } from "../../lib/firebase/client";
import { normalizeInviteCode } from "./inviteAccess";

export type AdminInviteRecord = {
  inviteCode: string;
  email: string;
  status: "pending" | "invited" | "accepted" | "expired";
  createdAt?: unknown;
  invitedAt?: unknown;
  acceptedAt?: unknown;
  updatedAt?: unknown;
};

const COLLECTION = "early_access_invites";

export function generateInviteCode(prefix = "URAI") {
  const part = Math.random().toString(36).slice(2, 8).toUpperCase();
  return normalizeInviteCode(`${prefix}-${part}`);
}

export async function createAdminInvite(email: string, inviteCode = generateInviteCode()) {
  const cleanEmail = email.trim().toLowerCase();
  const cleanCode = normalizeInviteCode(inviteCode);

  if (!cleanEmail || !/^\S+@\S+\.\S+$/.test(cleanEmail)) {
    throw new Error("Enter a valid invite email.");
  }

  const db = getFirebaseDb();
  const ref = doc(db, COLLECTION, cleanCode);

  const invite = {
    inviteCode: cleanCode,
    email: cleanEmail,
    status: "invited",
    createdAt: serverTimestamp(),
    invitedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(ref, invite, { merge: true });
  return { ...invite, inviteCode: cleanCode, email: cleanEmail };
}

export async function listAdminInvites() {
  const db = getFirebaseDb();
  const q = query(collection(db, COLLECTION), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((d) => ({
    inviteCode: d.id,
    ...(d.data() as Omit<AdminInviteRecord, "inviteCode">),
  })) as AdminInviteRecord[];
}

export function inviteLink(code: string) {
  if (typeof window === "undefined") return `/invite/${normalizeInviteCode(code)}`;
  return `${window.location.origin}/invite/${normalizeInviteCode(code)}`;
}
