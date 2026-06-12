import type { CardUpdate } from '@/lib/types/card';
import { stripHtml } from '@/lib/utils/cardUtils';

const INELIGIBLE_BODY_PATTERNS = [
  /<figure\b/i,
  /<img\b/i,
  /data-type=["']cardMention["']/i,
  /<blockquote\b/i,
  /<h[1-6]\b/i,
  /<ul\b/i,
  /<ol\b/i,
  /<li\b/i,
  /<table\b/i,
];

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** True when body is plain paragraph prose safe for mobile quick edit (no figures, mentions, etc.). */
export function isReaderBodyQuickEditEligible(content: string | null | undefined): boolean {
  if (!content?.trim()) return true;
  const html = content.trim();
  if (INELIGIBLE_BODY_PATTERNS.some((pattern) => pattern.test(html))) return false;

  const withoutAllowed = html
    .replace(/<\/?p\b[^>]*>/gi, '')
    .replace(/<br\s*\/?>/gi, '');
  return !/<[a-z]/i.test(withoutAllowed);
}

/** Extract editable plain-text draft from eligible paragraph-only HTML. */
export function contentHtmlToPlainBodyDraft(content: string | null | undefined): string {
  if (!content?.trim()) return '';
  return content
    .split(/<\/p>/i)
    .map((chunk) => stripHtml(chunk))
    .filter(Boolean)
    .join('\n\n');
}

/** Convert plain-text draft back to paragraph-only HTML for eligible cards. */
export function plainBodyDraftToContentHtml(draft: string): string {
  const paragraphs = draft
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/\n/g, ' ').trim())
    .filter(Boolean);
  if (paragraphs.length === 0) return '';
  return paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('');
}

export function normalizeEligibleBodyContent(content: string | null | undefined): string {
  if (!content?.trim()) return '';
  if (!isReaderBodyQuickEditEligible(content)) return content.trim();
  return plainBodyDraftToContentHtml(contentHtmlToPlainBodyDraft(content));
}

export function buildReaderBodyQuickEditPatch(
  bodyDraft: string,
  initialContent: string | null | undefined
): CardUpdate | null {
  if (!isReaderBodyQuickEditEligible(initialContent)) return null;

  const nextHtml = plainBodyDraftToContentHtml(bodyDraft);
  const normalizedInitial = normalizeEligibleBodyContent(initialContent ?? '');
  const normalizedNext = normalizeEligibleBodyContent(nextHtml);
  if (normalizedNext === normalizedInitial) return null;

  return { content: normalizedNext };
}
