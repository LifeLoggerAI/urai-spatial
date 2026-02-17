'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { useFirestoreDocumentData } from 'reactfire';
import { doc, getFirestore } from 'firebase/firestore';
import { app } from '../../../../lib/firebaseClient';

const db = getFirestore(app);

function ReplayPage() {
  const searchParams = useSearchParams();
  const memoryId = searchParams.get('memoryId');

  const memoryRef = doc(db, 'memories', memoryId);
  const { status, data: memory } = useFirestoreDocumentData(memoryRef);

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  if (!memory) {
    return <div>Memory not found</div>;
  }

  return (
    <div>
      <h1>Replay</h1>
      <h2>{memory.title}</h2>
      <p>{memory.description}</p>
    </div>
  );
}

export default ReplayPage;
