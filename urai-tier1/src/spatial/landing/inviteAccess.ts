export type InviteAccessStatus = "pending" | "invited" | "accepted" | "expired";

export type InviteAccessRecord = {
  email: string;
  inviteCode: string;
  status: InviteAccessStatus;
  createdAt: string;
  invitedAt?: string;
  acceptedAt?: string;
};

const INVITE_STORAGE_KEY = "urai:invite-access";

export function normalizeInviteCode(code: string) {
  return code.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
}

export function createInviteRecord(email: string, inviteCode: string): InviteAccessRecord {
  return {
    email: email.trim().toLowerCase(),
    inviteCode: normalizeInviteCode(inviteCode),
    status: "pending",
    createdAt: new Date().toISOString(),
  };
}

export async function acceptInvite(inviteCode: string, email?: string) {
  const cleanCode = normalizeInviteCode(inviteCode);

  if (!cleanCode || cleanCode.length < 4) {
    throw new Error("Invite code is missing or invalid.");
  }

  const record: InviteAccessRecord = {
    email: (email ?? "").trim().toLowerCase(),
    inviteCode: cleanCode,
    status: "accepted",
    createdAt: new Date().toISOString(),
    acceptedAt: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    const current = JSON.parse(window.localStorage.getItem(INVITE_STORAGE_KEY) ?? "[]") as InviteAccessRecord[];
    window.localStorage.setItem(INVITE_STORAGE_KEY, JSON.stringify([record, ...current].slice(0, 250)));
    window.localStorage.setItem("urai:invite-accepted", cleanCode);
  }

  // Firestore target collection: early_access_invites
  // Replace local fallback with a lookup/update once Firebase client is available here.
  return record;
}
