'use client';

import { useCallback, useEffect, useRef } from 'react';
import { Editor } from '@tiptap/core';
import { ImageAttributes } from '@/lib/extensions/CustomImage';
import styles from './ImageToolbar.module.css';

interface ImageToolbarProps {
  editor: Editor;
  onClose: () => void;
}

export default function ImageToolbar({ editor, onClose }: ImageToolbarProps) {
  const toolbarRef = useRef<HTMLDivElement>(null);

  const updateImageAttributes = useCallback((attributes: Partial<ImageAttributes>) => {
    editor.chain().focus().updateImage(attributes).run();
  }, [editor]);

  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (toolbarRef.current && !toolbarRef.current.contains(event.target as Node)) {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [handleClickOutside]);

  const selectedNode = editor.state.selection.node;
  if (!selectedNode || selectedNode.type.name !== 'image') {
    return null;
  }

  const currentAttributes = selectedNode.attrs as ImageAttributes;

  return (
    <div ref={toolbarRef} className={styles.toolbar}>
      <div className={styles.toolbarGroup}>
        <label>Size</label>
        <select
          value={currentAttributes.size || 'medium'}
          onChange={(e) => updateImageAttributes({ size: e.target.value as 'small' | 'medium' | 'large' })}
        >
          <option value="small">Small</option>
          <option value="medium">Medium</option>
          <option value="large">Large</option>
        </select>
      </div>

      <div className={styles.toolbarGroup}>
        <label>Alignment</label>
        <select
          value={currentAttributes.alignment || 'center'}
          onChange={(e) => updateImageAttributes({ alignment: e.target.value as 'left' | 'center' | 'right' })}
        >
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
        </select>
      </div>

      <div className={styles.toolbarGroup}>
        <label>Caption</label>
        <input
          type="text"
          value={currentAttributes.caption || ''}
          onChange={(e) => updateImageAttributes({ caption: e.target.value })}
          placeholder="Add a caption..."
        />
      </div>

      <button
        type="button"
        onClick={onClose}
        className={styles.closeButton}
      >
        ×
      </button>
    </div>
  );
} 