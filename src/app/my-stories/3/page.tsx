import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { getTitleLogoSrc } from '@/lib/utils/titleLogo';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'My Stories - Landing Page 3',
  description:
    'A documentary timeline style landing page for My Stories with memoir-oriented copy shaped for a single author.',
};

const chapters = [
  {
    year: 'Beginnings',
    title: 'A life story rarely begins with the intention to preserve it.',
    body:
      'It begins with birthdays, departures, kitchen tables, school pictures, holiday mornings, and the quiet habits that feel ordinary until time gives them weight.',
    imageClass: 'chapterHome',
  },
  {
    year: 'Across Time',
    title: 'The meaning lives between the photographs.',
    body:
      'One image shows the trip. Another shows the house. The narrative is what gives the images meaning.',
    imageClass: 'chapterTravel',
  },
  {
    year: 'Legacy',
    title: 'What remains should be the understanding.',
    body:
      'My Stories helps preserve the narrative thread so the people who come after inherit more than fragments. They inherit orientation, names, relationships, and memory with shape.',
    imageClass: 'chapterPortrait',
  },
];

export default function LandingPageThree() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroOverlay}>
          <div className={styles.logoWrap}>
            <Image
              src={getTitleLogoSrc('light')}
              alt="My Stories"
              className={styles.logo}
              width={600}
              height={300}
              sizes="(max-width: 768px) 80vw, 420px"
              priority
            />
          </div>
          <p className={styles.kicker}>Landing Page 3 - Documentary Timeline</p>
          <h1 className={styles.title}>Everyone has a story.</h1>
          <p className={styles.lead}>
            My Stories is a private storytelling journal to shape photographs, narrative, and
            context with clarity and meaning.
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
          <h2 className={styles.sectionTitle}>A photograph, a narrative, a path.</h2>
        </div>
        <div className={styles.valueGrid}>
          <article className={styles.valueCard}>
            <h3>Context</h3>
            <p>Keep people, places, timing, and meaning attached to the memory instead of leaving them to guesswork.</p>
          </article>
          <article className={styles.valueCard}>
            <h3>Structure</h3>
            <p>Organize stories into guided sequences or freeform paths so one life record can feel both shaped and discoverable.</p>
          </article>
          <article className={styles.valueCard}>
            <h3>Continuity</h3>
            <p>Create something others can return to later and still understand, even when the original storyteller is no longer there to explain it.</p>
          </article>
        </div>
      </section>

      <section className={styles.bannerSection}>
        <div className={styles.bannerImage} role="img" aria-label="A quiet family scene at dusk." />
        <div className={styles.bannerCopy}>
          <p className={styles.kicker}>For memory keepers</p>
          <h2 className={styles.sectionTitle}>Preserve the thread, not only the fragments.</h2>
          <p className={styles.body}>
            My Stories is for memoir keepers, journalers, and thoughtful archivists who want one
            person&apos;s record to remain readable, intimate, and connected.
          </p>
        </div>
      </section>

      <section className={styles.ctaSection}>
        <p className={styles.kicker}>Continue</p>
        <h2 className={styles.sectionTitle}>Leave behind more than a folder of unexplained pictures.</h2>
        <p className={styles.body}>
          Build a record that keeps its people, its places, and the stories that made them matter.
        </p>
        <div className={styles.actions}>
          <Link href="/" className={styles.primaryAction}>
            Sign in
          </Link>
          <Link href="/my-stories/4" className={styles.secondaryAction}>
            View landing page 4
          </Link>
        </div>
      </section>
    </main>
  );
}
