'use client';

import React, { useState, useCallback, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Extension } from '@tiptap/core';
import { useEditor, EditorContent } from '@tiptap/react';
import { NodeSelection, TextSelection } from 'prosemirror-state';
import StarterKit from '@tiptap/starter-kit';
import { FigureWithImage, type FigureImageSize } from '@/lib/tiptap/extensions/FigureWithImage';
import { CardMention } from '@/lib/tiptap/extensions/CardMention';
import Link from '@tiptap/extension-link';
import { dropCursor } from '@tiptap/pm/dropcursor';
import { Media } from '@/lib/types/photo';
import ImageToolbar from './ImageToolbar';
import styles from './RichTextEditor.module.css';
import { getDisplayUrl } from '@/lib/utils/photoUtils';
import { dataTransferHasMeaningfulText, getImageFileFromDataTransfer } from '@/lib/utils/clipboardImage';
import { useMedia } from '@/components/providers/MediaProvider';
import clsx from 'clsx';

type FigureImageAlignment = 'left' | 'center' | 'right';
type FigureImageWrap = 'on' | 'off';

type ImageToolbarAction =
  | { action: 'setSize'; value: FigureImageSize }
  | { action: 'setAlignment'; value: FigureImageAlignment }
  | { action: 'setWrap'; value: FigureImageWrap }
  | { action: 'delete' };

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
  /**
   * Admin Studio compose column: set so wheel over the editor can scroll the outer `.studioCardEditScroll`
   * (see `.editorContainerChainWheel` — avoids JS wheel listeners).
   */
  chainWheelToScrollParent?: boolean;
}

export interface RichTextEditorRef {
  getContent: () => string;
  setContent: (content: string) => void;
  insertImage: (media: Media) => void;
}

