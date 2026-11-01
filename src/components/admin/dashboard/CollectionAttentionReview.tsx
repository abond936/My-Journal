import Link from 'next/link';
import type {
  AttentionCardItem,
  AttentionCardReference,
  AttentionMediaItem,
  AttentionMissingMediaItem,
  CollectionPublicationAttentionDetails,
} from '@/lib/services/publicationReadinessService';
import styles from './CollectionAttentionReview.module.css';

const DIMENSION_LABELS = {
  who: 'Who',
  what: 'What',
  when: 'When',
  where: 'Where',
} as const;

function CardReferences({ items }: { items: AttentionCardReference[] }) {
  if (items.length === 0) return null;
  return (
    <span className={styles.references}>
      Used by{' '}
      {items.map((card, index) => (
        <span key={card.cardId}>
          {index > 0 ? ', ' : null}
          <Link href={`/admin/studio?card=${encodeURIComponent(card.cardId)}`}>{card.title}</Link>
        </span>
      ))}
    </span>
  );
}

function CardItems({ items }: { items: AttentionCardItem[] }) {
  return (
    <ul className={styles.itemList}>
      {items.map((card) => (
        <li key={card.cardId}>
          <Link href={`/admin/studio?card=${encodeURIComponent(card.cardId)}`}>{card.title}</Link>
          {card.incompleteDimensions.length > 0 ? (
            <span className={styles.meta}>
              Review: {card.incompleteDimensions.map((dimension) => DIMENSION_LABELS[dimension]).join(', ')}
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function MissingMediaItems({ items }: { items: AttentionMissingMediaItem[] }) {
  return (
    <ul className={styles.itemList}>
      {items.map((media) => (
        <li key={media.mediaId}>
          <code>{media.mediaId}</code>
          <span className={styles.meta}>The Media record is missing. Open a referring Card to remove or replace it.</span>
          <CardReferences items={media.referencedByCards} />
        </li>
      ))}
    </ul>
  );
}

function MediaItems({ items, showReadiness = false }: { items: AttentionMediaItem[]; showReadiness?: boolean }) {
  return (
    <ul className={styles.itemList}>
      {items.map((media) => (
        <li key={media.mediaId}>
          <Link href={`/admin/studio?destination=media&${showReadiness ? 'media' : 'mediaReview'}=${encodeURIComponent(media.mediaId)}`}>
            {media.label}
          </Link>
          {showReadiness ? (
            <span className={styles.meta}>Readiness: {media.readiness}</span>
          ) : media.incompleteDimensions.length > 0 ? (
            <span className={styles.meta}>
              Review: {media.incompleteDimensions.map((dimension) => DIMENSION_LABELS[dimension]).join(', ')}
            </span>
          ) : null}
          <CardReferences items={media.referencedByCards} />
        </li>
      ))}
    </ul>
  );
}

function Queue({
  title,
  count,
  description,
  children,
}: {
  title: string;
  count: number;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <details className={styles.queue} open={count > 0 && count <= 10}>
      <summary>
        <span>{title}</span>
        <strong>{count.toLocaleString()}</strong>
      </summary>
      <p>{description}</p>
      {count > 0 ? children : <p className={styles.complete}>No items in this queue.</p>}
    </details>
  );
}

export default function CollectionAttentionReview({
  details,
}: {
  details: CollectionPublicationAttentionDetails;
}) {
  const { summary } = details;
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Publication work</p>
          <h1>{summary.title}: Needs attention</h1>
          <p>
            These are read-only work queues. Open an item to review it in its owning Studio surface;
            nothing is repaired, approved, or published automatically.
          </p>
        </div>
        <div className={styles.actions}>
          <Link href="/admin">Author Home</Link>
          <Link href={`/admin/studio?collection=${encodeURIComponent(summary.collectionId)}`}>
            Open Collection
          </Link>
        </div>
      </header>

      <section className={styles.queues} aria-label="Collection publication work queues">
        <Queue
          title="Draft Cards"
          count={details.draftCards.length}
          description="Finish or deliberately publish each Card when its content is ready."
        >
          <CardItems items={details.draftCards} />
        </Queue>
        <Queue
          title="Card dimensional review"
          count={details.cardsNeedingDimensionReview.length}
          description="Review only the dimensions required by the current author classification setting."
        >
          <CardItems items={details.cardsNeedingDimensionReview} />
        </Queue>
        <Queue
          title="Cards without reviewed What meaning"
          count={details.cardsMissingMeaningfulWhat.length}
          description="Confirm a meaningful What assignment, or use an intentional resolution when truthful."
        >
          <CardItems items={details.cardsMissingMeaningfulWhat} />
        </Queue>
        <Queue
          title="Missing Card references"
          count={details.missingRequiredCardIds.length}
          description="These durable Collection placements point to Card records that no longer load."
        >
          <ul className={styles.itemList}>
            {details.missingRequiredCardIds.map((cardId) => <li key={cardId}><code>{cardId}</code></li>)}
          </ul>
        </Queue>
        <Queue
          title="Missing Media references"
          count={details.missingMedia.length}
          description="The Media record is absent; the referring Cards identify where the broken reference can be resolved."
        >
          <MissingMediaItems items={details.missingMedia} />
        </Queue>
        <Queue
          title="Media dimensional review"
          count={details.mediaNeedingDimensionReview.length}
          description="Review referenced Media required by the current author classification setting."
        >
          <MediaItems items={details.mediaNeedingDimensionReview} />
        </Queue>
        <Queue
          title="Media readiness"
          count={details.mediaReadinessAttention.length}
          description="Assess unassessed Media and retry or resolve pending and failed rendition work."
        >
          <MediaItems items={details.mediaReadinessAttention} showReadiness />
        </Queue>
      </section>
    </main>
  );
}
