'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import styles from './invite.module.css';

export default function InviteAcceptClient() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const started = useRef(false);
  const [state, setState] = useState<'opening' | 'invalid'>('opening');

  useEffect(() => {
    if (status === 'loading' || started.current) return;
    if (session?.user) return;
    started.current = true;

    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const token = params.get('token') ?? '';
    window.history.replaceState({}, '', '/invite');
    if (!token) {
      setState('invalid');
      return;
    }

    void signIn('guest-invite', { token, redirect: false, callbackUrl: '/view' })
      .then((result) => {
        if (!result?.ok) {
          setState('invalid');
          return;
        }
        router.replace('/view');
        router.refresh();
      })
      .catch(() => setState('invalid'));
  }, [router, session, status]);

  if (status === 'authenticated') {
    return (
      <main className={styles.page}>
        <section className={styles.card}>
          <h1>You are already signed in</h1>
          <p>Open the Reader with your current access, or sign out before opening an invitation for someone else.</p>
          <Link className={styles.action} href="/view">Open Reader</Link>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <section className={styles.card} aria-live="polite">
        <h1>{state === 'opening' ? 'Opening your invitation…' : 'This invitation cannot be used'}</h1>
        {state === 'opening' ? (
          <p>Please wait while My Stories opens your private Reader access.</p>
        ) : (
          <>
            <p>The link is invalid, expired, or has already been used. Ask the author for a new invitation.</p>
            <Link className={styles.secondary} href="/login">Use account sign-in</Link>
          </>
        )}
      </section>
    </main>
  );
}
