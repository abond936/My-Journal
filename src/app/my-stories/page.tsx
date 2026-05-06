import type { Metadata } from 'next';
import Link from 'next/link';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'My Stories',
  description:
    'A private storytelling journal for preserving family stories, photos, and the context that gives them meaning.',
};

const pillars = [
  {
    eyebrow: 'Narrative First',
    title: 'Stories stay attached to the moments they explain.',
    body:
      'Photographs can show a face, a room, a season. The story explains why that day mattered, what came before it, and what the family should remember after the details fade.',
  },
  {
    eyebrow: 'Built for Families',
    title: 'A home for memory, not just storage.',
    body:
      'My Stories is designed for people who want to preserve names, relationships, places, questions, and family context alongside the images themselves.',
  },
  {
    eyebrow: 'Guided or Freeform',
    title: 'Follow a curated path or wander naturally.',
    body:
      'Some memories belong in a carefully shaped sequence. Others are best discovered by person, place, theme, or season. My Stories supports both ways of remembering.',
  },
];

const features = [
  'Write long-form stories and pair them directly with photographs.',
  'Organize people, places, events, and themes through dimensional tags.',
  'Create curated sequences for guided reading, or let family browse freely.',
  'Preserve the context around images so names, relationships, and meaning do not disappear over time.',
];

const steps = [
  {
    step: '01',
    title: 'Gather',
    body:
      'Bring together photographs, fragments, recollections, captions, and prompts worth preserving.',
  },
  {
    step: '02',
    title: 'Shape',
    body:
      'Turn those materials into stories, galleries, questions, and connected moments with just enough structure to make them discoverable.',
  },
  {
    step: '03',
    title: 'Revisit',
    body:
      'Let family members read in a guided path or explore by person, place, and theme as memory leads them.',
  },
];

const useCases = [
  'A parent recording the stories behind old family photographs.',
  'A grandparent turning remembered moments into a private archive for children and grandchildren.',
  'A family organizing years of images into meaningful stories instead of an endless camera roll.',
];

