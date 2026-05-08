import { db } from "../config/firebase";
import { collection, doc, addDoc, setDoc, query, where, getDocs } from "firebase/firestore";
import { SpatialMemory, HomeWorld } from "../models/types";

export const SpatialRepository = {
  async saveMemory(userId: string, data: Omit<SpatialMemory, 'id' | 'userId'>) {
    const colRef = collection(db, 'users', userId, 'spatialMemories');
    return await addDoc(colRef, { ...data, userId, timestamp: Date.now() });
  },

  async getMemories(userId: string): Promise<SpatialMemory[]> {
    const colRef = collection(db, 'users', userId, 'spatialMemories');
    const q = query(colRef);
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SpatialMemory));
  },

  async updateHomeWorld(userId: string, worldId: string, data: Partial<HomeWorld>) {
    const docRef = doc(db, 'users', userId, 'homeWorld', worldId);
    return await setDoc(docRef, { ...data, lastModified: Date.now() }, { merge: true });
  }
};
