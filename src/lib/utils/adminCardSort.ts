import type { Card } from '@/lib/types/card';
import type { Tag } from '@/lib/types/tag';
import { getCoreTagsByDimension } from '@/lib/utils/tagDisplay';

export type AdminCardSortMode =
  | 'whenDesc'
  | 'whenAsc'
  | 'createdDesc'
  | 'createdAsc'
  | 'titleAsc'
  | 'titleDesc'
  | 'whoAsc'
  | 'whatAsc'
  | 'whereAsc';

/**
 * Card Management admin grid/table sort (matches `/admin/card-admin` ordering).
 */
export function sortAdminCards(cards: Card[], adminSortMode: AdminCardSortMode, allTags: Tag[]): Card[] {
  const sorted = [...cards];
  const tagNameById = new Map((allTags || []).map((tag) => [tag.docId, tag.name]));
  const firstDirectTagLabel = (card: Card, dimension: 'who' | 'what' | 'where') => {
    const core = getCoreTagsByDimension(card);
    const ids = core[dimension] || [];
    if (!ids.length) return '\uffff';
    const labels = ids
      .map((id) => tagNameById.get(id) || '')
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
    return labels[0] || '\uffff';
  };
  const whenAsc = (a: Card, b: Card) => {
    const av = a.journalWhenSortAsc ?? Number.MAX_SAFE_INTEGER;
    const bv = b.journalWhenSortAsc ?? Number.MAX_SAFE_INTEGER;
    if (av !== bv) return av - bv;
    return (a.title || '').localeCompare(b.title || '');
  };
  const whenDesc = (a: Card, b: Card) => {
    const av = a.journalWhenSortDesc ?? Number.MIN_SAFE_INTEGER;
    const bv = b.journalWhenSortDesc ?? Number.MIN_SAFE_INTEGER;
    if (av !== bv) return bv - av;
    return (a.title || '').localeCompare(b.title || '');
  };
  const titleAsc = (a: Card, b: Card) => (a.title || '').localeCompare(b.title || '');
  const titleDesc = (a: Card, b: Card) => (b.title || '').localeCompare(a.title || '');
  const createdAsc = (a: Card, b: Card) => {
    if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt;
    return (a.title || '').localeCompare(b.title || '');
  };
  const createdDesc = (a: Card, b: Card) => {
    if (a.createdAt !== b.createdAt) return b.createdAt - a.createdAt;
    return (a.title || '').localeCompare(b.title || '');
  };
  const byDimension = (dimension: 'who' | 'what' | 'where') => (a: Card, b: Card) => {
    const av = firstDirectTagLabel(a, dimension);
    const bv = firstDirectTagLabel(b, dimension);
    if (av !== bv) return av.localeCompare(bv);
    return (a.title || '').localeCompare(b.title || '');
  };

  switch (adminSortMode) {
    case 'whenAsc':
      sorted.sort(whenAsc);
      break;
    case 'createdAsc':
      sorted.sort(createdAsc);
      break;
    case 'createdDesc':
      sorted.sort(createdDesc);
      break;
    case 'titleAsc':
      sorted.sort(titleAsc);
      break;
    case 'titleDesc':
      sorted.sort(titleDesc);
      break;
    case 'whoAsc':
      sorted.sort(byDimension('who'));
      break;
    case 'whatAsc':
      sorted.sort(byDimension('what'));
      break;
    case 'whereAsc':
      sorted.sort(byDimension('where'));
      break;
    case 'whenDesc':
    default:
      sorted.sort(whenDesc);
  }
  return sorted;
}
