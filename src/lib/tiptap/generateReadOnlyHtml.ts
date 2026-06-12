import { generateHTML, generateJSON } from '@tiptap/html';
import { getReadOnlyTipTapExtensions } from '@/lib/tiptap/readOnlyRenderExtensions';

const readOnlyExtensions = getReadOnlyTipTapExtensions();

/**
 * Parse stored TipTap HTML through the read-only extension schema and emit normalized HTML
 * without mounting a ProseMirror editor instance.
 */
export function generateReadOnlyHtml(content: string): string {
  const trimmed = content?.trim();
  if (!trimmed) {
    return '';
  }

  try {
    const json = generateJSON(trimmed, readOnlyExtensions);
    return generateHTML(json, readOnlyExtensions);
  } catch {
    return trimmed;
  }
}
