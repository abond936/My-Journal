import React from 'react';
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import styles from './FigureWithImageView.module.css';

export const FigureWithImageView = ({ node, updateAttributes, editor }) => {
  const { 'data-size': size, 'data-alignment': alignment, 'data-aspect-ratio': aspectRatio } = node.attrs;

  const onSizeChange = (newSize) => {
    updateAttributes({ 'data-size': newSize });
  };

  const onAlignmentChange = (newAlignment) => {
    updateAttributes({ 'data-alignment': newAlignment });
  };

  return (
    <NodeViewWrapper className={`${styles.figureWrapper} ${styles[alignment]} ${styles[size]}`}>
      <figure
        data-size={size}
        data-alignment={alignment}
        data-aspect-ratio={aspectRatio}
        className={styles.figure}
        style={{ aspectRatio: aspectRatio?.replace(':', ' / ') }}
      >
        <img src={node.attrs.src} alt={node.attrs.alt} className={styles.image} />
        <NodeViewContent as="figcaption" className={styles.caption} onKeyDown={e => e.stopPropagation()} />
      </figure>
    </NodeViewWrapper>
  );
}; 