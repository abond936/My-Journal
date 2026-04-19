'use client';

import React, { useState, useCallback, useEffect, useImperativeHandle, forwardRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { NodeSelection, TextSelection } from 'prosemirror-state';
import StarterKit from '@tiptap/starter-kit';
import { FigureWithImage, type FigureImageSize } from '@/lib/tiptap/extensions/FigureWithImage';
import { CardMention } from '@/lib/tiptap/extensions/CardMention';
import Link from '@tiptap/extension-link';
import { Media } from '@/lib/types/photo';
import ImageToolbar from './ImageToolbar';
import styles from './RichTextEditor.module.css';
import { getDisplayUrl } from '@/lib/utils/photoUtils';
import { dataTransferHasMeaningfulText, getImageFileFromDataTransfer } from '@/lib/utils/clipboardImage';
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
  /** When set, this card is omitted from @ card-link suggestions (avoid self-link). */
  currentCardId?: string;
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
  onImageDelete,
  currentCardId,
}, ref) => {
  const { updateContentMedia } = useCardForm();
  const [content, setContent] = useState(initialContent);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [activeImageMediaId, setActiveImageMediaId] = useState<string | null>(null);

  const logPreview = (tag: string, html: string, length: number) => {
    // Only log significant content changes (more than 10 characters difference)
    if (Math.abs(length - (content?.length || 0)) > 10) {
      console.log(`[${tag}] content length: ${length}`);
    }
  };

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

  const removeFigureByMediaId = (mediaId: string): boolean => {
    if (!editor) return false;
    const { state, view } = editor;
    const { doc } = state;
    let deleteFrom: number | null = null;
    let deleteTo: number | null = null;

    doc.descendants((node, pos) => {
      if (node.type.name !== 'figureWithImage') return true;
      const nodeMediaId = (node.attrs?.['data-media-id'] ?? node.attrs?.docId) as string | undefined;
      if (nodeMediaId === mediaId) {
        deleteFrom = pos;
        deleteTo = pos + node.nodeSize;
        return false;
      }
      return true;
    });

    if (deleteFrom == null || deleteTo == null) return false;

    const tr = state.tr.delete(deleteFrom, deleteTo);
    view.dispatch(tr);
    return true;
  };

  const updateFigureAttrsByMediaId = (
    mediaId: string,
    attrsPatch: Partial<{ 'data-size': FigureImageSize; 'data-alignment': 'left' | 'center' | 'right'; 'data-wrap': 'on' | 'off' }>
  ): boolean => {
    if (!editor) return false;
    const { state, view } = editor;
    const { doc } = state;
    let targetPos: number | null = null;
    let targetAttrs: Record<string, unknown> | null = null;

    doc.descendants((node, pos) => {
      if (node.type.name !== 'figureWithImage') return true;
      const nodeMediaId = (node.attrs?.['data-media-id'] ?? node.attrs?.docId) as string | undefined;
      if (nodeMediaId === mediaId) {
        targetPos = pos;
        targetAttrs = node.attrs as Record<string, unknown>;
        return false;
      }
      return true;
    });

    if (targetPos == null || targetAttrs == null) return false;

    const tr = state.tr.setNodeMarkup(targetPos, undefined, {
      ...targetAttrs,
      ...attrsPatch,
    });
    view.dispatch(tr);
    return true;
  };

  const getActiveImageAttrs = (): Record<string, unknown> | null => {
    if (!editor || !activeImageMediaId) return null;
    let attrs: Record<string, unknown> | null = null;
    editor.state.doc.descendants((node) => {
      if (node.type.name !== 'figureWithImage') return true;
      const nodeMediaId = (node.attrs?.['data-media-id'] ?? node.attrs?.docId) as string | undefined;
      if (nodeMediaId === activeImageMediaId) {
        attrs = node.attrs as Record<string, unknown>;
        return false;
      }
      return true;
    });
    return attrs;
  };

  const handleToolbarAction = (action: 'setSize' | 'setAlignment' | 'setWrap' | 'delete', value?: any) => {
    if (!editor || !activeImageMediaId) return;
    
    if (action === 'delete') {
      const removed = removeFigureByMediaId(activeImageMediaId);
      if (!removed) {
        console.warn('[RichTextEditor] Failed to remove selected inline image by media id');
        return;
      }

      const currentMediaIds = extractMediaIds(editor.getHTML());
      const updatedMediaIds = currentMediaIds.filter(id => id !== activeImageMediaId);
      updateContentMedia(updatedMediaIds);
      onImageDelete?.(activeImageMediaId);
      setActiveImageMediaId(null);
      return;
    }

    switch (action) {
      case 'setSize':
        updateFigureAttrsByMediaId(activeImageMediaId, { 'data-size': value });
        break;
      case 'setAlignment':
        updateFigureAttrsByMediaId(activeImageMediaId, { 'data-alignment': value });
        break;
      case 'setWrap':
        updateFigureAttrsByMediaId(activeImageMediaId, { 'data-wrap': value });
        break;
    }
  };

  const handleContentUpdate = useCallback((newContent: string) => {
    const mediaIds = extractMediaIds(newContent);
    
    // Only update if content has actually changed
    if (newContent !== content) {
      setContent(newContent);
      
      // Notify parent components
      onChange?.(newContent);
      
      // Only update media IDs if they've changed
      const currentMediaIds = extractMediaIds(content);
      const mediaIdsChanged = mediaIds.length !== currentMediaIds.length || 
        mediaIds.some(id => !currentMediaIds.includes(id));
      
      if (mediaIdsChanged) {
        updateContentMedia(mediaIds);
        onContentMediaChange?.(mediaIds);
      }
    }
  }, [content, onChange, updateContentMedia, onContentMediaChange, extractMediaIds]);

  const editor = useEditor({
    extensions: [StarterKit, FigureWithImage, Link, CardMention],
    content: content,
    editable: !isDisabled,
    immediatelyRender: false,
    onSelectionUpdate: ({ editor }) => {
      const node = editor.state.doc.nodeAt(editor.state.selection.from);
      const figureNode = node?.type.name === 'figureWithImage' ? node : null;
      if (figureNode) {
        const mediaId = figureNode.attrs?.['data-media-id'] ?? figureNode.attrs?.docId ?? null;
        setActiveImageMediaId(mediaId);
      } else if (!editor.isActive('figureWithImage')) {
        setActiveImageMediaId(null);
      }
    },
    onTransaction: ({ editor, transaction }) => {
      // Transaction handling without logging
    },
    onUpdate: ({ editor, transaction }) => {
      if (transaction.docChanged) {
        handleContentUpdate(editor.getHTML());
      }
    },
    editorProps: {
      attributes: { class: clsx(styles.editor, className, { [styles.isDisabled]: isDisabled }) },
      handleDrop: (view, event, slice, moved) => {
        if (moved) return false;
        if (dataTransferHasMeaningfulText(event.dataTransfer)) return false;
        const file = getImageFileFromDataTransfer(event.dataTransfer);
        if (file) {
          event.preventDefault();
          handleImageUpload(file);
          return true;
        }
        return false;
      },
      handlePaste: (view, event) => {
        if (dataTransferHasMeaningfulText(event.clipboardData)) return false;
        const file = getImageFileFromDataTransfer(event.clipboardData);
        if (file) {
          event.preventDefault();
          handleImageUpload(file);
          return true;
        }
        return false;
      },
      handleClickOn: (view, pos, node) => {
        if (node.type.name !== 'figureWithImage') return false;
        const mediaId = (node.attrs?.['data-media-id'] ?? node.attrs?.docId) as string | undefined;
        setActiveImageMediaId(mediaId ?? null);
        return false;
      },
    },
  });

  useEffect(() => {
    // Only update content from initialContent on first mount or if editor is empty
    if (editor && (!content || content === '<p></p>' || content === '') && initialContent) {
      editor.commands.setContent(initialContent, false);
    }
  }, [initialContent, editor, content]);

  useEffect(() => {
    if (!editor) return;
    const storage = editor.storage as {
      cardMention?: { excludeCardId?: string };
    };
    if (!storage.cardMention) {
      storage.cardMention = {};
    }
    storage.cardMention.excludeCardId = currentCardId;
  }, [editor, currentCardId]);

  const handleImageUpload = async (file: File) => {
    if (isDisabled || isProcessingImage) return;
    setIsProcessingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/images/browser', { method: 'POST', body: formData });
      if (!response.ok) throw new Error('Upload failed');
      const data = await response.json();
      const newMedia: Media = data.media ?? data;
      if (!newMedia?.docId) throw new Error('Invalid upload response');
      insertImage(newMedia);
    } catch (e) {
      console.error('Image upload failed:', e);
    } finally {
      setIsProcessingImage(false);
    }
  };

  const insertImage = useCallback((media: Media) => {
    if (!editor) return;

    editor.chain().focus().setFigureWithImage({
      src: getDisplayUrl(media),
      width: media.width,
      height: media.height,
      alt: media.filename,
      docId: media.docId,
      'data-media-id': media.docId,
    }).run();

    // Replacing an empty paragraph often leaves the doc ending with only the figure.
    // With no block after it, there is nowhere reliable to place a text cursor (Chrome).
    const { state, view } = editor;
    const { schema, selection } = state;
    let afterFigure: number | null = null;
    if (selection instanceof NodeSelection && selection.node.type.name === 'figureWithImage') {
      afterFigure = selection.to;
    } else {
      const $a = selection.$anchor;
      for (let d = $a.depth; d >= 0; d -= 1) {
        if ($a.node(d).type.name === 'figureWithImage') {
          afterFigure = $a.after(d);
          break;
        }
      }
    }
    if (afterFigure != null) {
      const $after = state.doc.resolve(Math.min(afterFigure, state.doc.content.size));
      if (!$after.nodeAfter) {
        const para = schema.nodes.paragraph.create();
        const tr = state.tr.insert(afterFigure, para);
        const inside = afterFigure + 1;
        tr.setSelection(TextSelection.near(tr.doc.resolve(Math.min(inside, tr.doc.content.size))));
        view.dispatch(tr);
      } else if ($after.nodeAfter.type.name === 'paragraph') {
        view.dispatch(state.tr.setSelection(TextSelection.near(state.doc.resolve(afterFigure + 1))));
      }
    }

    const newContent = editor.getHTML();
    handleContentUpdate(newContent);
  }, [editor, handleContentUpdate]);

  useImperativeHandle(ref, () => ({
    getContent: () => editor?.getHTML() || '',
    setContent: (newContent: string) => editor?.commands.setContent(newContent, true),
    insertImage,
  }));
  
  if (!editor) return null;
  const activeImageAttrs = getActiveImageAttrs();

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
          <span className={styles.toolbarHint} title="Type @ to insert a link to another card">
            @ card
          </span>
        </div>
        {activeImageMediaId && activeImageAttrs && (
          <ImageToolbar
            editor={editor}
            onAction={handleToolbarAction}
            targetLabel={(activeImageAttrs.alt as string | null) || activeImageMediaId}
            canRemove={Boolean(activeImageMediaId)}
            currentSize={(activeImageAttrs['data-size'] as FigureImageSize | undefined) ?? 'medium'}
            currentAlignment={
              (activeImageAttrs['data-alignment'] as 'left' | 'center' | 'right' | undefined) ?? 'left'
            }
            currentWrap={(activeImageAttrs['data-wrap'] as 'on' | 'off' | undefined) ?? 'off'}
          />
        )}
      </div>
      <EditorContent editor={editor} className={styles.editorContent} />
      {error && <p className={styles.errorText}>{error}</p>}
    </div>
  );
});

RichTextEditor.displayName = 'RichTextEditor';
export default RichTextEditor;