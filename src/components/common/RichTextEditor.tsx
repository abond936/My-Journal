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

// Props interface defines what data and callbacks the component needs
interface RichTextEditorProps {
  content: string;        // The HTML content to be edited
  media: PhotoMetadata[]; // Array of photo metadata associated with the content
  onChange: (content: string, media: PhotoMetadata[]) => void; // Called when content changes
  onPhotoSelect?: (photo: PhotoMetadata) => void; // Optional callback when a photo is selected
}

// RichTextEditor component
const RichTextEditor: React.FC<RichTextEditorProps> = ({
  content,
  media,
  onChange,
  onPhotoSelect,
}) => {
  console.log('RichTextEditor rendered with content:', content);

  // State management for various editor features
  const [showPhotoPicker, setShowPhotoPicker] = useState(false); // Controls photo picker modal visibility
  const [selectedFigure, setSelectedFigure] = useState<HTMLElement | null>(null); // Currently selected figure element
  const [showImageToolbar, setShowImageToolbar] = useState(false); // Controls image toolbar visibility
  const [selectedSize, setSelectedSize] = useState<'small' | 'medium' | 'large'>('medium'); // Selected image size
  const [selectedAlignment, setSelectedAlignment] = useState<'left' | 'center' | 'right'>('left'); // Selected image alignment
  const [selectedImage, setSelectedImage] = useState<HTMLImageElement | null>(null); // Currently selected image element
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<string>('4:3'); // Selected aspect ratio for images
  const [selectedCaption, setSelectedCaption] = useState<string>(''); // Caption for the selected image
  const editorRef = useRef<HTMLDivElement>(null); // Reference to the editor container
  const toolbarRef = useRef<HTMLDivElement>(null); // Reference to the image toolbar
  const [toolbarPosition, setToolbarPosition] = useState({ top: 0, left: 0 }); // Position of the image toolbar
  const [isImageClicked, setIsImageClicked] = useState(false); // Tracks if an image was clicked

  // Initialize the TipTap editor with custom extensions
  const editor = useEditor({
    extensions: [
      StarterKit, // Basic text formatting (bold, italic, lists, etc.)
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
    content, // Initial content
    onCreate: ({ editor }) => {
      // When editor is created, ensure all images are wrapped in figures
      const doc = editor.view.dom;
      const images = doc.querySelectorAll('img:not(figure img)');
      console.log('Found unwrapped images:', images.length);
      
      // Process each unwrapped image
      images.forEach(img => {
        console.log('Processing image:', img.outerHTML);
        
        // Get image dimensions for size determination
        const imgWidth = (img as HTMLImageElement).width;
        let size = 'medium';
        if (imgWidth <= 200) size = 'small';
        else if (imgWidth >= 600) size = 'large';
        
        // Use TipTap command to wrap the image in a figure
        editor.commands.wrapImage({
          size,
          alignment: 'left',
          aspectRatio: '4:3'
        });
        
        console.log('After wrapping:', img.parentElement?.outerHTML);
      });
    },
  });

  // Click handler for clicks on images and figures in the editor content
  const handleEditorClick = (event: React.MouseEvent<HTMLDivElement>) => {
    console.log('Editor clicked:', event.target);
    const target = event.target as HTMLElement;
    
    // Check if the clicked element is an image or within a figure
    const figure = target.closest('figure');
    console.log('Found figure:', figure);
    
    if (figure) {
      // Handle click on an existing figure
      console.log('Figure clicked, showing toolbar');
      console.log('Figure attributes:', {
        size: figure.getAttribute('data-size'),
        alignment: figure.getAttribute('data-alignment'),
        aspectRatio: figure.getAttribute('data-aspect-ratio')
      });
      event.preventDefault();
      event.stopPropagation();
      
      const img = figure.querySelector('img');
      console.log('Found image:', img);
      if (img) {
        setSelectedImage(img);
        setShowImageToolbar(true);
        
        // Get current attributes from the figure
        const size = figure.getAttribute('data-size') as 'small' | 'medium' | 'large' || 'medium';
        const alignment = figure.getAttribute('data-alignment') as 'left' | 'center' | 'right' || 'left';
        const aspectRatio = figure.getAttribute('data-aspect-ratio') || '4:3';
        const caption = figure.querySelector('figcaption')?.textContent || '';
        
        console.log('Setting image properties:', {
          size,
          alignment,
          aspectRatio,
          caption
        });
        
        // Update state with current image settings
        setSelectedSize(size);
        setSelectedAlignment(alignment);
        setSelectedAspectRatio(aspectRatio);
        setSelectedCaption(caption);
      }
    } else if (target.tagName.toLowerCase() === 'img') {
      // Handle click on an unwrapped image
      console.log('Image clicked but not in figure, wrapping...');
      const img = target as HTMLImageElement;
      
      // Get image dimensions for size determination
      const imgWidth = img.width;
      let size = 'medium';
      if (imgWidth <= 200) size = 'small';
      else if (imgWidth >= 600) size = 'large';
      
      // Get the position of the image in the document
      const pos = editor?.view.posAtDOM(img, 0);
      console.log('Image position in document:', pos);
      
      if (pos !== undefined && editor) {
        // Set the selection to the image
        editor.commands.setTextSelection(pos);
        
        // Use TipTap command to wrap the image in a figure
        const result = editor.commands.wrapImage({
          size,
          alignment: 'left',
          aspectRatio: '4:3'
        });
        
        console.log('Wrap result:', result);
        console.log('Editor content after wrap:', editor.getHTML());
      }
      
      // Show toolbar for the newly wrapped image
      setSelectedImage(img);
      setShowImageToolbar(true);
      setSelectedSize(size);
      setSelectedAlignment('left');
      setSelectedAspectRatio('4:3');
      setSelectedCaption('');
    }
  };

  // Debug logging for toolbar visibility changes
  useEffect(() => {
    console.log('Toolbar visibility changed:', showImageToolbar);
  }, [showImageToolbar]);

  // Renders the image toolbar when an image is selected
  const renderImageToolbar = () => {
    if (showImageToolbar && selectedImage) {
      return (
        <div className={styles.imageToolbarModal}>
          <div className={styles.imageToolbar}>
            <div className={styles.toolbarHeader}>
              <h3>Image Settings</h3>
              <button 
                className={styles.closeButton}
                onClick={() => {
                  setShowImageToolbar(false);
                  setSelectedImage(null);
                }}
              >
                ×
              </button>
            </div>
            
            <div className={styles.toolbarContent}>
              {/* Size controls */}
              <div className={styles.toolbarSection}>
                <label>Size:</label>
                <div className={styles.buttonGroup}>
                  <button
                    className={`${styles.toolbarButton} ${selectedSize === 'small' ? styles.active : ''}`}
                    onClick={() => setSelectedSize('small')}
                  >
                    Small
                  </button>
                  <button
                    className={`${styles.toolbarButton} ${selectedSize === 'medium' ? styles.active : ''}`}
                    onClick={() => setSelectedSize('medium')}
                  >
                    Medium
                  </button>
                  <button
                    className={`${styles.toolbarButton} ${selectedSize === 'large' ? styles.active : ''}`}
                    onClick={() => setSelectedSize('large')}
                  >
                    Large
                  </button>
                </div>
              </div>

              {/* Alignment controls */}
              <div className={styles.toolbarSection}>
                <label>Alignment:</label>
                <div className={styles.buttonGroup}>
                  <button
                    className={`${styles.toolbarButton} ${selectedAlignment === 'left' ? styles.active : ''}`}
                    onClick={() => setSelectedAlignment('left')}
                  >
                    Left
                  </button>
                  <button
                    className={`${styles.toolbarButton} ${selectedAlignment === 'center' ? styles.active : ''}`}
                    onClick={() => setSelectedAlignment('center')}
                  >
                    Center
                  </button>
                  <button
                    className={`${styles.toolbarButton} ${selectedAlignment === 'right' ? styles.active : ''}`}
                    onClick={() => setSelectedAlignment('right')}
                  >
                    Right
                  </button>
                </div>
              </div>

              {/* Aspect ratio controls */}
              <div className={styles.toolbarSection}>
                <label>Aspect Ratio:</label>
                <div className={styles.buttonGroup}>
                  <button
                    className={`${styles.toolbarButton} ${selectedAspectRatio === '1:1' ? styles.active : ''}`}
                    onClick={() => setSelectedAspectRatio('1:1')}
                  >
                    1:1
                  </button>
                  <button
                    className={`${styles.toolbarButton} ${selectedAspectRatio === '4:3' ? styles.active : ''}`}
                    onClick={() => setSelectedAspectRatio('4:3')}
                  >
                    4:3
                  </button>
                  <button
                    className={`${styles.toolbarButton} ${selectedAspectRatio === '16:9' ? styles.active : ''}`}
                    onClick={() => setSelectedAspectRatio('16:9')}
                  >
                    16:9
                  </button>
                </div>
              </div>

              {/* Caption input */}
              <div className={styles.toolbarSection}>
                <label>Caption:</label>
                <input
                  type="text"
                  value={selectedCaption}
                  onChange={(e) => setSelectedCaption(e.target.value)}
                  placeholder="Enter image caption"
                  className={styles.captionInput}
                />
              </div>

              {/* Action buttons */}
              <div className={styles.toolbarActions}>
                <button 
                  className={styles.applyButton}
                  onClick={applyImageChanges}
                >
                  Apply Changes
                </button>
                <button 
                  className={styles.cancelButton}
                  onClick={() => {
                    setShowImageToolbar(false);
                    setSelectedImage(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Handler for when a photo is selected from the photo picker
  const handlePhotoSelect = (photo: PhotoMetadata) => {
    if (editor) {
      const imageUrl = `/api/photos/${photo.id}/preview`;
      
      // Insert the selected photo into the editor with metadata
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

      // Call the onPhotoSelect callback if provided
      if (onPhotoSelect) {
        onPhotoSelect(photo);
      }
    }
    setShowPhotoPicker(false);
  };

  // Apply changes to the selected image (size and alignment)
  const applyImageChanges = () => {
    if (!selectedImage) return;
    
    const figure = selectedImage.closest('figure');
    if (!figure) return;
    
    // Update figure attributes
    figure.setAttribute('data-size', selectedSize);
    figure.setAttribute('data-alignment', selectedAlignment);
    figure.setAttribute('data-aspect-ratio', selectedAspectRatio);
    
    // Update figure styles
    figure.style.width = selectedSize === 'small' ? '200px' : 
                        selectedSize === 'medium' ? '400px' : '600px';
    figure.style.display = 'block';
    figure.style.margin = '0 auto';
    
    // Apply alignment styles
    if (selectedAlignment === 'left') {
      figure.style.float = 'left';
      figure.style.marginRight = '1rem';
    } else if (selectedAlignment === 'right') {
      figure.style.float = 'right';
      figure.style.marginLeft = '1rem';
    } else {
      figure.style.float = 'none';
      figure.style.margin = '0 auto';
    }
    
    // Update or create caption
    let captionElement = figure.querySelector('figcaption');
    if (captionElement) {
      captionElement.textContent = selectedCaption;
    } else if (selectedCaption) {
      const newCaption = document.createElement('figcaption');
      newCaption.textContent = selectedCaption;
      figure.appendChild(newCaption);
    }
    
    // Close toolbar
    setShowImageToolbar(false);
    setSelectedImage(null);
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
      if (
        showImageToolbar && 
        toolbarRef.current && 
        !toolbarRef.current.contains(event.target as Node) &&
        editorRef.current &&
        !editorRef.current.contains(event.target as Node)
      ) {
        setShowImageToolbar(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showImageToolbar]);

  // Handler for the "Add Photo" button click
  const handleAddPhotoClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowPhotoPicker(true);
  }, []);

  // Handle pasted images
  const handlePaste = useCallback((event: ClipboardEvent) => {
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
              if (src && editor) {
                editor.commands.setFigure({
                  src,
                  alt: 'Pasted image',
                  size: 'medium',
                  alignment: 'left',
                  aspectRatio: '4:3'
                });
              }
            };
            reader.readAsDataURL(file);
          }
        }
      }
    }
  }, [editor]);

  // Handle dropped images
  const handleDrop = useCallback((event: DragEvent) => {
    const items = event.dataTransfer?.items;
    if (items) {
      for (const item of items) {
        if (item.kind === 'file' && item.type.indexOf('image') === 0) {
          event.preventDefault();
          const file = item.getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
              const src = e.target?.result as string;
              if (src && editor) {
                editor.commands.setFigure({
                  src,
                  alt: 'Dropped image',
                  size: 'medium',
                  alignment: 'left',
                  aspectRatio: '4:3'
                });
              }
            };
            reader.readAsDataURL(file);
          }
        }
      }
    }
  }, [editor]);

  // Add event listeners for paste and drop
  useEffect(() => {
    const element = editorRef.current;
    if (element) {
      element.addEventListener('paste', handlePaste);
      element.addEventListener('drop', handleDrop);
      return () => {
        element.removeEventListener('paste', handlePaste);
        element.removeEventListener('drop', handleDrop);
      };
    }
  }, [handlePaste, handleDrop]);

  if (!editor) {
    return null;
  }

  // Main render of toolbar, content area and photopicker or image toolbar when needed
  return (
    <div className={styles.container} ref={editorRef}>
      {/* Editor toolbar */}
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

        {/* Heading buttons */}
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

        {/* List formatting buttons */}
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

      {/* Main editor content area */}
      <EditorContent 
        editor={editor} 
        className={styles.editorContent}
        onClick={handleEditorClick}
      />

      {/* Image toolbar modal */}
      {renderImageToolbar()}

      {/* Photo picker modal */}
      {showPhotoPicker && (
        <div className={styles.photoPicker}>
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