'use client';

import { useAuth, signInWithGoogle, signOut } from '@/lib/auth';
import { functions } from '@/lib/firebaseClient';
import { httpsCallable } from 'firebase/functions';

const seedData = httpsCallable(functions, 'seedSpatialDemoData');

export default function AdminConsolePage() {
  const { user } = useAuth();

  const handleSeedData = async () => {
    try {
      await seedData();
      alert('Demo data seeded successfully!');
    } catch (error) {
      console.error("Error seeding data", error);
      alert('Error seeding data. Check console for details.');
    }
  };

  return (
    <div style={{ padding: '2rem', background: 'black', color: 'white', minHeight: '100vh' }}>
      <h1>Spatial Console</h1>
      {user ? (
        <div>
          <p>Welcome, {user.displayName}</p>
          <button onClick={handleSeedData} style={{ padding: '0.5rem 1rem', marginRight: '1rem' }}>Seed Demo Data</button>
          <button onClick={signOut} style={{ padding: '0.5rem 1rem' }}>Sign Out</button>
        </div>
      ) : (
        <div>
          <p>Please sign in to access the admin console.</p>
          <button onClick={signInWithGoogle} style={{ padding: '0.5rem 1rem' }}>Sign in with Google</button>
        </div>
      )}
    </div>
  );
}
