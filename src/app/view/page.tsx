'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import styles from './ViewChoice.module.css';
import { useRouter } from 'next/navigation';

export default function ViewChoicePage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/cards');
  }, [router]);
  return null;
}