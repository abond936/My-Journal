import React, { useState } from 'react';
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import { NodeSelection } from 'prosemirror-state';
import Image from 'next/image'; // Import the Next.js Image component
import styles from './FigureWithImageView.module.css';

export const FigureWithImageView = ({ node, updateAttributes, editor, selected, getPos }) => {

  // Destructure all attributes from the node, including the new width and height
  const { 
    src, 
    alt, 
    width, 
    height,
    'data-size': size, 
    'data-alignment': alignment,
    'data-media-id': mediaId,
    'data-media-type': mediaType
  } = node.attrs;

  const selectNodeManually = () => {
    // When the image container is clicked, we manually create a NodeSelection
    // and dispatch it to the editor. This forces Tiptap to select the node.
    if (editor && getPos) {
      const { tr } = editor.view.state;
      const selection = NodeSelection.create(editor.view.state.doc, getPos());
      editor.view.dispatch(tr.setSelection(selection));
    }
  };

  // If we don't have the necessary info for next/image, render nothing to avoid an error.
  if (!src || !width || !height) {
    return null;
  }

  return (
    // The NodeViewWrapper provides the figure element and handles positioning.
    // The styles for alignment (left/center/right) and size (small/medium/large)
    // will be applied to this wrapper.
    <NodeViewWrapper 
      as="figure"
      className={`${styles.figureWrapper} ${styles[alignment]} ${styles[size]} ${selected ? 'ProseMirror-selectednode' : ''}`}
      data-media-id={mediaId}
      data-media-type={mediaType}
    >
      <div className={styles.dragHandle} data-drag-handle>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
          <path d="M10 4h4v4h-4zM4 10h4v4H4zM16 10h4v4h-4zM10 16h4v4h-4zM4 16h4v4H4zM16 16h4v4h-4zM4 4h4v4H4zM10 10h4v4h-4zM16 4h4v4h-4z" />
        </svg>
      </div>
      {/* 
        This wrapper is the key. Its onClick forces the node selection.
      */}
      <div onClick={selectNodeManually} className={styles.imageContainer}>
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className={styles.image}
          data-media-id={mediaId}
          data-media-type={mediaType}
        />
      </div>
      {/* The NodeViewContent component renders the editable figcaption. */}
      <NodeViewContent as="figcaption" className={styles.caption} />
    </NodeViewWrapper>
  );
};