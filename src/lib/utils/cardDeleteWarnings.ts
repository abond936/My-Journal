import type { Card } from '@/lib/types/card';

type ParentLookupResult = {
  parentTitles: string[];
  verificationFailed: boolean;
};

type SingleCardDeletePromptInput = {
  title?: string;
  isCollectionRoot?: boolean;
  childCount?: number;
  parentTitles?: string[];
  verificationFailed?: boolean;
};

type BulkDeletePromptInput = {
  selectedCards: Card[];
  parentIdsByChild: Map<string, string[]>;
  titleById: Map<string, string>;
};

export async function fetchCardDeleteParents(cardId: string): Promise<ParentLookupResult> {
  if (!cardId) return { parentTitles: [], verificationFailed: true };
  try {
    const params = new URLSearchParams({ childrenIds_contains: cardId });
    const response = await fetch(`/api/cards?${params.toString()}`, { credentials: 'same-origin' });
    if (!response.ok) return { parentTitles: [], verificationFailed: true };
    const result = (await response.json().catch(() => ({}))) as { items?: Card[] };
    const items = Array.isArray(result.items) ? result.items : [];
    return {
      parentTitles: items.map((card) => card.title?.trim() || 'Untitled'),
      verificationFailed: false,
    };
  } catch {
    return { parentTitles: [], verificationFailed: true };
  }
}

export function buildSingleCardDeletePrompt({
  title,
  isCollectionRoot = false,
  childCount = 0,
  parentTitles = [],
  verificationFailed = false,
}: SingleCardDeletePromptInput): { blocked: boolean; message: string } {
  const normalizedTitle = title?.trim() || 'Untitled';
  const safeParentTitles = parentTitles.filter(Boolean);

  if (isCollectionRoot && childCount > 0) {
    return {
      blocked: true,
      message:
        `Cannot delete "${normalizedTitle}" yet.\n\n` +
        `It is a root with ${childCount} child${childCount === 1 ? '' : 'ren'}. ` +
        'Restructure or move those child cards first.',
    };
  }

  const lines = [`Delete "${normalizedTitle}"?`, '', 'This action cannot be undone.'];

  if (isCollectionRoot) {
    lines.push('', 'This card is a collection root.');
  }

  if (safeParentTitles.length > 0) {
    lines.push(
      '',
      `Attached to ${safeParentTitles.length} parent${safeParentTitles.length === 1 ? '' : 's'}: ${safeParentTitles.join(', ')}.`,
      'Deleting it will remove it from those collections.'
    );
  } else if (verificationFailed) {
    lines.push(
      '',
      'Could not verify parent attachments right now.',
      'Server-side cleanup still runs if you proceed.'
    );
  }

  return { blocked: false, message: lines.join('\n') };
}

export function buildBulkCardDeletePrompt({
  selectedCards,
  parentIdsByChild,
  titleById,
}: BulkDeletePromptInput): { blocked: boolean; message: string } {
  const blockedRoots = selectedCards.filter(
    (card) => card.isCollectionRoot === true && (card.childrenIds?.length ?? 0) > 0
  );

  if (blockedRoots.length > 0) {
    const preview = blockedRoots
      .slice(0, 5)
      .map((card) => card.title?.trim() || 'Untitled')
      .join(', ');
    return {
      blocked: true,
      message:
        `Cannot delete ${blockedRoots.length} selected root card${blockedRoots.length === 1 ? '' : 's'} yet.\n\n` +
        `Still has children: ${preview}${blockedRoots.length > 5 ? ', …' : ''}.\n\n` +
        'Restructure those roots first.',
    };
  }

  const attachedCards = selectedCards.filter((card) => {
    if (!card.docId) return false;
    return (parentIdsByChild.get(card.docId) ?? []).length > 0;
  });

  const rootCards = selectedCards.filter((card) => card.isCollectionRoot === true);
  const affectedParentIds = new Set<string>();

  for (const card of attachedCards) {
    if (!card.docId) continue;
    for (const parentId of parentIdsByChild.get(card.docId) ?? []) {
      affectedParentIds.add(parentId);
    }
  }

  const parentPreview = Array.from(affectedParentIds)
    .slice(0, 5)
    .map((id) => titleById.get(id) || 'Untitled')
    .join(', ');

  const lines = [
    `Delete ${selectedCards.length} selected card${selectedCards.length === 1 ? '' : 's'}?`,
    '',
    'This action cannot be undone.',
  ];

  if (rootCards.length > 0) {
    lines.push('', `Includes ${rootCards.length} collection root card${rootCards.length === 1 ? '' : 's'}.`);
  }

  if (attachedCards.length > 0) {
    lines.push(
      '',
      `Includes ${attachedCards.length} attached card${attachedCards.length === 1 ? '' : 's'} across ${affectedParentIds.size} parent collection${affectedParentIds.size === 1 ? '' : 's'}.`
    );
    if (parentPreview) {
      lines.push(`Parent preview: ${parentPreview}${affectedParentIds.size > 5 ? ', …' : ''}.`);
    }
    lines.push('Deleting them will remove those cards from those collections.');
  }

  return { blocked: false, message: lines.join('\n') };
}
