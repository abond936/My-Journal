import Heading from '@tiptap/extension-heading';

/**
 * Ordinary TipTap heading with one additive authoring-only marker. Existing
 * headings remain ordinary reader content; only explicitly copied prompts set
 * `promptBlock`.
 */
export const PromptAwareHeading = Heading.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      promptBlock: {
        default: false,
        parseHTML: (element) => element.getAttribute('data-prompt-block') === 'true',
        renderHTML: (attributes) =>
          attributes.promptBlock ? { 'data-prompt-block': 'true' } : {},
      },
    };
  },
});
