import type { Metadata } from 'next';
import { Suspense } from 'react';
import Home from '@/components/view/Home';

export const metadata: Metadata = {
  title: 'Sign in — My Stories',
  description: 'Sign in to My Stories.',
};

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: '2rem', textAlign: 'center' }}>Loading…</div>
      }
    >
      <Home />
    </Suspense>
  );
}
