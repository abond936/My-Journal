'use client';

import React from 'react';
import Image, { ImageProps } from 'next/image';
import type { MediaPresentationRotation } from '@/lib/types/mediaPresentation';

type JournalImageProps = Omit<ImageProps, 'alt'> & {
  alt: string;
  presentationRotation?: MediaPresentationRotation;
};

/**
 * Wrapper around Next.js Image that uses unoptimized for media URLs.
 * Avoids 403 "upstream image response failed" when Firebase Storage or other
 * external hosts reject Next.js server-side optimization requests.
 */
export default function JournalImage(props: JournalImageProps) {
  const { alt, presentationRotation = 0, style, ...rest } = props;
  return (
    <Image
      alt={alt}
      {...rest}
      style={{ ...style, ...(presentationRotation ? { transform: `rotate(${presentationRotation}deg)` } : {}) }}
      unoptimized
    />
  );
}
