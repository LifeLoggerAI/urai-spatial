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
const LOCAL_STORAGE_KEY = "urai:admin-invites";

function isLiveAdminFirestoreEnabled() {
  return process.env.NEXT_PUBLIC_URAI_ADMIN_FIRESTORE === "true";
}

function readLocalInvites(): AdminInviteRecord[] {
  if (typeof window === "undefined") return [];

  try {
    return JSON.parse(window.localStorage.getItem(LOCAL_STORAGE_KEY) ?? "[]") as AdminInviteRecord[];
  } catch {
    return [];
  }
}

function writeLocalInvites(invites: AdminInviteRecord[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(invites.slice(0, 250)));
}

function upsertLocalInvite(invite: AdminInviteRecord) {
  const current = readLocalInvites();
  const next = [invite, ...current.filter((item) => item.inviteCode !== invite.inviteCode)];
  writeLocalInvites(next);
  return invite;
}

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

  const localInvite: AdminInviteRecord = {
    inviteCode: cleanCode,
    email: cleanEmail,
    status: "invited",
    createdAt: new Date().toISOString(),
    invitedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (!isLiveAdminFirestoreEnabled()) {
    return upsertLocalInvite(localInvite);
  }

  try {
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
    return upsertLocalInvite(localInvite);
  } catch (error) {
    console.warn("[URAI] Admin invite Firestore write failed; local fallback saved.", error);
    return upsertLocalInvite(localInvite);
  }
}

export async function listAdminInvites() {
  if (!isLiveAdminFirestoreEnabled()) {
    return readLocalInvites();
  }

  try {
    const db = getFirebaseDb();
    const q = query(collection(db, COLLECTION), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);

    const remoteInvites = snapshot.docs.map((d) => ({
      inviteCode: d.id,
      ...(d.data() as Omit<AdminInviteRecord, "inviteCode">),
    })) as AdminInviteRecord[];

    writeLocalInvites(remoteInvites);
    return remoteInvites;
  } catch (error) {
    console.warn("[URAI] Admin invite Firestore read failed; using local fallback.", error);
    return readLocalInvites();
  }
}

export function inviteLink(code: string) {
  if (typeof window === "undefined") return `/invite/${normalizeInviteCode(code)}`;
  return `${window.location.origin}/invite/${normalizeInviteCode(code)}`;
}

export function adminInviteMode() {
  return isLiveAdminFirestoreEnabled() ? "firestore" : "local";
}
