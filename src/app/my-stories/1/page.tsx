import type { Metadata } from 'next';
import Link from 'next/link';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'My Stories - Landing Page 1',
  description:
    'A photo-essay style landing page for My Stories, the private storytelling journal for family archives.',
};

const essayPanels = [
  {
    title: 'The picture is only the beginning.',
    body:
      'A photograph can preserve a face, but not the joke that followed, the habit everyone remembers, or the reason the room still matters years later. My Stories gives those details a place to live beside the image.',
  },
  {
    title: 'Memory deserves shape.',
    body:
      'Some stories want a sequence. Others want discovery by person, place, or theme. My Stories supports both so a family archive can be read with intention or explored with curiosity.',
  },
  {
    title: 'The archive stays personal.',
    body:
      'This is not a social feed and not a generic photo bucket. It is a private reading experience built for reflection, preservation, and returning to the people who made a life recognizable.',
  },
];

export default function LandingPageOne() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroImage} role="img" aria-label="Family sitting together and looking through old photographs." />
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>Landing Page 1 · Family Photo Essay</p>
          <h1 className={styles.title}>A private home for the stories behind the photographs.</h1>
          <p className={styles.lead}>
            My Stories is a storytelling journal for family archives, built to preserve narrative,
            photographs, and the context that makes memory worth passing down.
          </p>
          <div className={styles.actions}>
            <Link href="/" className={styles.primaryAction}>
              Enter the journal
            </Link>
            <a href="#essay" className={styles.secondaryAction}>
              Read the story
            </a>
          </div>
        </div>
      </section>

      <section id="essay" className={styles.essaySection}>
        {essayPanels.map((panel, index) => (
          <article
            key={panel.title}
            className={`${styles.essayPanel} ${index % 2 === 1 ? styles.essayPanelReverse : ''}`}
          >
            <div
              className={`${styles.inlinePhoto} ${
                index === 0 ? styles.photoKitchen : index === 1 ? styles.photoPorch : styles.photoAlbum
              }`}
              role="img"
              aria-label={
                index === 0
                  ? 'Family members gathered around a kitchen table.'
                  : index === 1
                    ? 'A quiet porch scene at golden hour.'
                    : 'Hands turning the pages of an old photo album.'
              }
            />
            <div className={styles.textBlock}>
              <p className={styles.sectionLabel}>Photo essay</p>
              <h2 className={styles.sectionTitle}>{panel.title}</h2>
              <p className={styles.body}>{panel.body}</p>
            </div>
          </article>
        ))}
      </section>

      <section className={styles.featureSection}>
        <div className={styles.featureIntro}>
          <p className={styles.sectionLabel}>What My Stories does</p>
          <h2 className={styles.sectionTitle}>It turns scattered family material into something readable.</h2>
        </div>
        <div className={styles.featureGrid}>
          <article className={styles.featureCard}>
            <h3>Write alongside images</h3>
            <p>Pair photographs with stories, reflections, and details that rarely survive in a file name or caption.</p>
          </article>
          <article className={styles.featureCard}>
            <h3>Browse by relationship</h3>
            <p>Find stories through people, places, events, and themes instead of digging through an endless camera roll.</p>
          </article>
          <article className={styles.featureCard}>
            <h3>Guide or wander</h3>
            <p>Shape a deliberate sequence for readers or let them move naturally through the archive one connection at a time.</p>
          </article>
        </div>
      </section>

      <section className={styles.pullQuoteSection}>
        <blockquote className={styles.pullQuote}>
          “A family archive is strongest when the image and the memory can still recognize one another.”
        </blockquote>
      </section>

      <section className={styles.ctaSection}>
        <p className={styles.sectionLabel}>Begin preserving</p>
        <h2 className={styles.sectionTitle}>Keep the photograph, and keep the story that explains it.</h2>
        <p className={styles.body}>
          My Stories gives families a way to preserve what happened, who was there, and why a moment still
          matters.
        </p>
        <div className={styles.actions}>
          <Link href="/" className={styles.primaryAction}>
            Sign in
          </Link>
          <Link href="/my-stories/2" className={styles.secondaryAction}>
            View landing page 2
          </Link>
        </div>
      </section>
    </main>
  );
}
