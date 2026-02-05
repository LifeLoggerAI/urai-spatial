'use client';

import { useState, useEffect } from 'react';
import { getAuth, signInWithPopup, GoogleAuthProvider, User } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebaseClient';

const auth = getAuth(app);
const functions = getFunctions(app);

const seedSpatialDemoData = httpsCallable(functions, 'seedSpatialDemoData');

export default function AdminSpatialConsolePage() {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
    });
    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error: any) { 
      setError(error.message);
    }
  };

  const handleSeedData = async () => {
    setLoading(true);
    try {
      const result = await seedSpatialDemoData();
      console.log(result.data);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="bg-black text-white min-h-screen flex items-center justify-center">
        <button onClick={handleSignIn} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
          Sign In with Google
        </button>
      </div>
    );
  }

  return (
    <div className="bg-black text-white min-h-screen flex flex-col items-center justify-center">
      <h1 className="text-3xl font-bold mb-8">Admin Spatial Console</h1>
      <button
        onClick={handleSeedData}
        disabled={loading}
        className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:bg-gray-500"
      >
        {loading ? 'Seeding...' : 'Seed Demo Data'}
      </button>
      {error && <p className="text-red-500 mt-4">{error}</p>}
    </div>
  );
}
