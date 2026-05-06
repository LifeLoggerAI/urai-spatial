import { db } from "../config/firebase";
import { collection, query, orderBy, getDocs, addDoc } from "firebase/firestore";
import { SpatialMemory, ReplayEvent } from "../models/codex";

export const CodexRepository = {
  async getCanonChain(userId: string) {
    const colRef = collection(db, 'users', userId, 'spatialMemories');
    const q = query(colRef, orderBy('timestamp', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SpatialMemory));
  },
  async logReplayEvent(userId: string, event: Omit<ReplayEvent, 'id' | 'userId' | 'timestamp'>) {
    const colRef = collection(db, 'users', userId, 'replayEvents');
    return await addDoc(colRef, { ...event, userId, timestamp: Date.now() });
  }
};
