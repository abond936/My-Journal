'use client';

import React from 'react';
import { MediaProvider } from '@/components/providers/MediaProvider';
import MediaAdminContent from './MediaAdminContent';

export default function MediaAdminPage() {
  return (
    <MediaProvider>
      <MediaAdminContent />
    </MediaProvider>
  );
} 