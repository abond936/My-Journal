import React from 'react';
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import Image from 'next/image'; // Import the Next.js Image component
import styles from './FigureWithImageView.module.css';

export const FigureWithImageView = ({ node, updateAttributes, editor }) => {
  // Destructure all attributes from the node, including the new width and height
  const { 
    src, 
    alt, 
    width, 
    height,
    'data-size': size, 
    'data-alignment': alignment 
  } = node.attrs;

  // If we don't have the necessary info for next/image, render nothing to avoid an error.
  if (!src || !width || !height) {
    return null;
  }

  return (
    // The NodeViewWrapper provides the figure element and handles positioning.
    // The styles for alignment (left/center/right) and size (small/medium/large)
    // will be applied to this wrapper.
    <NodeViewWrapper 
      className={`${styles.figureWrapper} ${styles[alignment]} ${styles[size]}`}
    >
      {/* 
        The Next.js Image component handles optimized image loading.
        'width' and 'height' props are mandatory for Next.js to prevent layout shift.
        'sizes' attribute helps Next.js serve appropriately sized images based on viewport.
      */}
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        className={styles.image}
      />
      {/* The NodeViewContent component renders the editable figcaption. */}
      <NodeViewContent as="figcaption" className={styles.caption} />
    </NodeViewWrapper>
  );
};