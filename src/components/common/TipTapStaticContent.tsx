'use client';

import { useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { generateReadOnlyHtml } from '@/lib/tiptap/generateReadOnlyHtml';
import styles from './TipTapRenderer.module.css';

export type TipTapStaticHeadingVariant =
  | 'default'
  | 'detail'
  | 'storyDetail'
  | 'galleryDetail'
  | 'story'
  | 'gallery'
  | 'question'
  | 'callout';

interface TipTapStaticContentProps {
  content: string;
  /** Feed tiles: avoid ProseMirror panel fill (prevents a contrasting horizontal band on card surfaces). */
  surface?: 'default' | 'transparent';
  headingVariant?: TipTapStaticHeadingVariant;
}

function getHeadingVariantClass(headingVariant: TipTapStaticHeadingVariant): string {
  switch (headingVariant) {
    case 'detail':
      return styles.rendererDetailHeadings;
    case 'storyDetail':
      return styles.rendererStoryDetailHeadings;
    case 'galleryDetail':
      return styles.rendererGalleryDetailHeadings;
    case 'story':
      return styles.rendererStoryHeadings;
    case 'gallery':
      return styles.rendererGalleryHeadings;
    case 'question':
      return styles.rendererQuestionHeadings;
    case 'callout':
      return styles.rendererCalloutHeadings;
    default:
      return '';
  }
}

/**
 * Lightweight read-only TipTap output for closed feed tiles. Uses generateHTML instead of
 * mounting a ProseMirror editor per card.
 */
const TipTapStaticContent: React.FC<TipTapStaticContentProps> = ({
  content,
  surface = 'default',
  headingVariant = 'default',
}) => {
  const router = useRouter();
  const html = useMemo(() => generateReadOnlyHtml(content), [content]);

  const navigateToCardMention = useCallback(
    (target: EventTarget | null) => {
      const el = (target as HTMLElement | null)?.closest(
        '[data-type="cardMention"][data-card-id]'
      );
      if (!el) return false;
      const id = el.getAttribute('data-card-id');
      if (!id) return false;
      router.push(`/view/${id}`);
      return true;
    },
    [router]
  );

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (navigateToCardMention(event.target)) {
        event.preventDefault();
      }
    },
    [navigateToCardMention]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      if (navigateToCardMention(event.target)) {
        event.preventDefault();
      }
    },
    [navigateToCardMention]
  );

  if (!html) {
    return null;
  }

  return (
    <div
      className={[
        styles.renderer,
        surface === 'transparent' ? styles.rendererTransparent : '',
        getHeadingVariantClass(headingVariant),
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

export default TipTapStaticContent;
