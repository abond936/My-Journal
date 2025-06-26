'use client';

import { useEffect } from 'react';
import { useCardForm } from '@/components/providers/CardFormProvider';

export default function NavigationGuard() {
  const { formState: { isDirty } } = useCardForm();

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    const handlePushState = () => {
      if (isDirty && !window.confirm('You have unsaved changes. Are you sure you want to leave?')) {
        window.history.pushState(null, '', window.location.href);
      }
    };

    // Handle browser back/forward
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePushState);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePushState);
    };
  }, [isDirty]);

  return null;
} 