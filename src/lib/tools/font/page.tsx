'use client';

import styles from './FontTestPage.module.css';

export default function FontTestPage() {
  return (
    <div className={styles.container}>
      <h1>Ink Free Font Test</h1>
      
      <div className={styles.section}>
        <h2>Font Sizes</h2>
        <div className={styles.sizeGrid}>
          <div className={styles.sizeItem}>
            <h3>Small (1rem)</h3>
            <p className="ink-normal" style={{ fontSize: '1rem' }}>
              The quick brown fox jumps over the lazy dog. 1234567890
            </p>
          </div>
          <div className={styles.sizeItem}>
            <h3>Medium (1.5rem)</h3>
            <p className="ink-normal" style={{ fontSize: '1.5rem' }}>
              The quick brown fox jumps over the lazy dog. 1234567890
            </p>
          </div>
          <div className={styles.sizeItem}>
            <h3>Large (2rem)</h3>
            <p className="ink-normal" style={{ fontSize: '2rem' }}>
              The quick brown fox jumps over the lazy dog. 1234567890
            </p>
          </div>
          <div className={styles.sizeItem}>
            <h3>Extra Large (2.5rem)</h3>
            <p className="ink-normal" style={{ fontSize: '2.5rem' }}>
              The quick brown fox jumps over the lazy dog. 1234567890
            </p>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h2>Slant Variations</h2>
        <div className={styles.slantGrid}>
          <div className={styles.slantItem}>
            <h3>12° Slant</h3>
            <p className="ink-slant-12" style={{ fontSize: '1.5rem' }}>
              The quick brown fox jumps over the lazy dog. 1234567890
            </p>
          </div>
          <div className={styles.slantItem}>
            <h3>14° Slant</h3>
            <p className="ink-slant-14" style={{ fontSize: '1.5rem' }}>
              The quick brown fox jumps over the lazy dog. 1234567890
            </p>
          </div>
          <div className={styles.slantItem}>
            <h3>16° Slant</h3>
            <p className="ink-slant-16" style={{ fontSize: '1.5rem' }}>
              The quick brown fox jumps over the lazy dog. 1234567890
            </p>
          </div>
          <div className={styles.slantItem}>
            <h3>18° Slant</h3>
            <p className="ink-slant-18" style={{ fontSize: '1.5rem' }}>
              The quick brown fox jumps over the lazy dog. 1234567890
            </p>
          </div>
          <div className={styles.slantItem}>
            <h3>20° Slant</h3>
            <p className="ink-slant-20" style={{ fontSize: '1.5rem' }}>
              The quick brown fox jumps over the lazy dog. 1234567890
            </p>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h2>Sample Text</h2>
        <div className={styles.sampleText}>
          <p className="ink-slant-10" style={{ fontSize: '2rem' }}>
            Dear Journal,
          </p>
          <p className="ink-slant-10" style={{ fontSize: '1.5rem' }}>
            Today was an extraordinary day. The morning sun cast long shadows across the dew-covered grass,
            and I found myself lost in thought about the journey ahead.
          </p>
          <p className="ink-slant-10" style={{ fontSize: '1.5rem' }}>
            The afternoon brought unexpected adventures and new discoveries that I never could have imagined.
            Each moment seemed to flow into the next, like ink spreading across a page.
          </p>
          <p className="ink-normal" style={{ fontSize: '1.75rem' }}>
            Until tomorrow,
          </p>
          <p className="ink-slant-10" style={{ fontSize: '1.75rem' }}>
            Yours truly
          </p>
        </div>
      </div>
    </div>
  );
} 