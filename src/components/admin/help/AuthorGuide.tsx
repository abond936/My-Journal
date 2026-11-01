import React from 'react';
import ReactMarkdown from 'react-markdown';
import styles from './AuthorGuide.module.css';

interface AuthorGuideProps {
  markdown: string;
}

export default function AuthorGuide({ markdown }: AuthorGuideProps) {
  return (
    <main className={styles.page}>
      <article className={styles.guide}>
        <ReactMarkdown>{markdown}</ReactMarkdown>
      </article>
    </main>
  );
}
