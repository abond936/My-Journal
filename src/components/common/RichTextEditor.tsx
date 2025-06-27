/**
 * RichTextEditor Component
 * 
 * A rich text editor component that supports text formatting and image handling.
 * Integrates with CardFormProvider for managing media state and caching.
 * 
 * Key Features:
 * - Rich text editing with TipTap
 * - Image upload and management
 * - Image formatting (size, alignment)
 * - Drag and drop image support
 * - Clipboard paste support
 * 
 * Media Handling Flow:
 * 1. Images can be added via:
 *    - Direct upload (handleImageUpload)
 *    - External insertion (insertImage)
 *    - Drag and drop
 *    - Clipboard paste
 * 2. Each image is:
 *    - Uploaded to the server
 *    - Added to the CardFormProvider's media cache
 *    - Inserted into the editor as a FigureWithImage node
 * 3. Image deletion:
 *    - Updates the CardFormProvider's media cache
 *    - Removes the node from the editor
 *    - Notifies parent components
 */

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
import { useCardForm } from '@/components/providers/CardFormProvider';

/**
 * Props for the RichTextEditor component
 * @property initialContent - Initial HTML content for the editor
 * @property onChange - Callback when content changes
 * @property onContentMediaChange - Callback when media IDs in content change
 * @property className - Additional CSS classes
 * @property isDisabled - Whether the editor is disabled
 * @property error - Error message to display
 * @property onAddImage - Callback when add image button is clicked
 * @property onImageDelete - Callback when an image is deleted
 */
interface RichTextEditorProps {
  initialContent?: string;
  onChange?: (content: string) => void;
  onContentMediaChange?: (mediaIds: string[]) => void;
  className?: string;
  isDisabled?: boolean;
  error?: string;
  onAddImage?: () => void;
  onImageDelete?: (mediaId: string) => void;
}

/**
 * Methods exposed via ref to parent components
 * @property getContent - Get current editor content
 * @property setContent - Set editor content
 * @property insertImage - Insert an image into the editor
 */
export interface RichTextEditorRef {
  getContent: () => string;
  setContent: (content: string) => void;
  insertImage: (media: Media) => void;
}

/**
 * RichTextEditor Component Implementation
 * Uses forwardRef to expose methods to parent components and integrates with CardFormProvider
 * for media state management.
 */
