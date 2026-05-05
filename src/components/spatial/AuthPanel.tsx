'use client';

import { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { firebaseAuth } from '@/lib/firebaseClient';
import { useUserEntitlement } from '@/hooks/useUserEntitlement';

export default function AuthPanel() {
  const { user, status, error, refreshEntitlement } = useUserEntitlement();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const run = async (mode: 'signin' | 'signup') => {
    setBusy(true);
    setMessage(null);
    try {
      if (mode === 'signup') {
        await createUserWithEmailAndPassword(firebaseAuth, email, password);
      } else {
        await signInWithEmailAndPassword(firebaseAuth, email, password);
      }
      await refreshEntitlement();
      setMessage(mode === 'signup' ? 'Account created.' : 'Signed in.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setBusy(false);
    }
  };

  if (user) {
    return (
      <section className="auth-panel">
        <div>
          <strong>Signed in</strong>
          <p>{user.email ?? user.uid}</p>
          <small>Entitlement: {status}{error ? ` · ${error}` : ''}</small>
        </div>
        <button type="button" onClick={() => signOut(firebaseAuth)}>Sign out</button>
        <style jsx>{styles}</style>
      </section>
    );
  }

  return (
    <section className="auth-panel">
      <div>
        <strong>Sign in to unlock paid reports</strong>
        <p>Use email/password to connect Stripe purchases to your URAI account.</p>
      </div>
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" />
      <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" />
      <div className="actions">
        <button type="button" disabled={busy || !email || !password} onClick={() => run('signin')}>Sign in</button>
        <button type="button" disabled={busy || !email || !password} onClick={() => run('signup')}>Create account</button>
      </div>
      {message && <small>{message}</small>}
      <style jsx>{styles}</style>
    </section>
  );
}

const styles = `
  .auth-panel{border:1px solid rgba(157,196,255,.3);border-radius:16px;background:rgba(7,10,25,.82);color:#eef3ff;padding:1rem;display:grid;gap:.65rem}
  .auth-panel p{margin:.25rem 0;color:rgba(238,243,255,.75)}
  input{border:1px solid rgba(180,215,255,.3);border-radius:999px;background:rgba(18,31,68,.72);color:#eef3ff;padding:.6rem .8rem}
  .actions{display:flex;gap:.5rem;flex-wrap:wrap}
  button{border:1px solid rgba(180,215,255,.42);background:rgba(18,31,68,.82);color:#eef3ff;border-radius:999px;padding:.5rem .75rem}
  button:disabled{opacity:.5;cursor:not-allowed}
`;
