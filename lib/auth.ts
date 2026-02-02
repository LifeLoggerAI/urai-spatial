'use client';

import { auth } from './firebaseClient';
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, User, signOut as firebaseSignOut } from 'firebase/auth';
import { useEffect, useState } from 'react';

const provider = new GoogleAuthProvider();

export const signInWithGoogle = () => {
  signInWithPopup(auth, provider)
    .catch((error) => {
      console.error("Error signing in with Google", error);
    });
};

export const signOut = () => {
  firebaseSignOut(auth).catch((error) => {
    console.error("Error signing out", error);
  });
};

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });
    return () => unsubscribe();
  }, []);

  return { user };
};
