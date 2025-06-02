'use client';

import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import styles from '@/lib/styles/components/common/editor/RichTextEditor.module.css';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

export default function RichTextEditor({ content, onChange, placeholder }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: styles.link,
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: styles.image,
        },
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: styles.editor,
      },
    },
    immediatelyRender: false,
  });

  if (!editor) {
    return (
      <div className={styles.container}>
        <div className={styles.toolbar}>
          <div className={styles.loading}>Loading editor...</div>
        </div>
        <div className={styles.content}>
          <div className={styles.loading}>Loading editor...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`${styles.button} ${editor.isActive('bold') ? styles.active : ''}`}
          type="button"
        >
          Bold
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`${styles.button} ${editor.isActive('italic') ? styles.active : ''}`}
          type="button"
        >
          Italic
        </button>
        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`${styles.button} ${editor.isActive('strike') ? styles.active : ''}`}
          type="button"
        >
          Strike
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`${styles.button} ${editor.isActive('heading', { level: 1 }) ? styles.active : ''}`}
          type="button"
        >
          H1
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`${styles.button} ${editor.isActive('heading', { level: 2 }) ? styles.active : ''}`}
          type="button"
        >
          H2
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`${styles.button} ${editor.isActive('bulletList') ? styles.active : ''}`}
          type="button"
        >
          Bullet List
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`${styles.button} ${editor.isActive('orderedList') ? styles.active : ''}`}
          type="button"
        >
          Ordered List
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`${styles.button} ${editor.isActive('blockquote') ? styles.active : ''}`}
          type="button"
        >
          Quote
        </button>
        <button
          onClick={() => {
            const url = window.prompt('Enter the URL');
            if (url) {
              editor.chain().focus().setLink({ href: url }).run();
            }
          }}
          className={`${styles.button} ${editor.isActive('link') ? styles.active : ''}`}
          type="button"
        >
          Link
        </button>
        <button
          onClick={() => {
            const url = window.prompt('Enter the image URL');
            if (url) {
              editor.chain().focus().setImage({ src: url }).run();
            }
          }}
          className={styles.button}
          type="button"
        >
          Image
        </button>
      </div>
      <EditorContent editor={editor} className={styles.content} />
    </div>
  );
} 