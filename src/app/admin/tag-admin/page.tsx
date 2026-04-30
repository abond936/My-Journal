'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminTagRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/studio');
  }, [router]);

  return null;
}
