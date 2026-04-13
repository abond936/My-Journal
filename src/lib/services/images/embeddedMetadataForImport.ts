/**
 * Reads captions and keywords from embedded metadata via ExifTool (exiftool-vendored).
 * Used for local/folder import — no JSON sidecars.
 */
import { exiftool, type Tags } from 'exiftool-vendored';
import type { Tag } from '@/lib/types/tag';

const CAPTION_TAG_KEYS = [
  'CaptionAbstract',
  'Caption-Abstract',
  'Description',
  'ImageDescription',
  'UserComment',
  'Headline',
  'ObjectName',
  'Title',
] as const;

const KEYWORD_TAG_KEYS = [
  'Keywords',
  'Subject',
  'LastKeywordXMP',
  'HierarchicalSubject',
  'CatalogSets',
] as const;

/** digiKam / Lightroom hierarchical keywords; cardseed workflow; section roots in export. */
const STRUCTURAL_KEYWORD_PREFIXES = [
  /^cardseed[|/]/i,
  /^cardseed$/i,
];

const SECTION_ROOT_NAMES = new Set(
  ['WHO', 'WHAT', 'WHEN', 'WHERE', 'WHO1', 'cardseed', '1WHO', '2WHAT', '3WHERE'].map((s) => s.toLowerCase())
);

function coerceToString(val: unknown): string {
  if (val == null) return '';
  if (typeof val === 'string') return val.trim();
  if (typeof val === 'number' || typeof val === 'boolean') return String(val).trim();
  if (Array.isArray(val)) {
    const parts = val
      .map((item) => {
        if (item == null) return '';
        if (typeof item === 'string') return item.trim();
        if (typeof item === 'object' && item !== null && 'value' in item) {
          const v = (item as { value?: unknown }).value;
          return typeof v === 'string' ? v.trim() : '';
        }
        return '';
      })
      .filter(Boolean);
    return parts.join(', ').trim();
  }
  if (typeof val === 'object' && val !== null) {
    const o = val as Record<string, unknown>;
    if (typeof o.rawValue === 'string' && o.rawValue.trim()) return o.rawValue.trim();
    if (typeof o.desc === 'string' && o.desc.trim()) return o.desc.trim();
    if (typeof o.description === 'string' && o.description.trim()) return o.description.trim();
  }
  return '';
}

function collectKeywordStrings(raw: unknown, out: Set<string>): void {
  if (raw == null) return;
  if (typeof raw === 'string') {
    const t = raw.trim();
    if (t) out.add(t);
    return;
  }
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (typeof item === 'string') {
        const t = item.trim();
        if (t) out.add(t);
      } else if (item && typeof item === 'object' && 'value' in item) {
        collectKeywordStrings((item as { value: unknown }).value, out);
      }
    }
    return;
  }
}

function isStructuralOrCardseedKeyword(s: string): boolean {
  const t = s.trim();
  if (!t) return true;
  for (const re of STRUCTURAL_KEYWORD_PREFIXES) {
    if (re.test(t)) return true;
  }
  const leaf = t.includes('|') ? t.split('|').pop()!.trim() : t;
  const leafSlash = leaf.includes('/') ? leaf.split('/').pop()!.trim() : leaf;
  if (SECTION_ROOT_NAMES.has(leaf.toLowerCase()) || SECTION_ROOT_NAMES.has(leafSlash.toLowerCase())) {
    return true;
  }
  return false;
}

/** Variants to match app tag names (flat + hierarchical leaf). */
function keywordLookupVariants(s: string): string[] {
  const t = s.trim();
  if (!t) return [];
  const variants = new Set<string>([t]);
  if (t.includes('|')) {
    variants.add(t.split('|').pop()!.trim());
  }
  if (t.includes('/')) {
    variants.add(t.split('/').pop()!.trim());
  }
  return [...variants].filter(Boolean);
}

/**
 * Reads embedded caption + keyword strings from a file on disk.
 * Safe to call on originals before in-memory WebP normalization.
 */
export async function readEmbeddedCaptionAndKeywords(fullPath: string): Promise<{
  caption: string;
  keywordStrings: string[];
}> {
  const tags: Tags = await exiftool.read(fullPath);
  const rec = tags as unknown as Record<string, unknown>;

  let caption = '';
  for (const key of CAPTION_TAG_KEYS) {
    const v = rec[key];
    const s = coerceToString(v);
    if (s) {
      caption = s;
      break;
    }
  }

  const keywordSet = new Set<string>();
  for (const key of KEYWORD_TAG_KEYS) {
    collectKeywordStrings(rec[key], keywordSet);
  }

  const keywordStrings = [...keywordSet].filter((k) => !isStructuralOrCardseedKeyword(k));

  return { caption, keywordStrings };
}

/**
 * Build maps for resolving digiKam-style labels to Firestore tag ids (exact name, then case-insensitive).
 * Duplicate display names: first tag wins (stable order by docId).
 */
export function buildTagNameLookupMaps(allTags: Tag[]): {
  exact: Map<string, string>;
  lower: Map<string, string>;
} {
  const sorted = [...allTags].sort((a, b) => (a.docId || '').localeCompare(b.docId || ''));
  const exact = new Map<string, string>();
  const lower = new Map<string, string>();
  for (const t of sorted) {
    const name = (t.name || '').trim();
    if (!name) continue;
    if (!exact.has(name)) exact.set(name, t.docId!);
    const l = name.toLowerCase();
    if (!lower.has(l)) lower.set(l, t.docId!);
  }
  return { exact, lower };
}

export function resolveKeywordStringsToTagIds(
  keywordStrings: string[],
  maps: { exact: Map<string, string>; lower: Map<string, string> }
): string[] {
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const kw of keywordStrings) {
    let id: string | undefined;
    for (const variant of keywordLookupVariants(kw)) {
      id = maps.exact.get(variant);
      if (id) break;
      id = maps.lower.get(variant.toLowerCase());
      if (id) break;
    }
    if (id && !seen.has(id)) {
      seen.add(id);
      ids.push(id);
    }
  }
  return ids;
}
