import React from 'react';
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import { NodeSelection } from 'prosemirror-state';
import Image from 'next/image';
import styles from './FigureWithImageView.module.css';

export const FigureWithImageView = ({ node, updateAttributes, editor, selected, getPos }) => {
  const {
    src,
    alt,
    width,
    height,
    'data-size': size,
    'data-alignment': alignment,
    'data-wrap': wrap,
    'data-media-id': mediaId,
  } = node.attrs;

  const selectNodeManually = () => {
    if (editor && getPos) {
      const { tr } = editor.view.state;
      const selection = NodeSelection.create(editor.view.state.doc, getPos());
      editor.view.dispatch(tr.setSelection(selection));
    }
  };

  // This is the fix for the drag handle bug.
  // It stops the mousedown event from bubbling up and interfering with other listeners.
  const handleDragHandleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
  };
  
  if (!src || !width || !height) {
    return null;
  }

  return (
    <NodeViewWrapper
      as="figure"
      className={`${styles.figureWrapper} ${styles[alignment]} ${styles[size]}`}
      data-wrap={wrap || 'off'}
      data-media-id={mediaId}
    >
      <div 
        className={styles.dragHandle} 
        data-drag-handle 
        onMouseDown={handleDragHandleMouseDown}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
          <path d="M10 4h4v4h-4zM4 10h4v4H4zM16 10h4v4h-4zM10 16h4v4h-4zM4 16h4v4H4zM16 16h4v4h-4zM4 4h4v4H4zM10 10h4v4h-4zM16 4h4v4h-4z" />
        </svg>
      </div>
      
      <div onClick={selectNodeManually} className={styles.imageContainer}>
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className={styles.image}
          data-media-id={mediaId}
        />
      </div>
      
      <NodeViewContent as="figcaption" className={styles.caption} />
    </NodeViewWrapper>
  );
};