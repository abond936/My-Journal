'use client';

import React, { useState, useCallback, useEffect, useImperativeHandle, forwardRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Blockquote from '@tiptap/extension-blockquote';
import { FigureWithImage } from '@/lib/tiptap/extensions/FigureWithImage';
import Link from '@tiptap/extension-link';
import { Media } from '@/lib/types/photo';
import ImageToolbar from './ImageToolbar';
import styles from './RichTextEditor.module.css';
import { getDisplayUrl } from '@/lib/utils/photoUtils';
import clsx from 'clsx';
import { useCardForm } from '@/components/providers/CardFormProvider';

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

export interface RichTextEditorRef {
  getContent: () => string;
  setContent: (content: string) => void;
  insertImage: (media: Media) => void;
}

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
  const { updateContentMedia } = useCardForm();
  const [content, setContent] = useState(initialContent);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [selectedNode, setSelectedNode] = useState<any | null>(null);

  const extractMediaIds = useCallback((htmlContent: string) => {
    const mediaIds = new Set<string>();
    const doc = new DOMParser().parseFromString(htmlContent, 'text/html');
    doc.querySelectorAll('figure[data-media-id]').forEach(figure => {
      const mediaId = figure.getAttribute('data-media-id');
      if (mediaId) {
        mediaIds.add(mediaId);
      }
    });
    return Array.from(mediaIds);
  }, []);

  const handleToolbarAction = (action: 'setSize' | 'setAlignment' | 'setWrap' | 'delete', value?: any) => {
    if (!editor || !selectedNode) return;
    const chain = editor.chain();
    
    if (action === 'delete') {
      const mediaId = selectedNode.attrs['data-media-id'];
      if (mediaId) {
        const currentMediaIds = extractMediaIds(editor.getHTML());
        const updatedMediaIds = currentMediaIds.filter(id => id !== mediaId);
        updateContentMedia(updatedMediaIds);
        onImageDelete?.(mediaId);
      }
      chain.deleteNode('figureWithImage').run();
      return;
    }

    switch (action) {
      case 'setSize':
        chain.setFigureSize(value).run();
        break;
      case 'setAlignment':
        chain.setFigureAlignment(value).run();
        break;
      case 'setWrap':
        chain.setFigureWrap(value).run();
        break;
    }
  };

  const editor = useEditor({
    extensions: [ StarterKit, Blockquote, FigureWithImage, Link ],
    content: content,
    editable: !isDisabled,
    onSelectionUpdate: ({ editor }) => {
      const node = editor.state.doc.nodeAt(editor.state.selection.from);
      setSelectedNode(node?.type.name === 'figureWithImage' ? node : null);
    },
    onUpdate: ({ editor }) => {
      const newContent = editor.getHTML();
      setContent(newContent);
      onChange?.(newContent);
      const mediaIds = extractMediaIds(newContent);
      updateContentMedia(mediaIds);
      onContentMediaChange?.(mediaIds);
    },
    editorProps: {
      attributes: { class: clsx(styles.editor, className, { [styles.isDisabled]: isDisabled }) },
      handleDrop: (view, event, slice, moved) => {
        if (!moved && event.dataTransfer?.files?.length && event.dataTransfer.files[0].type.startsWith('image/')) {
          event.preventDefault();
          handleImageUpload(event.dataTransfer.files[0]);
          return true;
        }
        return false;
      },
      handlePaste: (view, event) => {
        const file = event.clipboardData?.files[0];
        if (file && file.type.startsWith('image/')) {
          event.preventDefault();
          handleImageUpload(file);
          return true;
        }
        return false;
      },
    },
  });

  useEffect(() => {
    if (editor && initialContent !== content) {
      setTimeout(() => {
        editor.commands.setContent(initialContent, false);
      }, 0);
    }
  }, [initialContent, editor]);

  const handleImageUpload = async (file: File) => {
    if (isDisabled || isProcessingImage) return;
    setIsProcessingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/images/browser', { method: 'POST', body: formData });
      if (!response.ok) throw new Error('Upload failed');
      const newMedia: Media = await response.json();
      insertImage(newMedia);
    } catch (err) { console.error(err); } 
    finally { setIsProcessingImage(false); }
  };

  const insertImage = useCallback((media: Media) => {
    if (editor) {
      editor.chain().focus().setFigureWithImage({
        src: getDisplayUrl(media),
        width: media.width,
        height: media.height,
        alt: media.filename,
        mediaId: media.id,
        'data-media-id': media.id,
      }).run();
    }
  }, [editor]);

  useImperativeHandle(ref, () => ({
    getContent: () => editor?.getHTML() || '',
    setContent: (newContent: string) => editor?.commands.setContent(newContent, true),
    insertImage,
  }));
  
  if (!editor) return null;

  const handleToolbarButtonPress = (e: React.MouseEvent<HTMLButtonElement>, command: () => void) => {
    e.preventDefault();
    command();
  };
  
  return (
    <div className={clsx(styles.editorContainer, error && styles.error)}>
      {isProcessingImage && <div className={styles.processingOverlay}><span>Processing...</span></div>}
      <div className={styles.toolbar}>
        <div className={styles.toolbarGroup}>
          <button onMouseDown={(e) => handleToolbarButtonPress(e, () => editor.chain().toggleBold().run())} type="button" className={clsx(styles.toolbarButton, { [styles.active]: editor.isActive('bold') })}>B</button>
          <button onMouseDown={(e) => handleToolbarButtonPress(e, () => editor.chain().toggleItalic().run())} type="button" className={clsx(styles.toolbarButton, { [styles.active]: editor.isActive('italic') })}>I</button>
          <button onMouseDown={(e) => handleToolbarButtonPress(e, () => editor.chain().toggleHeading({ level: 1 }).run())} type="button" className={clsx(styles.toolbarButton, { [styles.active]: editor.isActive('heading', { level: 1 }) })}>H1</button>
          <button onMouseDown={(e) => handleToolbarButtonPress(e, () => editor.chain().toggleHeading({ level: 2 }).run())} type="button" className={clsx(styles.toolbarButton, { [styles.active]: editor.isActive('heading', { level: 2 }) })}>H2</button>
          <button onMouseDown={(e) => handleToolbarButtonPress(e, () => editor.chain().toggleBlockquote().run())} type="button" className={clsx(styles.toolbarButton, { [styles.active]: editor.isActive('blockquote') })}>”</button>
          <button onMouseDown={(e) => { e.preventDefault(); onAddImage?.(); }} type="button" className={styles.toolbarButton}>+Img</button>
        </div>
        {editor.isActive('figureWithImage') && selectedNode && <ImageToolbar editor={editor} onAction={handleToolbarAction} />}
      </div>
      <EditorContent editor={editor} className={styles.editorContent} />
      {error && <p className={styles.errorText}>{error}</p>}
    </div>
  );
});

RichTextEditor.displayName = 'RichTextEditor';
export default RichTextEditor;