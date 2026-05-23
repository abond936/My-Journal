import React, { useCallback, useState } from 'react';
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import { NodeSelection } from 'prosemirror-state';
import JournalImage from '@/components/common/JournalImage';
import styles from './FigureWithImageView.module.css';
import type { FigureImageSize } from '@/lib/tiptap/extensions/FigureWithImage';

const FIGURE_SIZE_CLASSES: FigureImageSize[] = ['xsmall', 'small', 'medium', 'large'];

export const FigureWithImageView = ({ node, editor, getPos }) => {
  const {
    src,
    alt,
    width,
    height,
    'data-size': sizeRaw,
    'data-alignment': alignment,
    'data-wrap': wrap,
    'data-media-id': mediaId,
  } = node.attrs;

  const [isDragging, setIsDragging] = useState(false);

  const selectNodeManually = useCallback(() => {
    if (editor && getPos) {
      const { tr } = editor.view.state;
      const selection = NodeSelection.create(editor.view.state.doc, getPos());
      editor.view.dispatch(tr.setSelection(selection));
    }
  }, [editor, getPos]);

  const handleImagePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    selectNodeManually();
  };

  const handleImageDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    selectNodeManually();
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/x-myjournal-figure', mediaId || 'figure');
    e.dataTransfer.setData('text/plain', mediaId || alt || 'image');
    e.dataTransfer.setDragImage(e.currentTarget, e.currentTarget.clientWidth / 2, 24);
  };

  const handleImageDragEnd = () => {
    setIsDragging(false);
  };
  
  if (!src || !width || !height) {
    return null;
  }

  const size: FigureImageSize = FIGURE_SIZE_CLASSES.includes(sizeRaw as FigureImageSize)
    ? (sizeRaw as FigureImageSize)
    : 'medium';

  return (
    <NodeViewWrapper
      as="figure"
      className={`${styles.figureWrapper} ${styles[alignment]} ${styles[size]} ${isDragging ? styles.figureDragging : ''}`}
      data-wrap={wrap || 'off'}
      data-media-id={mediaId}
      data-dragging={isDragging ? 'true' : 'false'}
    >
      <div
        onClick={selectNodeManually}
        onPointerDown={handleImagePointerDown}
        onDragStart={handleImageDragStart}
        onDragEnd={handleImageDragEnd}
        className={styles.imageContainer}
        data-drag-handle
        draggable
        contentEditable={false}
      >
        <JournalImage
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
