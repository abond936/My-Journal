// page.tsx - Main page component for the Next.js app
// This is the entry point for our application
// We're using the Home component as our landing page

import { Suspense } from 'react';
import Home from '@/components/view/Home';

export default function Page() {
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