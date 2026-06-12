import StarterKit from '@tiptap/starter-kit';
import { CardMention } from '@/lib/tiptap/extensions/CardMention';
import { FigureWithImage } from '@/lib/tiptap/extensions/FigureWithImage';

/** Extensions shared by read-only TipTap surfaces (static HTML + legacy renderer). */
export function getReadOnlyTipTapExtensions() {
  return [
    StarterKit,
    FigureWithImage.configure({
      HTMLAttributes: {
        class: 'figure',
      },
    }),
    CardMention,
  ];
}