const RichTextDropCursor = Extension.create({
  name: 'richTextDropCursor',
  addProseMirrorPlugins() {
    return [
      dropCursor({
        width: 3,
        class: 'ProseMirror-dropcursor',
      }),
    ];
  },
});

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
  chainWheelToScrollParent = false,
}, ref) => {
  const [content, setContent] = useState(initialContent);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [activeImageMediaId, setActiveImageMediaId] = useState<string | null>(null);
  const [draggingFigureMediaId, setDraggingFigureMediaId] = useState<string | null>(null);
  const { registerCreatedMedia } = useMedia();

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
      attrsPatch: Partial<{ 'data-size': FigureImageSize; 'data-alignment': FigureImageAlignment; 'data-wrap': FigureImageWrap }>
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

  const handleToolbarAction = (input: ImageToolbarAction) => {
      if (!editor || !activeImageMediaId) return;
      
      if (input.action === 'delete') {
        const removed = removeFigureByMediaId(activeImageMediaId);
        if (!removed) {
          console.warn('[RichTextEditor] Failed to remove selected inline image by media id');
        return;
      }

      const currentMediaIds = extractMediaIds(editor.getHTML());
      const updatedMediaIds = currentMediaIds.filter(id => id !== activeImageMediaId);
      onImageDelete?.(activeImageMediaId);
      onContentMediaChange?.(updatedMediaIds);
      setActiveImageMediaId(null);
      return;
      }
  
      switch (input.action) {
        case 'setSize':
        updateFigureAttrsByMediaId(activeImageMediaId, { 'data-size': input.value });
          break;
        case 'setAlignment':
        updateFigureAttrsByMediaId(activeImageMediaId, { 'data-alignment': input.value });
          break;
        case 'setWrap':
        updateFigureAttrsByMediaId(activeImageMediaId, { 'data-wrap': input.value });
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
        onContentMediaChange?.(mediaIds);
      }
    }
  }, [content, onChange, onContentMediaChange, extractMediaIds]);

  const editor = useEditor({
    extensions: [StarterKit, FigureWithImage, Link, CardMention, RichTextDropCursor],
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
    onTransaction: () => {
      // Transaction handling without logging
    },
    onUpdate: ({ editor, transaction }) => {
      if (transaction.docChanged) {
        handleContentUpdate(editor.getHTML());
      }
    },
    editorProps: {
      attributes: { class: clsx(styles.editor, className, { [styles.isDisabled]: isDisabled }) },
      handleDOMEvents: {
        dragstart: (view, event) => {
          const target = event.target instanceof HTMLElement ? event.target : null;
          const figure = target?.closest<HTMLElement>('figure[data-media-id]');
          if (!figure) return false;

          const mediaId = figure.getAttribute('data-media-id');
          const nodePos = view.posAtDOM(figure, 0);
          const node = view.state.doc.nodeAt(nodePos);
          if (!node || node.type.name !== 'figureWithImage') return false;

          const selection = NodeSelection.create(view.state.doc, nodePos);
          if (!view.state.selection.eq(selection)) {
            view.dispatch(view.state.tr.setSelection(selection));
          }

          setDraggingFigureMediaId(mediaId);
          return false;
        },
        dragend: () => {
          setDraggingFigureMediaId(null);
          return false;
        },
        drop: (view) => {
          if (!draggingFigureMediaId) return false;
          window.requestAnimationFrame(() => {
            handleContentUpdate(editor?.getHTML() ?? view.dom.innerHTML);
            setDraggingFigureMediaId(null);
          });
          return false;
        },
      },
      handleDrop: (view, event, slice, moved) => {
        if (moved) return false;
        const file = getImageFileFromDataTransfer(event.dataTransfer);
        if (file) {
          event.preventDefault();
          handleImageUpload(file);
          return true;
        }
        if (dataTransferHasMeaningfulText(event.dataTransfer)) return false;
        return false;
      },
      handlePaste: (view, event) => {
        const file = getImageFileFromDataTransfer(event.clipboardData);
        if (file) {
          event.preventDefault();
          handleImageUpload(file);
          return true;
        }
        if (dataTransferHasMeaningfulText(event.clipboardData)) return false;
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
      registerCreatedMedia(newMedia);
      insertImage(newMedia);
    } catch (e) {
      console.error('Image upload failed:', e);
    } finally {
      setIsProcessingImage(false);
    }
  };

  const insertImage = useCallback((media: Media) => {
    if (!editor) return;

    const docEnd = editor.state.doc.content.size;
    const chain = editor.chain().focus().setTextSelection(docEnd);
    chain
      .setFigureWithImage({
        src: getDisplayUrl(media),
        width: media.width,
        height: media.height,
        alt: media.filename,
        docId: media.docId,
        'data-media-id': media.docId,
      })
      .run();

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

  const handleToolbarButtonPress = (e: React.MouseEvent<HTMLButtonElement>, command: () => void) => {
    e.preventDefault();
    command();
  };

  const focusEditorSurface = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!editor) return;
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (!target) return;
      if (target.closest('button, a, input, textarea, select, [contenteditable="true"]')) return;
      editor.chain().focus().run();
    },
    [editor]
  );

  if (!editor) return null;
  const activeImageAttrs = getActiveImageAttrs();
  
  return (
    <div
      className={clsx(
        styles.editorContainer,
        chainWheelToScrollParent && styles.editorContainerChainWheel,
        draggingFigureMediaId && styles.editorContainerDraggingFigure,
        error && styles.error,
      )}
      data-rich-text-drop-root="true"
      onMouseDown={focusEditorSurface}
    >
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
              onAction={(action, value) => {
                switch (action) {
                  case 'setSize':
                    if (value === 'xsmall' || value === 'small' || value === 'medium' || value === 'large') {
                      handleToolbarAction({ action, value });
                    }
                    return;
                  case 'setAlignment':
                    if (value === 'left' || value === 'center' || value === 'right') {
                      handleToolbarAction({ action, value });
                    }
                    return;
                  case 'setWrap':
                    if (value === 'on' || value === 'off') {
                      handleToolbarAction({ action, value });
                    }
                    return;
                  case 'delete':
                    handleToolbarAction({ action });
                    return;
                }
              }}
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