export default function MyStoriesPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <p className={styles.kicker}>Private family storytelling</p>
          <h1 className={styles.heroTitle}>The stories behind the photographs deserve a home of their own.</h1>
          <p className={styles.heroBody}>
            My Stories is a private storytelling journal for families who want to preserve more than
            images. It brings together narrative, photographs, tags, and guided discovery so the
            people, places, and meaning around a memory are not lost.
          </p>
          <div className={styles.heroActions}>
            <Link href="/" className={styles.primaryAction}>
              Enter the journal
            </Link>
            <a href="#preview" className={styles.secondaryAction}>
              See how it works
            </a>
          </div>
        </div>

        <aside className={styles.heroPanel} aria-label="Product summary">
          <div className={styles.panelCard}>
            <p className={styles.panelLabel}>What it preserves</p>
            <ul className={styles.panelList}>
              <li>Stories and reflections</li>
              <li>Family photographs</li>
              <li>People, places, and events</li>
              <li>The context that makes memory useful</li>
            </ul>
          </div>
          <div className={styles.quoteCard}>
            <p>
              A photograph can show who was there. A story can explain why that moment still
              matters.
            </p>
          </div>
        </aside>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionIntro}>
          <p className={styles.sectionLabel}>Why My Stories</p>
          <h2 className={styles.sectionTitle}>Most photo libraries store images. Family memory needs more than that.</h2>
        </div>
        <div className={styles.pillarGrid}>
          {pillars.map((pillar) => (
            <article key={pillar.title} className={styles.pillarCard}>
              <p className={styles.pillarEyebrow}>{pillar.eyebrow}</p>
              <h3 className={styles.cardTitle}>{pillar.title}</h3>
              <p className={styles.cardBody}>{pillar.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.splitLayout}>
          <div>
            <p className={styles.sectionLabel}>What makes it different</p>
            <h2 className={styles.sectionTitle}>A storytelling archive, not a digital shoebox.</h2>
            <p className={styles.sectionBody}>
              My Stories treats family memory as something shaped and revisited. You can write with
              intention, organize with structure, and still leave room for browsing, surprise, and
              rediscovery.
            </p>
          </div>
          <div className={styles.featureCard}>
            <ul className={styles.featureList}>
              {features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section id="preview" className={styles.section}>
        <div className={styles.sectionIntro}>
          <p className={styles.sectionLabel}>Experience preview</p>
          <h2 className={styles.sectionTitle}>Built for both guided reading and organic discovery.</h2>
        </div>
        <div className={styles.previewGrid}>
          <article className={`${styles.previewCard} ${styles.previewStory}`}>
            <p className={styles.previewType}>Story</p>
            <h3 className={styles.previewTitle}>The summer porch on Walnut Street</h3>
            <p className={styles.previewBody}>
              A place can hold a family history all by itself. The porch was where news arrived,
              tomatoes were snapped, and stories lasted longer than the evening light.
            </p>
            <div className={styles.previewMeta}>
              <span>Who</span>
              <span>Where</span>
              <span>When</span>
            </div>
          </article>
          <article className={`${styles.previewCard} ${styles.previewGallery}`}>
            <p className={styles.previewType}>Gallery</p>
            <h3 className={styles.previewTitle}>Christmas mornings, across the years</h3>
            <p className={styles.previewBody}>
              A sequence of moments tied together by the same room, the same family, and the ways
              children slowly became adults.
            </p>
          </article>
          <article className={`${styles.previewCard} ${styles.previewQuestion}`}>
            <p className={styles.previewType}>Prompt</p>
            <h3 className={styles.previewTitle}>What was your mother like when no one else was around?</h3>
            <p className={styles.previewBody}>
              Questions can become stories too, especially when they draw out the details no
              photograph ever captured.
            </p>
          </article>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionIntro}>
          <p className={styles.sectionLabel}>How it works</p>
          <h2 className={styles.sectionTitle}>A simple path from scattered memories to a lasting archive.</h2>
        </div>
        <div className={styles.stepsGrid}>
          {steps.map((item) => (
            <article key={item.step} className={styles.stepCard}>
              <p className={styles.stepNumber}>{item.step}</p>
              <h3 className={styles.cardTitle}>{item.title}</h3>
              <p className={styles.cardBody}>{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.splitLayout}>
          <div>
            <p className={styles.sectionLabel}>Who it is for</p>
            <h2 className={styles.sectionTitle}>Made for people who want family history to remain readable, personal, and alive.</h2>
            <p className={styles.sectionBody}>
              My Stories is especially suited to families, memoir keepers, and anyone who feels the
              difference between collecting images and preserving meaning.
            </p>
          </div>
          <div className={styles.featureCard}>
            <ul className={styles.featureList}>
              {useCases.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.whyCard}>
          <p className={styles.sectionLabel}>Why this matters</p>
          <h2 className={styles.sectionTitle}>Without context, memory thins out faster than we expect.</h2>
          <p className={styles.sectionBody}>
            Names disappear. Places blur together. The reason a picture mattered becomes harder to
            recover with every passing year. My Stories exists to keep that erosion from becoming the
            family record.
          </p>
        </div>
      </section>

      <section className={styles.ctaSection}>
        <div className={styles.ctaCard}>
          <p className={styles.sectionLabel}>Begin</p>
          <h2 className={styles.sectionTitle}>Preserve the story, not only the evidence that it happened.</h2>
          <p className={styles.sectionBody}>
            Enter the journal and continue building a family archive that can still be understood by
            the people who inherit it.
          </p>
          <div className={styles.heroActions}>
            <Link href="/" className={styles.primaryAction}>
              Sign in to My Stories
            </Link>
            <Link href="/" className={styles.secondaryAction}>
              Back to home
            </Link>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <p>My Stories</p>
        <p>A private storytelling journal for family archives.</p>
      </footer>
    </main>
  );
}
