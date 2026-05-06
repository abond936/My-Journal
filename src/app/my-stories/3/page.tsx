import type { Metadata } from 'next';
import Link from 'next/link';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'My Stories - Landing Page 3',
  description:
    'A documentary timeline style landing page for My Stories with photo-led sections and generational storytelling copy.',
};

const chapters = [
  {
    year: 'Beginnings',
    title: 'A family record does not start as an archive.',
    body:
      'It starts as birthdays, departures, kitchen tables, school pictures, holiday mornings, and the quiet habits no one thinks to explain until later.',
    imageClass: 'chapterHome',
  },
  {
    year: 'Across Time',
    title: 'The meaning usually lives between the images.',
    body:
      'One photograph shows the trip. Another shows the house. The story reveals the strain, the joy, the move, the recovery, or the reason that year still comes up in conversation.',
    imageClass: 'chapterTravel',
  },
  {
    year: 'Inheritance',
    title: 'What survives should still be understandable.',
    body:
      'My Stories preserves the narrative thread so a grandchild can inherit more than evidence. They inherit orientation, names, relationships, and memory with shape.',
    imageClass: 'chapterPortrait',
  },
];

export default function LandingPageThree() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroOverlay}>
          <p className={styles.kicker}>Landing Page 3 · Documentary Timeline</p>
          <h1 className={styles.title}>Every family has a timeline. The story is what makes it legible.</h1>
          <p className={styles.lead}>
            My Stories is a private storytelling journal that helps families preserve photographs,
            narrative, and context as one connected record across generations.
          </p>
          <div className={styles.actions}>
            <Link href="/" className={styles.primaryAction}>
              Enter the journal
            </Link>
            <a href="#timeline" className={styles.secondaryAction}>
              Follow the timeline
            </a>
          </div>
        </div>
      </section>

      <section id="timeline" className={styles.timelineSection}>
        {chapters.map((chapter) => (
          <article key={chapter.title} className={styles.timelineChapter}>
            <div className={styles.timelineMarker}>
              <span />
            </div>
            <div className={styles.timelineCopy}>
              <p className={styles.chapterYear}>{chapter.year}</p>
              <h2 className={styles.sectionTitle}>{chapter.title}</h2>
              <p className={styles.body}>{chapter.body}</p>
            </div>
            <div
              className={`${styles.chapterImage} ${styles[chapter.imageClass]}`}
              role="img"
              aria-label={chapter.title}
            />
          </article>
        ))}
      </section>

      <section className={styles.valueSection}>
        <div className={styles.valueIntro}>
          <p className={styles.kicker}>What My Stories adds</p>
          <h2 className={styles.sectionTitle}>A photograph, a narrative, a path back in.</h2>
        </div>
        <div className={styles.valueGrid}>
          <article className={styles.valueCard}>
            <h3>Context</h3>
            <p>Keep people, places, timing, and meaning attached to the memory instead of leaving them to guesswork.</p>
          </article>
          <article className={styles.valueCard}>
            <h3>Structure</h3>
            <p>Organize stories into guided sequences or freeform paths so the archive can be both curated and discoverable.</p>
          </article>
          <article className={styles.valueCard}>
            <h3>Continuity</h3>
            <p>Create something a family can revisit later and still understand, even when the original storyteller is no longer in the room.</p>
          </article>
        </div>
      </section>

      <section className={styles.bannerSection}>
        <div className={styles.bannerImage} role="img" aria-label="A quiet family scene at dusk." />
        <div className={styles.bannerCopy}>
          <p className={styles.kicker}>For memory keepers</p>
          <h2 className={styles.sectionTitle}>Preserve the thread, not only the fragments.</h2>
          <p className={styles.body}>
            My Stories is for families, journalers, and memory keepers who want their archive to
            remain readable, intimate, and connected.
          </p>
        </div>
      </section>

      <section className={styles.ctaSection}>
        <p className={styles.kicker}>Continue</p>
        <h2 className={styles.sectionTitle}>Give the next generation more than a folder of unexplained pictures.</h2>
        <p className={styles.body}>
          Build an archive that keeps its people, its places, and the stories that made them matter.
        </p>
        <div className={styles.actions}>
          <Link href="/" className={styles.primaryAction}>
            Sign in
          </Link>
          <Link href="/my-stories/1" className={styles.secondaryAction}>
            View landing page 1
          </Link>
        </div>
      </section>
    </main>
  );
}
