
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { app } from './firebaseClient';
import { Memory } from '../apps/spatial-web/src/lib/types';

const db = getFirestore(app);

export async function getMemories(): Promise<Memory[]> {
  const memoriesCol = collection(db, 'memories');
  const memorySnapshot = await getDocs(memoriesCol);
  const memories: Memory[] = [];
  memorySnapshot.forEach((doc) => {
    memories.push({ id: doc.id, ...doc.data() } as Memory);
  });
  return memories;
}
