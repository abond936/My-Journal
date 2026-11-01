'use client';

import { useCallback, useState } from 'react';
import { Link2 } from 'lucide-react';

type CopyReaderLinkButtonProps = {
  path: string;
  label?: string;
  className?: string;
  disabled?: boolean;
};

export function buildReaderLink(origin: string, path: string): string {
  if (!path.startsWith('/') || path.startsWith('//')) {
    throw new Error('Reader links must use an internal application path.');
  }
  return new URL(path, origin).toString();
}

export default function CopyReaderLinkButton({
  path,
  label = 'Copy Reader link',
  className,
  disabled = false,
}: CopyReaderLinkButtonProps) {
  const [copying, setCopying] = useState(false);
  const [result, setResult] = useState<'idle' | 'copied' | 'failed'>('idle');

  const copyLink = useCallback(async () => {
    setCopying(true);
    setResult('idle');
    try {
      const url = buildReaderLink(window.location.origin, path);
      await navigator.clipboard.writeText(url);
      setResult('copied');
    } catch {
      setResult('failed');
    } finally {
      setCopying(false);
    }
  }, [path]);

  const visibleLabel = copying
    ? 'Copying...'
    : result === 'copied'
      ? 'Link copied — access unchanged'
      : result === 'failed'
        ? 'Copy failed — copy from Reader'
        : label;

  return (
    <button
      type="button"
      className={className}
      disabled={disabled || copying}
      onClick={() => void copyLink()}
      title="Copy a direct link without changing who is authorized to open it"
      aria-live="polite"
    >
      <Link2 size={16} aria-hidden="true" />
      {visibleLabel}
    </button>
  );
}
