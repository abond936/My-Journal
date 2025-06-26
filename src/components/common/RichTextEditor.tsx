'use client';

import React, { useState, useCallback, useEffect, useRef, useMemo, useImperativeHandle, forwardRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Blockquote from '@tiptap/extension-blockquote';
import { FigureWithImage } from '@/lib/tiptap/extensions/FigureWithImage';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { Media } from '@/lib/types/photo';
import ImageToolbar from './ImageToolbar';
import styles from '@/components/common/RichTextEditor.module.css';
import { getDisplayUrl } from '@/lib/utils/photoUtils';
import clsx from 'clsx';

// Props interface defines what data and callbacks the component needs
interface RichTextEditorProps {
  initialContent?: string;
  onChange?: (content: string) => void;
  className?: string;
  isDisabled?: boolean;
  error?: string;
  onAddImage?: () => void;
  onImageDelete?: (src: string) => void;
}

// Export the Ref type so the parent component can use it.
export interface RichTextEditorRef {
  getContent: () => string;
  setContent: (content: string) => void;
  insertImage: (media: Media) => void;
}

// RichTextEditor component
const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(({
  initialContent = '',
  onChange,
  className,
  isDisabled = false,
  error,
  onAddImage,
  onImageDelete
}, ref) => {
  // Controlled state for content
  const [content, setContent] = useState(initialContent);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Initialize the TipTap editor with custom extensions
  const editor = useEditor({
    extensions: [
      StarterKit,
      Blockquote,
      FigureWithImage.configure({
        HTMLAttributes: {
          class: 'figure',
        },
      }),
      Image,
      Link,
    ],
    content: content,
    editable: !isDisabled,
    onUpdate: ({ editor }) => {
      const newContent = editor.getHTML();
      setContent(newContent);
      onChange?.(newContent);
    },
    editorProps: {
      attributes: {
        class: clsx(styles.editor, className, {
          [styles.isDisabled]: isDisabled,
          [styles.isProcessing]: isProcessingImage
        }),
      },
      handleDrop: (view, event, slice, moved) => {
        if (!moved && event.dataTransfer?.files?.length) {
          const file = event.dataTransfer.files[0];
          if (file.type.startsWith('image/')) {
            event.preventDefault();
            handleImageUpload(file);
            return true;
          }
        }
        return false;
      },
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;

        const imageItem = Array.from(items).find(item => item.type.startsWith('image/'));
        if (imageItem) {
          event.preventDefault();
          const file = imageItem.getAsFile();
          if (file) {
            handleImageUpload(file);
            return true;
          }
        }
        return false;
      },
    },
  });

  // Handle image uploads using the current image service
  const handleImageUpload = async (file: File) => {
    if (isDisabled || isProcessingImage) return;

    setIsProcessingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/images/browser/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to upload image');
      }

      const media: Media = await response.json();
      
      if (editor) {
        const displayUrl = getDisplayUrl(media);
        editor.chain().focus().setFigureWithImage({
          src: displayUrl,
          alt: media.filename,
          width: media.width,
          height: media.height,
          caption: media.caption || media.filename,
          mediaId: media.id, // Store the media ID for future reference
        }).run();
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      // Could add error UI feedback here if needed
    } finally {
      setIsProcessingImage(false);
    }
  };

  // Expose methods to the parent component via ref
  useImperativeHandle(ref, () => ({
    getContent: () => content,
    setContent: (newContent: string) => {
      setContent(newContent);
      if (editor) {
        editor.commands.setContent(newContent, false);
      }
    },
    insertImage: (media: Media) => {
      if (editor) {
        const displayUrl = getDisplayUrl(media);
        editor.chain().focus().setFigureWithImage({
          src: displayUrl,
          alt: media.filename,
          width: media.width,
          height: media.height,
          caption: media.caption || media.filename,
          mediaId: media.id,
        }).run();
      }
    }
  }));

  // Effect to update editor content when initialContent changes
  useEffect(() => {
    if (initialContent !== content) {
      setContent(initialContent);
      if (editor) {
        editor.commands.setContent(initialContent, false);
      }
    }
  }, [initialContent, editor]);

  const handleToolbarAction = (action: 'setSize' | 'setAlignment' | 'setAspectRatio' | 'delete', value?: string) => {
    if (!editor) return;

    if (action === 'delete') {
        const src = editor.getAttributes('figureWithImage').src;
        if (src && onImageDelete) {
            onImageDelete(src);
        }
        editor.chain().focus().deleteSelection().run();
        return;
    }

    if (editor.isActive('figureWithImage')) {
        let attr = '';
        if (action === 'setSize') attr = 'data-size';
        else if (action === 'setAlignment') attr = 'data-alignment';
        else if (action === 'setAspectRatio') attr = 'data-aspect-ratio';
        
      editor.chain().focus().updateAttributes('figureWithImage', { [attr]: value }).run();
    }
  };

  if (!editor) return null;

  return (
    <div className={clsx(styles.container, className)}>
      {isProcessingImage && (
        <div className={styles.processingOverlay}>
          <div className={styles.spinner} />
          <p>Processing image...</p>
        </div>
      )}
      <div className={styles.toolbar}>
        <div className={styles.toolbarGroup}>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={clsx(styles.toolbarButton, { [styles.active]: editor.isActive('bold') })}
            disabled={isDisabled}
          >
            Bold
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={clsx(styles.toolbarButton, { [styles.active]: editor.isActive('italic') })}
            disabled={isDisabled}
          >
            Italic
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={clsx(styles.toolbarButton, { [styles.active]: editor.isActive('heading', { level: 1 }) })}
            disabled={isDisabled}
          >
            H1
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={clsx(styles.toolbarButton, { [styles.active]: editor.isActive('heading', { level: 2 }) })}
            disabled={isDisabled}
          >
            H2
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={clsx(styles.toolbarButton, { [styles.active]: editor.isActive('blockquote') })}
            disabled={isDisabled}
          >
            Quote
          </button>
          {onAddImage && (
            <button
              type="button"
              onClick={onAddImage}
              className={clsx(styles.toolbarButton, { [styles.disabled]: isDisabled })}
              disabled={isDisabled}
            >
              Add Image
            </button>
          )}
        </div>
        
        {editor.isActive('figureWithImage') && (
          <ImageToolbar
            ref={toolbarRef}
            onAction={handleToolbarAction}
            className={styles.imageToolbar}
          />
        )}
      </div>
      
      <EditorContent editor={editor} className={styles.editorContent} />
    </div>
  );
});

RichTextEditor.displayName = 'RichTextEditor';

export default RichTextEditor;