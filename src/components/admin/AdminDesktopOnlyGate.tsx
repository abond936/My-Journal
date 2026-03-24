'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ADMIN_VIEWPORT_MIN_WIDTH_PX } from '@/lib/constants/adminViewport';
import styles from './AdminDesktopOnlyGate.module.css';

interface AdminDesktopOnlyGateProps {
  children: React.ReactNode;
}

export default function AdminDesktopOnlyGate({ children }: AdminDesktopOnlyGateProps) {
  const router = useRouter();
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${ADMIN_VIEWPORT_MIN_WIDTH_PX}px)`);
    const apply = () => setIsDesktop(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  if (isDesktop === null) {
    return <>{children}</>;
  }

  if (!isDesktop) {
    return (
      <div
        className={styles.backdrop}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-desktop-only-msg"
      >
        <div className={styles.modal}>
          <p id="admin-desktop-only-msg" className={styles.message}>
            Admin only available on desktop.
          </p>
          <button
            type="button"
            className={styles.button}
            onClick={() => router.push('/view')}
          >
            OK
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
