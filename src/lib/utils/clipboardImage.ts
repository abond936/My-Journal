/**
 * True when the transfer carries non-empty text/HTML/URI list so the editor should
 * handle the event (paste/drop) instead of treating it as image-only.
 */
export function dataTransferHasMeaningfulText(data: DataTransfer | null | undefined): boolean {
  if (!data) return false;
  const plain = data.getData('text/plain')?.trim() ?? '';
  if (plain.length > 0) return true;
  const html = data.getData('text/html')?.trim() ?? '';
  if (html.length > 0) return true;
  const uriList = data.getData('text/uri-list')?.trim() ?? '';
  if (uriList.length > 0) return true;
  return false;
}

/**
 * Returns the first image file from a DataTransfer (drop or paste), checking both
 * `files` and `items` (screenshots and some browsers only populate `items`).
 */
export function getImageFileFromDataTransfer(data: DataTransfer | null | undefined): File | null {
  if (!data) return null;
  const fromFiles = data.files?.[0];
  if (fromFiles?.type?.startsWith('image/')) {
    return fromFiles;
  }
  for (const item of data.items ?? []) {
    if (item.kind === 'file' && item.type?.startsWith('image/')) {
      const file = item.getAsFile();
      if (file) return file;
    }
  }
  return null;
}
