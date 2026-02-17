
import { getFirestore, collection, getDocs, query, orderBy, limit, startAfter, DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { app } from './firebaseClient';
import { Memory } from '../apps/spatial-web/src/lib/types';

const db = getFirestore(app);
const MEMORIES_PAGE_SIZE = 50; // Set a reasonable page size

export async function getMemories(lastDoc?: QueryDocumentSnapshot<DocumentData>): Promise<{ memories: Memory[], lastVisible: QueryDocumentSnapshot<DocumentData> | null }> {
  const memoriesCol = collection(db, 'publicMemories'); // Query public memories
  
  let q;
  if (lastDoc) {
    q = query(memoriesCol, orderBy('createdAt', 'desc'), startAfter(lastDoc), limit(MEMORIES_PAGE_SIZE));
  } else {
    q = query(memoriesCol, orderBy('createdAt', 'desc'), limit(MEMORIES_PAGE_SIZE));
  }

  const memorySnapshot = await getDocs(q);
  const memories: Memory[] = [];
  memorySnapshot.forEach((doc) => {
    memories.push({ id: doc.id, ...doc.data() } as Memory);
  });

  const lastVisible = memorySnapshot.docs[memorySnapshot.docs.length - 1] || null;

  return { memories, lastVisible };
}
