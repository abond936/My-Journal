'use client';

import ViewNav from '@/components/view/ViewNav';

// This layout wraps the main content area for the "View" section
// It includes the ViewNav component, which is responsible for navigation and filtering controls

// The CardProvider has been moved to the root layout (src/app/layout.tsx) 
// to provide a global state for card data and filters across the entire application.
// This ensures that filter states persist when navigating between different sections
// like '/view' and '/admin'. We no longer need to instantiate it here.

export default function ViewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <ViewNav />
      <main style={{ flex: 1, overflowY: 'auto' }}>
        {children}
      </main>
    </div>
  );
} 