import type { Metadata } from 'next';
import Link from 'next/link';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'My Stories - Landing Page 2',
  description:
    'A contact-sheet archive style landing page for My Stories, built around photo-led family storytelling.',
};

const notes = [
  {
    label: 'Selected frame',
    title: 'Not every photograph explains itself.',
    body:
      'A contact sheet shows how much sits around the final frame. My Stories keeps that wider human context intact instead of reducing memory to isolated images.',
  },
  {
    label: 'Archive note',
    title: 'The story is part of the record.',
    body:
      'Names, locations, recurring questions, and family meaning belong in the archive too. They should not be left to memory alone.',
  },
  {
    label: 'Editorial mark',
    title: 'Curation matters.',
    body:
      'Some moments deserve a sequence, some deserve a caption, and some deserve a question that opens a longer story. My Stories supports all three.',
  },
];

export default function LandingPageTwo() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroHeader}>
          <p className={styles.kicker}>Landing Page 2 · Contact Sheet Archive</p>
          <h1 className={styles.title}>More than a photo library. A working family archive.</h1>
          <p className={styles.lead}>
            My Stories treats family memory the way a thoughtful archive should: images, notes,
            questions, relationships, and stories all kept together so meaning does not get edited
            out of the record.
          </p>
          <div className={styles.actions}>
            <Link href="/" className={styles.primaryAction}>
              Enter the journal
            </Link>
            <a href="#contact-sheet" className={styles.secondaryAction}>
              View the archive
            </a>
          </div>
        </div>

        <div id="contact-sheet" className={styles.contactSheet} aria-label="Grid of archival family photographs.">
          <div className={`${styles.sheetFrame} ${styles.sheetTall}`} />
          <div className={`${styles.sheetFrame} ${styles.sheetWide}`} />
          <div className={`${styles.sheetFrame} ${styles.sheetSquare}`} />
          <div className={`${styles.sheetFrame} ${styles.sheetWideAlt}`} />
          <div className={`${styles.sheetFrame} ${styles.sheetTallAlt}`} />
          <div className={styles.redMark} />
        </div>
      </section>

      <section className={styles.noteSection}>
        <div className={styles.noteColumn}>
          {notes.map((note) => (
            <article key={note.title} className={styles.noteCard}>
              <p className={styles.noteLabel}>{note.label}</p>
              <h2 className={styles.sectionTitle}>{note.title}</h2>
              <p className={styles.body}>{note.body}</p>
            </article>
          ))}
        </div>
        <aside className={styles.archiveSidebar}>
          <div className={styles.sidebarCard}>
            <p className={styles.sidebarLabel}>Archive structure</p>
            <ul>
              <li>Stories with photographs</li>
              <li>Galleries with context</li>
              <li>Questions that draw out memory</li>
              <li>Discovery by who, what, when, and where</li>
            </ul>
          </div>
          <div className={styles.sidebarPhoto} role="img" aria-label="Close view of film negatives and printed family photographs on a table." />
        </aside>
      </section>

      <section className={styles.section}>
        <p className={styles.kicker}>How it reads</p>
        <h2 className={styles.sectionTitle}>Built for both editorial shape and organic browsing.</h2>
        <div className={styles.modeGrid}>
          <article className={styles.modeCard}>
            <h3>Guided</h3>
            <p>Arrange a family story intentionally so a reader can move through a sequence with context and rhythm.</p>
          </article>
          <article className={styles.modeCard}>
            <h3>Freeform</h3>
            <p>Let family members browse by people, places, themes, and moments, discovering connections as they go.</p>
          </article>
          <article className={styles.modeCard}>
            <h3>Enduring</h3>
            <p>Preserve names, relationships, and interpretation while the people who remember them can still tell the difference.</p>
          </article>
        </div>
      </section>

      <section className={styles.ctaSection}>
        <p className={styles.kicker}>Start preserving</p>
        <h2 className={styles.sectionTitle}>Keep the caption, the question, and the story with the image.</h2>
        <p className={styles.body}>
          My Stories helps a family archive stay readable instead of becoming a pile of unexplained photographs.
        </p>
        <div className={styles.actions}>
          <Link href="/" className={styles.primaryAction}>
            Sign in
          </Link>
          <Link href="/my-stories/3" className={styles.secondaryAction}>
            View landing page 3
          </Link>
        </div>
      </section>
    </main>
  );
}
