'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { CustomImage } from '@/lib/extensions/CustomImage';
import PhotoPicker from '@/components/PhotoPicker';
import ImageToolbar from './ImageToolbar';
import { PhotoMetadata } from '@/lib/services/photos/photoService';
import styles from './RichTextEditor.module.css';
import { Figure } from '@/lib/tiptap/extensions/figure';
import { Figcaption } from '@/lib/tiptap/extensions/figcaption';

interface RichTextEditorProps {
  content: string;
  media: PhotoMetadata[];
  onChange: (content: string, media: PhotoMetadata[]) => void;
  onPhotoSelect?: (photo: PhotoMetadata) => void;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  content,
  media,
  onChange,
  onPhotoSelect,
}) => {
  const [showPhotoPicker, setShowPhotoPicker] = useState(false);
  const [selectedFigure, setSelectedFigure] = useState<HTMLElement | null>(null);
  const [showImageToolbar, setShowImageToolbar] = useState(false);
  const [selectedSize, setSelectedSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [selectedAlignment, setSelectedAlignment] = useState<'left' | 'center' | 'right'>('left');
  const [selectedImage, setSelectedImage] = useState<HTMLImageElement | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({
        HTMLAttributes: {
          class: 'image',
        },
      }),
      Figcaption.configure({
        HTMLAttributes: {
          class: 'figcaption',
        },
      }),
      Figure.configure({
        HTMLAttributes: {
          class: 'figure',
        },
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      const newContent = editor.getHTML();
      onChange(newContent, media);
    },
    editorProps: {
      handleClick: (view, pos, event) => {
        const target = event.target as HTMLElement;
        const figure = target.closest('figure');
        
        if (figure) {
          setSelectedFigure(figure);
          setShowImageToolbar(true);
          
          // Get current size and alignment
          const size = figure.getAttribute('data-size') as 'small' | 'medium' | 'large';
          const alignment = figure.getAttribute('data-alignment') as 'left' | 'center' | 'right';
          
          if (size) setSelectedSize(size);
          if (alignment) setSelectedAlignment(alignment);
          
          return true;
        } else {
          setShowImageToolbar(false);
          setSelectedFigure(null);
        }
        return false;
      },
    },
  });

  const handlePhotoSelect = (photo: PhotoMetadata) => {
    if (editor) {
      const imageUrl = `/api/photos/${photo.id}/preview`;
      
      editor.chain().focus().setFigure({
        src: imageUrl,
        alt: photo.caption || '',
        size: selectedSize,
        alignment: selectedAlignment,
        metadata: {
          id: photo.id,
          filename: photo.filename,
          path: photo.path,
          albumId: photo.albumId,
          albumName: photo.albumName,
          size: photo.size,
          lastModified: photo.lastModified,
          caption: photo.caption,
          tags: photo.tags
        }
      }).run();

      if (onPhotoSelect) {
        onPhotoSelect(photo);
      }
    }
    setShowPhotoPicker(false);
  };

  const applyImageChanges = () => {
    if (selectedFigure && editor) {
      const newContent = editor.getHTML();
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = newContent;
      
      const figure = tempDiv.querySelector(`figure[data-metadata*="${selectedFigure.getAttribute('data-metadata')}"]`);
      if (figure) {
        figure.setAttribute('data-size', selectedSize);
        figure.setAttribute('data-alignment', selectedAlignment);
        figure.className = `figure image-${selectedSize} image-${selectedAlignment}`;
        figure.style.cssText = `
          float: ${selectedAlignment === 'center' ? 'none' : selectedAlignment};
          margin-left: ${selectedAlignment === 'right' ? '1rem' : '0'};
          margin-right: ${selectedAlignment === 'left' ? '1rem' : '0'};
          text-align: ${selectedAlignment === 'center' ? 'center' : 'left'};
          max-width: ${selectedSize === 'small' ? '200px' : selectedSize === 'medium' ? '400px' : '600px'};
          width: ${selectedSize === 'small' ? '200px' : selectedSize === 'medium' ? '400px' : '600px'};
        `;
      }
      
      editor.commands.setContent(tempDiv.innerHTML);
      onChange(tempDiv.innerHTML, media);
    }
    setShowImageToolbar(false);
  };

  // Disable editor when photo picker is open
  useEffect(() => {
    if (editor) {
      editor.setEditable(!showPhotoPicker);
    }
  }, [editor, showPhotoPicker]);

  // Close image toolbar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showImageToolbar && editorRef.current && !editorRef.current.contains(event.target as Node)) {
        setShowImageToolbar(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showImageToolbar]);

  const handleAddPhotoClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowPhotoPicker(true);
  }, []);

  if (!editor) {
    return null;
  }

  return (
    <div className={styles.editor} ref={editorRef}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarGroup}>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={editor.isActive('bold') ? styles.active : ''}
          >
            Bold
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={editor.isActive('italic') ? styles.active : ''}
          >
            Italic
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={editor.isActive('strike') ? styles.active : ''}
          >
            Strike
          </button>
        </div>

        <div className={styles.toolbarGroup}>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={editor.isActive('heading', { level: 1 }) ? styles.active : ''}
          >
            H1
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={editor.isActive('heading', { level: 2 }) ? styles.active : ''}
          >
            H2
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={editor.isActive('heading', { level: 3 }) ? styles.active : ''}
          >
            H3
          </button>
        </div>

        <div className={styles.toolbarGroup}>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={editor.isActive('bulletList') ? styles.active : ''}
          >
            Bullet List
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={editor.isActive('orderedList') ? styles.active : ''}
          >
            Numbered List
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={editor.isActive('blockquote') ? styles.active : ''}
          >
            Quote
          </button>
        </div>

        <div className={styles.toolbarGroup}>
          <button
            type="button"
            onClick={handleAddPhotoClick}
            className={styles.photoButton}
          >
            Add Photo
          </button>
        </div>
      </div>

      <div className={styles.editorContent}>
        <EditorContent editor={editor} />
        {showImageToolbar && selectedFigure && (
          <div className={styles.imageToolbar}>
            <select
              value={selectedSize}
              onChange={(e) => setSelectedSize(e.target.value as 'small' | 'medium' | 'large')}
            >
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
            <select
              value={selectedAlignment}
              onChange={(e) => setSelectedAlignment(e.target.value as 'left' | 'center' | 'right')}
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
            <button onClick={applyImageChanges}>Apply</button>
          </div>
        )}
      </div>

      {showPhotoPicker && (
        <div className={styles.photoPicker}>
          <div className={styles.photoOptions}>
            <select
              value={selectedSize}
              onChange={(e) => setSelectedSize(e.target.value as 'small' | 'medium' | 'large')}
            >
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
            <select
              value={selectedAlignment}
              onChange={(e) => setSelectedAlignment(e.target.value as 'left' | 'center' | 'right')}
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </div>
          <PhotoPicker 
            onSelect={handlePhotoSelect} 
            onClose={() => setShowPhotoPicker(false)}
          />
        </div>
      )}
    </div>
  );
};

export default RichTextEditor;