'use client';

import React from 'react';
import Image, { ImageProps } from 'next/image';

/**
 * Wrapper around Next.js Image that uses unoptimized for media URLs.
 * Avoids 403 "upstream image response failed" when Firebase Storage or other
 * external hosts reject Next.js server-side optimization requests.
 */
export default function JournalImage(props: ImageProps) {
  return <Image {...props} unoptimized />;
}
