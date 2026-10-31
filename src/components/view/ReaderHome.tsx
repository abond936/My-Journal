'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, LibraryBig, Rows3 } from 'lucide-react';
import { useCardContext, type ReaderMode } from '@/components/providers/CardProvider';
import {
  buildReaderModePath,
  parseReaderEntryMode,
  READER_LAST_MODE_KEY,
} from '@/lib/utils/readerEntry';
import styles from './ReaderHome.module.css';

const MODE_LABEL: Record<ReaderMode, string> = {
  guided: 'Collections',
  freeform: 'Feed',
};

export default function ReaderHome() {
  const router = useRouter();
  const {
    readerMode,
    setReaderMode,
    setActiveDimension,
    setCollectionId,
  } = useCardContext();
  const [lastMode, setLastMode] = useState<ReaderMode | null>(null);

  useEffect(() => {
    setLastMode(parseReaderEntryMode(window.localStorage.getItem(READER_LAST_MODE_KEY)));
  }, []);

  const openMode = (mode: ReaderMode, preserveContext = false) => {
    if (!preserveContext) {
      if (mode === 'guided') {
        setActiveDimension('collections');
        setCollectionId(null);
      } else if (readerMode === 'guided') {
        setCollectionId(null);
        setActiveDimension('who');
      }
    }
    if (readerMode !== mode) setReaderMode(mode);
    window.localStorage.setItem(READER_LAST_MODE_KEY, mode);
    router.push(buildReaderModePath(mode));
  };

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>Reader</p>
        <h1>Where would you like to begin?</h1>
        <p className={styles.intro}>
          Follow an authored collection from beginning to end, or explore published memories
          freely in the feed.
        </p>
      </header>

      {lastMode ? (
        <section className={styles.continueSection} aria-labelledby="continue-reading-title">
          <button
            type="button"
            className={styles.continueButton}
            onClick={() => openMode(lastMode, true)}
          >
            <span className={styles.continueIcon} aria-hidden="true">
              <BookOpen />
            </span>
            <span>
              <span className={styles.continueKicker}>Continue reading</span>
              <span id="continue-reading-title" className={styles.continueTitle}>
                Return to {MODE_LABEL[lastMode]}
              </span>
            </span>
            <span className={styles.arrow} aria-hidden="true">→</span>
          </button>
        </section>
      ) : null}

      <section className={styles.paths} aria-label="Choose a reading path">
        <button type="button" className={styles.pathCard} onClick={() => openMode('guided')}>
          <span className={styles.pathIcon} aria-hidden="true"><LibraryBig /></span>
          <span className={styles.pathLabel}>Collections</span>
          <span className={styles.pathDescription}>
            Read stories in an authored order, organized into meaningful parts.
          </span>
          <span className={styles.pathAction}>Choose a collection <span aria-hidden="true">→</span></span>
        </button>

        <button type="button" className={styles.pathCard} onClick={() => openMode('freeform')}>
          <span className={styles.pathIcon} aria-hidden="true"><Rows3 /></span>
          <span className={styles.pathLabel}>Feed</span>
          <span className={styles.pathDescription}>
            Browse published Feed Cards and narrow the view by people, subjects, time, or place.
          </span>
          <span className={styles.pathAction}>Explore the feed <span aria-hidden="true">→</span></span>
        </button>
      </section>
    </div>
  );
}
