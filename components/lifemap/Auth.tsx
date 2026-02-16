import { useState, useEffect } from "react";
import { onAuthStateChanged, signInAnonymously, signOut, User } from "firebase/auth";
import { auth } from "@/firebase/clientApp";

export default function Auth() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 100 }}>
      {user ? (
        <button onClick={() => signOut(auth)}>Sign Out</button>
      ) : (
        <button onClick={() => signInAnonymously(auth)}>Sign In Anonymously</button>
      )}
    </div>
  );
}