const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(({
  initialContent = '',
  onChange,
  onContentMediaChange,
  className,
  isDisabled = false,
  error,
  onAddImage,
  onImageDelete
}, ref) => {
  // Access CardFormProvider's media cache and update function
  const { formState: { mediaCache }, updateContentMedia } = useCardForm();

  // Local state management
  const [content, setContent] = useState(initialContent);          // Current editor content
  const [isProcessingImage, setIsProcessingImage] = useState(false); // Upload state
  const toolbarRef = useRef<HTMLDivElement>(null);                // Toolbar DOM reference
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null); // Currently selected image

  /**
   * Extracts media IDs from HTML content by parsing figure elements
   * Used to maintain the media cache and notify about content changes
   */
  const extractMediaIds = useCallback((htmlContent: string) => {
    const mediaIds = new Set<string>();
    const doc = new DOMParser().parseFromString(htmlContent, 'text/html');
    doc.querySelectorAll('figure[data-media-id]').forEach(figure => {
      const mediaId = figure.getAttribute('data-media-id');
      if (mediaId) {
        mediaIds.add(mediaId);
      }
    });
    const ids = Array.from(mediaIds);
    console.log('Extracted media IDs from content:', { htmlContent, ids });
    return ids;
  }, []);

  /**
   * TipTap Editor Configuration
   * - Configures extensions (StarterKit, FigureWithImage, etc.)
   * - Sets up event handlers for selection and content updates
   * - Configures drag & drop and paste handlers
   */
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
    // Track selected image for toolbar actions
    onSelectionUpdate: ({ editor }) => {
      const node = editor.state.doc.nodeAt(editor.state.selection.from);
      if (node?.type.name === 'figureWithImage') {
        const mediaId = node.attrs['data-media-id'] || node.attrs.mediaId;
        setSelectedMediaId(mediaId);
      } else {
        setSelectedMediaId(null);
      }
    },
    // Handle content updates and media tracking
    onUpdate: ({ editor }) => {
      const newContent = editor.getHTML();
      console.log('Editor content updated:', { newContent });
      setContent(newContent);
      onChange?.(newContent);
      
      // Keep media cache and parent components in sync
      const mediaIds = extractMediaIds(newContent);
      console.log('Updating content media:', { mediaIds });
      updateContentMedia(mediaIds);
      onContentMediaChange?.(mediaIds);
    },
    // Editor props for styling and file handling
    editorProps: {
      attributes: {
        class: clsx(styles.editor, className, {
          [styles.isDisabled]: isDisabled,
          [styles.isProcessing]: isProcessingImage
        }),
      },
      // Handle image drag & drop
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
      // Handle image paste
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

  /**
   * Sync editor content with initialContent prop changes
   * Updates both editor content and media cache
   */
  useEffect(() => {
    if (editor && initialContent !== content) {
      setContent(initialContent);
      editor.commands.setContent(initialContent, false);
      
      const mediaIds = extractMediaIds(initialContent);
      updateContentMedia(mediaIds);
    }
  }, [initialContent, editor, content, extractMediaIds, updateContentMedia]);

  /**
   * Handles image upload process:
   * 1. Uploads file to server
   * 2. Updates media cache via CardFormProvider
   * 3. Inserts image into editor
   */
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
      console.log('Image uploaded successfully:', { media });
      
      if (editor) {
        const displayUrl = getDisplayUrl(media);
        console.log('Inserting image into editor:', { displayUrl, mediaId: media.id });
        
        // Update media cache before inserting
        const currentMediaIds = extractMediaIds(editor.getHTML());
        await updateContentMedia([...currentMediaIds, media.id]);
        
        // Insert image into editor
        editor.chain().focus().setFigureWithImage({
          src: displayUrl,
          alt: media.filename,
          width: media.width,
          height: media.height,
          caption: media.caption || media.filename,
          mediaId: media.id,
          'data-media-id': media.id,
          'data-media-type': 'content'
        }).run();
      }
    } catch (error) {
      console.error('Error uploading image:', error);
    } finally {
      setIsProcessingImage(false);
    }
  };

  /**
   * Expose methods to parent components via ref
   * All methods ensure media cache is updated appropriately
   */
  useImperativeHandle(ref, () => ({
    getContent: () => content,
    setContent: (newContent: string) => {
      setContent(newContent);
      if (editor) {
        editor.commands.setContent(newContent, false);
        const mediaIds = extractMediaIds(newContent);
        updateContentMedia(mediaIds);
      }
    },
    insertImage: (media: Media) => {
      if (editor) {
        const displayUrl = getDisplayUrl(media);
        console.log('Inserting image into editor:', { displayUrl, mediaId: media.id });
        
        // Update media cache before inserting
        const currentMediaIds = extractMediaIds(editor.getHTML());
        updateContentMedia([...currentMediaIds, media.id]);
        
        // Insert image into editor
        editor.chain().focus().setFigureWithImage({
          src: displayUrl,
          alt: media.filename,
          width: media.width,
          height: media.height,
          caption: media.caption || media.filename,
          mediaId: media.id,
          'data-media-id': media.id,
          'data-media-type': 'content'
        }).run();
      }
    }
  }));

  /**
   * Handles toolbar actions for image formatting and deletion
   * Ensures media cache is updated when images are deleted
   */
  const handleToolbarAction = (action: 'setSize' | 'setAlignment' | 'setAspectRatio' | 'delete', value?: string) => {
    if (!editor) return;

    if (action === 'delete' && selectedMediaId) {
      // Update media cache before removing from editor
      const currentMediaIds = extractMediaIds(editor.getHTML());
      const updatedMediaIds = currentMediaIds.filter(id => id !== selectedMediaId);
      updateContentMedia(updatedMediaIds);

      // Remove from editor and notify parent
      onImageDelete?.(selectedMediaId);
      editor.chain().focus().deleteSelection().run();
      setSelectedMediaId(null);
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
      <div className={styles.toolbar} ref={toolbarRef}>
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
          <button
            type="button"
            onClick={onAddImage}
            className={clsx(styles.toolbarButton, { [styles.disabled]: isDisabled })}
            disabled={isDisabled}
          >
            Add Image
          </button>
        </div>
        
        {editor.isActive('figureWithImage') && (
          <ImageToolbar
            editor={editor}
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