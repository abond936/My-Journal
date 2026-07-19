import { getAdminApp } from '@/lib/config/firebase/admin';

const firestore = getAdminApp().firestore();
const REPLACEMENT_CHARACTER = '\uFFFD';
const WORD_CHARACTER = /[\p{L}\p{N}]/u;
const SUMMARY_ONLY = process.argv.includes('--summary');
const CLASSIFICATION_FILTER = process.argv
  .find((argument) => argument.startsWith('--classification='))
  ?.split('=')[1] as Finding['classification'] | undefined;

type Finding = {
  cardId: string;
  title: string;
  field: string;
  index: number;
  classification:
    | 'high-confidence-apostrophe'
    | 'between-word-dash-candidate'
    | 'punctuation-or-quote-candidate'
    | 'other';
  context: string;
};

function collectAuthoredStrings(data: Record<string, unknown>): Array<{ field: string; value: string }> {
  const strings: Array<{ field: string; value: string }> = [];
  const add = (field: string, value: unknown) => {
    if (typeof value === 'string') strings.push({ field, value });
  };

  add('title', data.title);
  add('subtitle', data.subtitle);
  add('excerpt', data.excerpt);
  add('content', data.content);

  if (Array.isArray(data.galleryMedia)) {
    data.galleryMedia.forEach((item, index) => {
      if (item && typeof item === 'object') {
        add(`galleryMedia[${index}].caption`, (item as Record<string, unknown>).caption);
      }
    });
  }

  return strings;
}

function classify(value: string, index: number): Finding['classification'] {
  const before = value[index - 1] ?? '';
  const after = value[index + 1] ?? '';
  const remainder = value.slice(index + 1);

  if (
    WORD_CHARACTER.test(before) &&
    /^(?:s|t|d|m|re|ve|ll)(?!\p{L})/iu.test(remainder)
  ) {
    return 'high-confidence-apostrophe';
  }

  if (WORD_CHARACTER.test(before) && WORD_CHARACTER.test(after)) {
    return 'between-word-dash-candidate';
  }

  if (/\s|[.,!?;:()"'<>]/u.test(before) || /\s|[.,!?;:()"'<>]/u.test(after)) {
    return 'punctuation-or-quote-candidate';
  }

  return 'other';
}

function contextAround(value: string, index: number): string {
  const start = Math.max(0, index - 45);
  const end = Math.min(value.length, index + 46);
  return value.slice(start, end).replace(/\s+/g, ' ').trim();
}

async function main(): Promise<void> {
  const cardsSnapshot = await firestore.collection('cards').get();
  const findings: Finding[] = [];
  const affectedCardIds = new Set<string>();
  const affectedFields = new Map<string, number>();

  for (const document of cardsSnapshot.docs) {
    const data = document.data() as Record<string, unknown>;
    const title = typeof data.title === 'string' && data.title ? data.title : '(untitled)';

    for (const { field, value } of collectAuthoredStrings(data)) {
      let index = value.indexOf(REPLACEMENT_CHARACTER);
      while (index >= 0) {
        findings.push({
          cardId: document.id,
          title,
          field,
          index,
          classification: classify(value, index),
          context: contextAround(value, index),
        });
        affectedCardIds.add(document.id);
        affectedFields.set(field, (affectedFields.get(field) ?? 0) + 1);
        index = value.indexOf(REPLACEMENT_CHARACTER, index + 1);
      }
    }
  }

  const byClassification = findings.reduce<Record<Finding['classification'], number>>(
    (counts, finding) => {
      counts[finding.classification] += 1;
      return counts;
    },
    {
      'high-confidence-apostrophe': 0,
      'between-word-dash-candidate': 0,
      'punctuation-or-quote-candidate': 0,
      other: 0,
    }
  );
  const affectedCardsByClassification = Object.fromEntries(
    (Object.keys(byClassification) as Finding['classification'][]).map((classification) => [
      classification,
      new Set(
        findings
          .filter((finding) => finding.classification === classification)
          .map((finding) => finding.cardId)
      ).size,
    ])
  );

  console.log('[audit-card-text-encoding] mode=read-only');
  console.log(`[audit-card-text-encoding] cardsScanned=${cardsSnapshot.size}`);
  console.log(`[audit-card-text-encoding] affectedCards=${affectedCardIds.size}`);
  console.log(`[audit-card-text-encoding] replacementCharacters=${findings.length}`);
  console.log(`[audit-card-text-encoding] byClassification=${JSON.stringify(byClassification)}`);
  console.log(
    `[audit-card-text-encoding] affectedCardsByClassification=${JSON.stringify(affectedCardsByClassification)}`
  );
  console.log(
    `[audit-card-text-encoding] byField=${JSON.stringify(Object.fromEntries(affectedFields))}`
  );
  if (!SUMMARY_ONLY) {
    console.log('[audit-card-text-encoding] findingsStart');
    findings
      .filter(
        (finding) => !CLASSIFICATION_FILTER || finding.classification === CLASSIFICATION_FILTER
      )
      .forEach((finding) => console.log(JSON.stringify(finding)));
    console.log('[audit-card-text-encoding] findingsEnd');
  }
}

main().catch((error) => {
  console.error('[audit-card-text-encoding] failed', error);
  process.exitCode = 1;
});
