'use client';

import React, { useState, useCallback, useEffect, useRef, useMemo, useImperativeHandle, forwardRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Blockquote from '@tiptap/extension-blockquote';
import { FigureWithImage } from '@/lib/tiptap/extensions/FigureWithImage';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { PhotoMetadata } from '@/lib/types/photo';
import ImageToolbar from './ImageToolbar';
import styles from '@/components/common/RichTextEditor.module.css';
import { getDisplayUrl } from '@/lib/utils/photoUtils';

// Props interface defines what data and callbacks the component needs
interface RichTextEditorProps {
  content: string;        // The initial HTML content
  onAddImage?: () => void; // Called when the user wants to add an image
}

// Export the Ref type so the parent component can use it.
export interface RichTextEditorRef {
  getContent: () => string;
  addImage: (photo: PhotoMetadata) => void;
}

// RichTextEditor component
const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(({
  content,
  onAddImage,
}, ref) => {
  const editorRef = useRef<HTMLDivElement>(null);

  // State management for various editor features
  const [showPhotoPicker, setShowPhotoPicker] = useState(false); // This state is no longer used here but kept for context if needed later
  const toolbarRef = useRef<HTMLDivElement>(null); // Reference to the image toolbar
  const [isUploading, setIsUploading] = useState(false); // To show upload progress/feedback

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
    addImage: (photo: PhotoMetadata) => {
      if (editor) {
        editor.chain().focus().setFigureWithImage({ 
          src: photo.path,
          alt: photo.filename,
          width: photo.width,
          height: photo.height,
          caption: photo.filename,
        }).run();
      }
    }
  }));

  const handleToolbarAction = (action: 'setSize' | 'setAlignment' | 'setAspectRatio', value: string) => {
    if (memoizedEditor?.isActive('figureWithImage')) {
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
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/images/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'File upload failed');
      }

      const { url, name, width, height } = await response.json();

      // Use the addImage method to insert the newly uploaded image
      if (memoizedEditor) {
        memoizedEditor.chain().focus().setFigureWithImage({
          src: url,
          alt: name,
          // Note: The API currently doesn't return width/height.
          // This will need to be added to the API response for full support.
          // For now, we can omit them or use placeholders if the extension allows.
          width: width || 500, // Placeholder or actual width from API
          height: height || 300, // Placeholder or actual height from API
          caption: name,
        }).run();
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      // Optionally, display an error to the user in the editor
    } finally {
      setIsUploading(false);
    }
  };

  const handlePaste = (event: ClipboardEvent) => {
    const items = event.clipboardData?.items;
    if (items) {
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          event.preventDefault();
          const file = item.getAsFile();
          if (file) {
            handleFileUpload(file);
          }
        }
      }
    }
  };

  const handleDrop = (event: DragEvent) => {
    const items = event.dataTransfer?.items;
    if (items) {
      event.preventDefault();
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            handleFileUpload(file);
          }
        }
      }
    }
  };

  useEffect(() => {
    const element = editorRef.current;
    if (element) {
        const editorElement = element.querySelector('.ProseMirror');
        if (editorElement) {
            const castEditorElement = editorElement as HTMLElement;
            castEditorElement.addEventListener('paste', handlePaste as EventListener);
            castEditorElement.addEventListener('drop', handleDrop as EventListener);
            return () => {
                castEditorElement.removeEventListener('paste', handlePaste as EventListener);
                castEditorElement.removeEventListener('drop', handleDrop as EventListener);
            };
        }
    }
  }, [memoizedEditor]); // Dependency array ensures this runs when the editor is ready

  if (!memoizedEditor) {
    return null;
  }

  return (
    <div className={styles.editorContainer} ref={editorRef}>
      {isUploading && <div className={styles.uploadingOverlay}>Uploading...</div>}
      <div className={styles.toolbar}>
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
      
      <EditorContent editor={memoizedEditor} className={styles.editorContent} />
    </div>
  );
});

RichTextEditor.displayName = 'RichTextEditor';

export default RichTextEditor;