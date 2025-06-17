'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Blockquote from '@tiptap/extension-blockquote';
import { FigureWithImage } from '@/lib/tiptap/extensions/FigureWithImage';
import styles from './TipTapRenderer.module.css';
import { useEffect } from 'react';

interface TipTapRendererProps {
  content: string;
}

/**
 * A lightweight, read-only component to render TipTap content.
 * It uses the same extensions as the editor to ensure consistent rendering.
 */
const TipTapRenderer: React.FC<TipTapRendererProps> = ({ content }) => {
  const editor = useEditor({
    editable: false, // This is the key to making it a renderer
    extensions: [
      StarterKit,
      Blockquote,
      FigureWithImage.configure({
        HTMLAttributes: {
          class: 'figure',
        },
      }),
    ],
    content: content,
    immediatelyRender: false,
  });

  // Effect to update content if the prop changes after initial render
  useEffect(() => {
    if (editor && content && editor.getHTML() !== content) {
      editor.commands.setContent(content, false);
    }
  }, [content, editor]);

  return (
    <div className={styles.renderer}>
      <EditorContent editor={editor} />
    </div>
  );
};

export default TipTapRenderer; 