import { Node, mergeAttributes } from '@tiptap/core';

export interface FigcaptionOptions {
  HTMLAttributes: Record<string, any>;
}

export const Figcaption = Node.create<FigcaptionOptions>({
  name: 'figcaption',

  group: 'block',

  content: 'text*',

  parseHTML() {
    return [
      {
        tag: 'figcaption',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['figcaption', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },
}); 