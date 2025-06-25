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

// Props interface defines what data and callbacks the component needs
interface RichTextEditorProps {
  content: string;        // The initial HTML content
  onAddImage?: () => void; // Called when the user wants to add an image
  onImageDelete?: (imageUrl: string) => void; // Called when an image is deleted
  isUploading?: boolean;   // To show upload progress/feedback
}

// Export the Ref type so the parent component can use it.
export interface RichTextEditorRef {
  getContent: () => string;
  addImage: (photo: Media) => void;
}

// RichTextEditor component
const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(({
  content,
  onAddImage,
  onImageDelete,
  isUploading,
}, ref) => {
  const editorRef = useRef<HTMLDivElement>(null);

  // State management for various editor features
  const [showPhotoPicker, setShowPhotoPicker] = useState(false); // This state is no longer used here but kept for context if needed later
  const toolbarRef = useRef<HTMLDivElement>(null); // Reference to the image toolbar
  const [isFileUploading, setIsFileUploading] = useState(false); // For drag/drop and paste

  // Initialize the TipTap editor with custom extensions
  const editor = useEditor({
    extensions: [
      StarterKit, // Basic text formatting (bold, italic, lists, etc.)
      Blockquote, // Add the blockquote extension
      FigureWithImage.configure({ // Our custom extension
        HTMLAttributes: {
          class: 'figure',
        },
      }),
      Image,
      Link,
    ],
    content: content, // Set initial content
    editorProps: {
      handleDrop(view, event, slice, moved) {
        if (
          !moved &&
          event.dataTransfer &&
          event.dataTransfer.files &&
          event.dataTransfer.files[0]
        ) {
          event.preventDefault();
          const file = event.dataTransfer.files[0];
          handleFileUpload(file);
          return true; // Mark as handled
        }
        return false; // Not handled, let Tiptap proceed
      },
      handlePaste(view, event, slice) {
        const items = event.clipboardData?.items;
        if (!items) {
          return false; // No clipboard data
        }
        
        // Find the first image item in the clipboard
        const imageItem = Array.from(items).find(item => item.type.startsWith('image/'));

        if (imageItem) {
          event.preventDefault();
          const file = imageItem.getAsFile();
          if (file) {
            handleFileUpload(file);
            return true; // Mark as handled
          }
        }

        return false; // Not an image, let Tiptap handle it
      },
    },
    // onUpdate is no longer needed as the parent will pull content on demand
  });

  const memoizedEditor = useMemo(() => editor, [editor]);

  // Effect to update editor content when the external `content` prop changes.
  useEffect(() => {
    if (editor && editor.getHTML() !== content) {
      editor.commands.setContent(content, false);
    }
  }, [content, editor]);

  // Expose methods to the parent component via the ref
  useImperativeHandle(ref, () => ({
    /**
     * Returns the current HTML content of the editor.
     */
    getContent: () => {
      return editor?.getHTML() || '';
    },
    /**
     * Inserts an image into the editor at the current cursor position.
     * @param photo The metadata of the photo to insert.
     */
    addImage: (photo: Media) => {
      if (editor) {
        const displayUrl = getDisplayUrl(photo);
        editor.chain().focus().setFigureWithImage({ 
          src: displayUrl,
          alt: photo.filename,
          width: photo.width,
          height: photo.height,
          caption: photo.filename,
        }).run();
      }
    }
  }));

  const handleToolbarAction = (action: 'setSize' | 'setAlignment' | 'setAspectRatio' | 'delete', value?: string) => {
    if (!memoizedEditor) return;

    if (action === 'delete') {
        const src = memoizedEditor.getAttributes('figureWithImage').src;
        if (src && onImageDelete) {
            onImageDelete(src);
        }
        memoizedEditor.chain().focus().deleteSelection().run();
        return;
    }

    if (memoizedEditor.isActive('figureWithImage')) {
        let attr = '';
        if (action === 'setSize') attr = 'data-size';
        else if (action === 'setAlignment') attr = 'data-alignment';
        else if (action === 'setAspectRatio') attr = 'data-aspect-ratio';
        
      memoizedEditor.chain().focus().updateAttributes('figureWithImage', { [attr]: value }).run();
    }
  };

  /**
   * Handles file uploads for paste and drag-and-drop.
   */
  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      return;
    }
    setIsFileUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/images/import-from-upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'File upload failed');
      }

      const permanentPhoto: Media = await response.json();

      // Use the addImage method to insert the newly uploaded image
      if (memoizedEditor) {
        const displayUrl = getDisplayUrl(permanentPhoto);
        memoizedEditor.chain().focus().setFigureWithImage({
          src: displayUrl,
          alt: permanentPhoto.filename,
          width: permanentPhoto.width,
          height: permanentPhoto.height,
          caption: permanentPhoto.filename,
        }).run();
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      // Optionally, display an error to the user in the editor
    } finally {
      setIsFileUploading(false);
    }
  };

  if (!memoizedEditor) {
    return null;
  }

  return (
    <div className={styles.editorContainer} ref={editorRef}>
      {(isUploading || isFileUploading) && <div className={styles.uploadingOverlay}>Importing...</div>}
      <div className={styles.toolbar}>
        <div>
          <button type="button" onClick={() => memoizedEditor.chain().focus().toggleBold().run()} className={memoizedEditor.isActive('bold') ? styles.active : ''}>Bold</button>
          <button type="button" onClick={() => memoizedEditor.chain().focus().toggleItalic().run()} className={memoizedEditor.isActive('italic') ? styles.active : ''}>Italic</button>
          <button type="button" onClick={() => memoizedEditor.chain().focus().toggleHeading({ level: 1 }).run()} className={memoizedEditor.isActive('heading', { level: 1 }) ? styles.active : ''}>H1</button>
          <button type="button" onClick={() => memoizedEditor.chain().focus().toggleHeading({ level: 2 }).run()} className={memoizedEditor.isActive('heading', { level: 2 }) ? styles.active : ''}>H2</button>
          <button type="button" onClick={() => memoizedEditor.chain().focus().toggleBlockquote().run()} className={memoizedEditor.isActive('blockquote') ? styles.active : ''}>Quote</button>
          <button type="button" onClick={onAddImage}>Add Image</button>
        </div>
        
        {memoizedEditor.isActive('figureWithImage') && (
          <ImageToolbar
            editor={memoizedEditor}
            onAction={handleToolbarAction}
          />
        )}
      </div>
      
      <EditorContent editor={memoizedEditor} className={styles.editorContent} />
    </div>
  );
});

RichTextEditor.displayName = 'RichTextEditor';

export default RichTextEditor;