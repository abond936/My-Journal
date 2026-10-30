import type { ReaderCollectionPlacementNode, ReaderCollectionProjection } from '@/lib/utils/collectionPlacementProjection';
import type { CollectionShadowReadiness } from '@/lib/utils/collectionShadowReadiness';
import styles from './CollectionShadowPreview.module.css';

type Props = {
  projection: ReaderCollectionProjection;
  readiness: CollectionShadowReadiness;
};

function roleLabel(role: ReaderCollectionPlacementNode['role']): string {
  return role[0].toUpperCase() + role.slice(1);
}

function PreviewNode({
  node,
  occurrenceCounts,
}: {
  node: ReaderCollectionPlacementNode;
  occurrenceCounts: Map<string, number>;
}) {
  const reused = (occurrenceCounts.get(node.cardId) ?? 0) > 1;
  const row = (
    <div className={styles.nodeRow}>
      <span className={`${styles.roleBadge} ${styles[`role_${node.role}`]}`}>{roleLabel(node.role)}</span>
      <span className={styles.nodeTitle}>{node.card.title || 'Untitled'}</span>
      <span className={node.card.status === 'published' ? styles.published : styles.draft}>
        {node.card.status === 'published' ? 'Published' : 'Draft'}
      </span>
      {reused ? <span className={styles.reused}>Reused Card</span> : null}
      <span className={styles.order}>Order {node.order}</span>
    </div>
  );
  return (
    <li className={styles.node}>
      {node.children.length ? (
        <details open>
          <summary>{row}</summary>
          <ol className={styles.children}>
            {node.children.map((child) => (
              <PreviewNode key={child.placementId} node={child} occurrenceCounts={occurrenceCounts} />
            ))}
          </ol>
        </details>
      ) : row}
    </li>
  );
}

export default function CollectionShadowPreview({ projection, readiness }: Props) {
  const isActive = projection.collection.recordState === 'active';
  const nodes = Array.from(projection.nodesByPlacementId.values());
  const occurrenceCounts = nodes.reduce((counts, node) => {
    counts.set(node.cardId, (counts.get(node.cardId) ?? 0) + 1);
    return counts;
  }, new Map<string, number>());
  const roleCounts = nodes.reduce<Record<string, number>>((counts, node) => {
    counts[node.role] = (counts[node.role] ?? 0) + 1;
    return counts;
  }, {});
  const reusedCardCount = Array.from(occurrenceCounts.values()).filter((count) => count > 1).length;
  const intro = projection.introductionCard;

  return (
    <main className={styles.preview}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Administrator diagnostic preview</p>
          <h1>{projection.collection.title}</h1>
          <p className={styles.subtitle}>
            {isActive
              ? 'Placement-native active structure. Studio and eligible Reader paths use this hierarchy.'
              : 'Placement-native shadow structure. Reader and Studio still use the legacy hierarchy.'}
          </p>
        </div>
        <div className={styles.stateBadges} aria-label="Collection state">
          <span>{projection.collection.recordState}</span>
          <span>{projection.collection.lifecycle}</span>
        </div>
      </header>

      <section
        className={readiness.ready ? styles.ready : styles.stale}
        aria-label={isActive ? 'Authority readiness' : 'Shadow readiness'}
      >
        <strong>{readiness.ready ? 'Parity current' : 'Parity stale'}</strong>
        <span>
          {readiness.ready
            ? 'Stored fingerprints and every placement still match the authoritative legacy hierarchy.'
            : 'The shadow cannot be considered for cutover until a new manifested comparison is reviewed.'}
        </span>
      </section>

      <section className={styles.summary} aria-label="Projection summary">
        <div><strong>{nodes.length}</strong><span>Placements</span></div>
        <div><strong>{projection.roots.length}</strong><span>Top-level</span></div>
        <div><strong>{roleCounts.part ?? 0}</strong><span>Parts</span></div>
        <div><strong>{roleCounts.chapter ?? 0}</strong><span>Chapters</span></div>
        <div><strong>{roleCounts.section ?? 0}</strong><span>Sections</span></div>
        <div><strong>{roleCounts.card ?? 0}</strong><span>Cards</span></div>
        <div><strong>{reusedCardCount}</strong><span>Reused Cards</span></div>
      </section>

      <section className={styles.introduction} aria-labelledby="introduction-heading">
        <p className={styles.sectionLabel}>Introduction Card</p>
        <h2 id="introduction-heading">{intro?.title || 'No introduction Card'}</h2>
        {intro?.subtitle ? <p>{intro.subtitle}</p> : null}
        <p className={styles.meta}>Card ID: {projection.collection.introductionCardId ?? 'None'}</p>
      </section>

      <section className={styles.structure} aria-labelledby="structure-heading">
        <div className={styles.structureHeading}>
          <div>
            <p className={styles.sectionLabel}>Placement tree</p>
            <h2 id="structure-heading">Complete {isActive ? 'active' : 'shadow'} hierarchy</h2>
          </div>
          <p>Roles and order are local to this Collection; Card content remains canonical.</p>
        </div>
        <ol className={styles.rootList}>
          {projection.roots.map((node) => (
            <PreviewNode key={node.placementId} node={node} occurrenceCounts={occurrenceCounts} />
          ))}
        </ol>
      </section>
    </main>
  );
}
