'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Blockquote from '@tiptap/extension-blockquote';
import { FigureWithImage } from '@/lib/tiptap/extensions/FigureWithImage';
import { CardMention } from '@/lib/tiptap/extensions/CardMention';
import styles from './TipTapRenderer.module.css';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface TipTapRendererProps {
  content: string;
  /** Feed tiles: avoid ProseMirror panel fill (prevents a contrasting horizontal band on card surfaces). */
  surface?: 'default' | 'transparent';
}

/**
 * Read-only TipTap output. Keeps extension parity with RichTextEditor for figures and @ card links.
 */
const TipTapRenderer: React.FC<TipTapRendererProps> = ({ content, surface = 'default' }) => {
  const router = useRouter();

  const editor = useEditor({
    editable: false,
    extensions: [
      StarterKit,
      Blockquote,
      FigureWithImage.configure({
        HTMLAttributes: {
          class: 'figure',
        },
      }),
      CardMention,
    ],
    content,
    immediatelyRender: false,
  });

  useEffect(() => {
    if (editor && content && editor.getHTML() !== content) {
      editor.commands.setContent(content, false);
    }
  }, [content, editor]);

  useEffect(() => {
    if (!editor) return;
    const dom = editor.view.dom;

    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement).closest(
        '[data-type="cardMention"][data-card-id]'
      );
      if (!el) return;
      e.preventDefault();
      const id = el.getAttribute('data-card-id');
      if (id) {
        router.push(`/view/${id}`);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const el = (e.target as HTMLElement).closest(
        '[data-type="cardMention"][data-card-id]'
      );
      if (!el || !dom.contains(el)) return;
      e.preventDefault();
      const id = el.getAttribute('data-card-id');
      if (id) {
        router.push(`/view/${id}`);
      }
    };

    dom.addEventListener('click', onClick);
    dom.addEventListener('keydown', onKeyDown);
    return () => {
      dom.removeEventListener('click', onClick);
      dom.removeEventListener('keydown', onKeyDown);
    };
  }, [editor, router]);

  if (!editor) {
    return null;
  }

  return (
    <div
      className={
        surface === 'transparent'
          ? `${styles.renderer} ${styles.rendererTransparent}`
          : styles.renderer
      }
    >
      <EditorContent editor={editor} />
    </div>
  );
};

export default TipTapRenderer;
