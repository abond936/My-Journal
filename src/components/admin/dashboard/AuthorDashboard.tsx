import Link from 'next/link';
import type { AuthorDashboardSummary } from '@/lib/services/authorDashboardService';
import DashboardCardStatusLink from './DashboardCardStatusLink';
import styles from './AuthorDashboard.module.css';

type AuthorDashboardProps = {
  summary: AuthorDashboardSummary;
};

const DIMENSION_LABELS = {
  who: 'Who',
  what: 'What',
  when: 'When',
  where: 'Where',
} as const;

const AUDIENCE_LABELS = {
  legacy_all_enabled: 'All enabled readers (legacy default)',
  all_enabled: 'All enabled readers',
  selected: 'Selected groups and people',
  none: 'No readers selected',
} as const;

export default function AuthorDashboard({ summary }: AuthorDashboardProps) {
  const mediaData = summary.media.status === 'ready' ? summary.media.data : null;
  const collectionData = summary.collections.status === 'ready' ? summary.collections.data : null;

  return (
    <main className={styles.dashboard}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Author home</p>
          <h1>What would you like to work on?</h1>
          <p className={styles.intro}>
            Start a Story, resume your work, or review the archive when that is useful.
          </p>
        </div>
        <div className={styles.headerActions}>
          <Link className={styles.primaryAction} href="/admin/studio?new=1">
            Start a Story
          </Link>
          <Link className={styles.secondaryAction} href="/admin/studio">
            Continue in Studio
          </Link>
        </div>
      </header>

      <section className={`${styles.section} ${styles.storyFocus}`} aria-labelledby="story-work-heading">
        <div className={styles.sectionHeader}>
          <div>
            <h2 id="story-work-heading">Your Stories</h2>
            <p>Pick up the Story you were writing or begin another.</p>
          </div>
        </div>
        {summary.storyWork.status === 'ready' ? (
          <div className={styles.storyWorkGrid}>
            {summary.storyWork.data.recentDraft ? (
              <Link
                className={styles.storyWorkCard}
                href={`/admin/studio?card=${encodeURIComponent(summary.storyWork.data.recentDraft.docId)}`}
              >
                <span>Continue writing</span>
                <strong>{summary.storyWork.data.recentDraft.title}</strong>
              </Link>
            ) : (
              <Link className={styles.storyWorkCard} href="/admin/studio?new=1">
                <span>No draft Story waiting</span>
                <strong>Start a Story</strong>
              </Link>
            )}
            {summary.storyWork.data.recentPublished ? (
              <Link
                className={styles.storyWorkCard}
                href={`/admin/studio?card=${encodeURIComponent(summary.storyWork.data.recentPublished.docId)}`}
              >
                <span>Recently published</span>
                <strong>{summary.storyWork.data.recentPublished.title}</strong>
              </Link>
            ) : (
              <div className={styles.storyWorkCard}>
                <span>Recently published</span>
                <strong>No published Story yet</strong>
              </div>
            )}
          </div>
        ) : (
          <p className={styles.unavailable} role="status">
            Recent Story links are temporarily unavailable. Continue in Studio still works.
          </p>
        )}
      </section>

      <div className={styles.sectionGrid}>
        <section className={`${styles.section} ${styles.attentionSection}`} aria-labelledby="attention-heading">
          <div className={styles.sectionHeader}>
            <div>
              <h2 id="attention-heading">Needs attention</h2>
              <p>
                Draft work can continue. These Collection checks become important when you choose to publish.
              </p>
            </div>
            <Link className={styles.secondaryAction} href="/admin/studio?destination=collections">Open Collections in Studio</Link>
          </div>
          {collectionData ? (
            collectionData.items.length > 0 ? (
              <div className={styles.collectionAttentionList}>
                {collectionData.items.map((item) => {
                  const readinessAttention =
                    item.mediaReadiness.pending +
                    item.mediaReadiness.failed +
                    item.mediaReadiness.unassessed;
                  return (
                    <article className={styles.collectionAttention} key={item.collectionId}>
                      <div className={styles.collectionAttentionHeader}>
                        <h3>
                          <Link
                            className={styles.collectionLink}
                            href={`/admin/studio?collection=${encodeURIComponent(item.collectionId)}`}
                          >
                            {item.title}
                          </Link>
                        </h3>
                        <div className={styles.collectionAttentionActions}>
                          <Link
                            className={styles.collectionReviewLink}
                            href={`/admin/collections/${encodeURIComponent(item.collectionId)}/attention`}
                          >
                            Review exact items
                          </Link>
                          <span className={styles.lifecycle}>{item.lifecycle}</span>
                        </div>
                      </div>
                      <dl className={styles.reviewList}>
                        <div>
                          <dt>Draft cards</dt>
                          <dd>{item.draftCards.toLocaleString()}</dd>
                        </div>
                        <div>
                          <dt>Cards with dimensional review remaining</dt>
                          <dd>{item.cardsNeedingDimensionReview.toLocaleString()}</dd>
                        </div>
                        <div>
                          <dt>Cards without reviewed What meaning</dt>
                          <dd>{item.cardsMissingMeaningfulWhat.toLocaleString()}</dd>
                        </div>
                        <div>
                          <dt>Missing card references</dt>
                          <dd>{item.missingRequiredCards.toLocaleString()}</dd>
                        </div>
                        <div>
                          <dt>Missing media references</dt>
                          <dd>{item.missingMedia.toLocaleString()}</dd>
                        </div>
                        <div>
                          <dt>Referenced media with review remaining</dt>
                          <dd>{item.mediaNeedingDimensionReview.toLocaleString()}</dd>
                        </div>
                        <div>
                          <dt>Referenced media readiness attention</dt>
                          <dd>{readinessAttention.toLocaleString()}</dd>
                        </div>
                        <div>
                          <dt>Collection audience</dt>
                          <dd className={item.audienceSelectionState === 'none' ? styles.notAvailable : undefined}>
                            {AUDIENCE_LABELS[item.audienceSelectionState]}
                          </dd>
                        </div>
                      </dl>
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className={styles.emptyState}>No active durable Collections yet.</p>
            )
          ) : (
            <p className={styles.unavailable} role="status">Collection attention is temporarily unavailable.</p>
          )}
        </section>

        <section className={styles.section} aria-labelledby="cards-heading">
          <div className={styles.sectionHeader}>
            <div>
              <h2 id="cards-heading">Cards</h2>
              <p>Continue writing or review what is ready to read.</p>
            </div>
          </div>
          {summary.cards.status === 'ready' ? (
            <div className={styles.metrics}>
              <DashboardCardStatusLink className={styles.metric} status="all">
                <strong>{summary.cards.data.total.toLocaleString()}</strong>
                <span>Total cards</span>
              </DashboardCardStatusLink>
              <DashboardCardStatusLink className={styles.metric} status="draft">
                <strong>{summary.cards.data.draft.toLocaleString()}</strong>
                <span>Draft</span>
              </DashboardCardStatusLink>
              <DashboardCardStatusLink className={styles.metric} status="published">
                <strong>{summary.cards.data.published.toLocaleString()}</strong>
                <span>Published</span>
              </DashboardCardStatusLink>
            </div>
          ) : (
            <p className={styles.unavailable} role="status">Card summary is temporarily unavailable.</p>
          )}
        </section>

        <section className={styles.section} aria-labelledby="media-heading">
          <div className={styles.sectionHeader}>
            <div>
              <h2 id="media-heading">Media</h2>
              <p>Review the parts of your archive that still need context.</p>
            </div>
            <Link className={styles.secondaryAction} href="/admin/studio?destination=media">Open Media in Studio</Link>
          </div>
          {mediaData ? (
            <>
              <p className={styles.totalLine}>{mediaData.total.toLocaleString()} media items</p>
              <dl className={styles.reviewList}>
                {Object.entries(DIMENSION_LABELS).map(([dimension, label]) => (
                  <div key={dimension}>
                    <dt>{label} still to review</dt>
                    <dd>{mediaData.unreviewed[dimension as keyof typeof DIMENSION_LABELS].toLocaleString()}</dd>
                  </div>
                ))}
                <div>
                  <dt>Processing failures</dt>
                  <dd>{mediaData.failedReadiness.toLocaleString()}</dd>
                </div>
              </dl>
            </>
          ) : (
            <p className={styles.unavailable} role="status">Media summary is temporarily unavailable.</p>
          )}
        </section>

        <section className={styles.section} aria-labelledby="operations-heading">
          <div className={styles.sectionHeader}>
            <div>
              <h2 id="operations-heading">Archive operations</h2>
              <p>Check background work that is active or needs attention.</p>
            </div>
            <Link
              className={`${styles.secondaryAction} ${styles.desktopOnlyAction}`}
              href="/admin/settings"
            >
              Open Settings
            </Link>
            <span className={styles.mobileOnlyNote}>Settings are available on desktop.</span>
          </div>
          {summary.operations.status === 'ready' ? (
            <div className={styles.metrics}>
              <div className={styles.staticMetric}>
                <strong>{summary.operations.data.attention.toLocaleString()}</strong>
                <span>Need attention</span>
              </div>
              <div className={styles.staticMetric}>
                <strong>{summary.operations.data.active.toLocaleString()}</strong>
                <span>Active</span>
              </div>
              <div className={`${styles.staticMetric} ${summary.operations.data.failed > 0 ? styles.warningMetric : ''}`}>
                <strong>{summary.operations.data.failed.toLocaleString()}</strong>
                <span>Failed</span>
              </div>
            </div>
          ) : (
            <p className={styles.unavailable} role="status">Operation summary is temporarily unavailable.</p>
          )}
        </section>
      </div>

      <p className={styles.generatedAt}>
        Summary generated {new Date(summary.generatedAt).toLocaleString()}.
      </p>
    </main>
  );
}
