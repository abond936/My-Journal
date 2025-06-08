'use client';

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { FigureWithImage } from '@/lib/tiptap/extensions/FigureWithImage';
import PhotoPicker from '@/components/PhotoPicker';
import ImageToolbar from './ImageToolbar';
import { PhotoMetadata } from '@/lib/services/photos/photoService';
import styles from './RichTextEditor.module.css';

// Props interface defines what data and callbacks the component needs
interface RichTextEditorProps {
  content: string;        // The HTML content to be edited
  media: PhotoMetadata[]; // Array of photo metadata associated with the content
  onChange: (content: string, media: PhotoMetadata[]) => void; // Called when content changes
  onPhotoSelect?: (photo: PhotoMetadata) => void; // Optional callback when a photo is selected
}

// RichTextEditor component
const RichTextEditor = React.forwardRef<any, RichTextEditorProps>(({
  content,
  media,
  onChange,
  onPhotoSelect,
}, ref) => {
  const editorRef = useRef<any>();

  // State management for various editor features
  const [showPhotoPicker, setShowPhotoPicker] = useState(false); // Controls photo picker modal visibility
  const toolbarRef = useRef<HTMLDivElement>(null); // Reference to the image toolbar

  // Initialize the TipTap editor with custom extensions
  const editor = useEditor({
    extensions: [
      StarterKit, // Basic text formatting (bold, italic, lists, etc.)
      FigureWithImage.configure({ // Our custom extension
        HTMLAttributes: {
          class: 'figure',
        },
      }),
    ],
    content: content, // Set initial content
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML(), media); // Notify parent of content changes
    },
  });

  const memoizedEditor = useMemo(() => editor, [editor]);

  // Effect to update editor content when the external `content` prop changes.
  useEffect(() => {
    if (editor && editor.getHTML() !== content) {
      editor.commands.setContent(content, false);
    }
  }, [content, editor]);

  // Expose a method to get content via the ref
  React.useImperativeHandle(ref, () => ({
    getContent: () => {
      return editor?.getHTML();
    },
    getMedia: () => {
      return media;
    }
  }));

  // THIS IS THE FINAL CHANGE
  const handlePhotoSelect = (photo: PhotoMetadata) => {
    if (memoizedEditor) {
      // We now pass the width and height from the photo metadata
      // to the setFigureWithImage command.
      memoizedEditor.chain().focus().setFigureWithImage({ 
        src: photo.path, // Use the simple web path
        alt: photo.filename,
        width: photo.width,
        height: photo.height,
        caption: photo.filename, // Default caption to filename
      }).run();
    }
    setShowPhotoPicker(false);
  };

  const handleToolbarAction = (action: 'setSize' | 'setAlignment' | 'setAspectRatio', value: string) => {
    if (memoizedEditor?.isActive('figureWithImage')) {
        let attr = '';
        if (action === 'setSize') attr = 'data-size';
        else if (action === 'setAlignment') attr = 'data-alignment';
        else if (action === 'setAspectRatio') attr = 'data-aspect-ratio';
        
      memoizedEditor.chain().focus().updateAttributes('figureWithImage', { [attr]: value }).run();
    }
  };

  const handlePaste = (event: ClipboardEvent) => {
    // Paste logic remains the same for now, would need enhancement for file uploads
    const items = event.clipboardData?.items;
    if (items) {
      for (const item of items) {
        if (item.type.indexOf('image') === 0) {
          event.preventDefault();
          const file = item.getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
              const src = e.target?.result as string;
              if (src && memoizedEditor) {
                // NOTE: Pasted images won't have width/height from metadata
                // This would require a different flow (e.g., upload image first)
                // For now, it might result in a broken image if width/height are required.
                // To prevent errors, we should avoid setting the figure if we don't have dimensions.
                console.warn("Pasted image does not have width/height metadata.");
              }
            };
            reader.readAsDataURL(file);
          }
        }
      }
    }
  };

  // Drop logic also needs consideration for getting image dimensions
  const handleDrop = (event: DragEvent) => {
    const items = event.dataTransfer?.items;
    if (items) {
      // Similar logic to paste
    }
  };

  useEffect(() => {
    const element = editorRef.current;
    if (element) {
        const editorElement = element.querySelector('.ProseMirror');
        if (editorElement) {
            editorElement.addEventListener('paste', handlePaste);
            editorElement.addEventListener('drop', handleDrop);
            return () => {
                editorElement.removeEventListener('paste', handlePaste);
                editorElement.removeEventListener('drop', handleDrop);
            };
        }
    }
  }, [memoizedEditor, handlePaste, handleDrop]);

  if (!memoizedEditor) {
    return null;
  }

  return (
    <div className={styles.editorContainer} ref={editorRef}>
        <div className={styles.toolbar}>
            <button type="button" onClick={() => memoizedEditor.chain().focus().toggleBold().run()} className={memoizedEditor.isActive('bold') ? styles.active : ''}>Bold</button>
            <button type="button" onClick={() => memoizedEditor.chain().focus().toggleItalic().run()} className={memoizedEditor.isActive('italic') ? styles.active : ''}>Italic</button>
            <button type="button" onClick={() => memoizedEditor.chain().focus().toggleHeading({ level: 1 }).run()} className={memoizedEditor.isActive('heading', { level: 1 }) ? styles.active : ''}>H1</button>
            <button type="button" onClick={() => memoizedEditor.chain().focus().toggleHeading({ level: 2 }).run()} className={memoizedEditor.isActive('heading', { level: 2 }) ? styles.active : ''}>H2</button>
            <button type="button" onClick={() => setShowPhotoPicker(true)}>Add Image</button>
        </div>

      {memoizedEditor.isActive('figureWithImage') && (
        <ImageToolbar
          editor={memoizedEditor}
          onAction={handleToolbarAction}
        />
      )}
      
      {showPhotoPicker && <PhotoPicker onPhotoSelect={handlePhotoSelect} onClose={() => setShowPhotoPicker(false)} />}
      
      <EditorContent editor={memoizedEditor} className={styles.editorContent} />
    </div>
  );
});

RichTextEditor.displayName = 'RichTextEditor';

export default RichTextEditor;