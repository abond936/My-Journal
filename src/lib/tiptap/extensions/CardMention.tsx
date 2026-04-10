'use client';

import Mention from '@tiptap/extension-mention';
import { mergeAttributes } from '@tiptap/core';
import { PluginKey } from '@tiptap/pm/state';
import { ReactRenderer } from '@tiptap/react';
import tippy, { type Instance } from 'tippy.js';
import CardMentionList, {
  type CardMentionItem,
} from '@/components/common/CardMentionList';
import type { Card } from '@/lib/types/card';

import 'tippy.js/dist/tippy.css';

export const CardMentionPluginKey = new PluginKey('cardMention');

async function fetchCardMentionItems(
  query: string,
  excludeId?: string
): Promise<CardMentionItem[]> {
  try {
    const params = new URLSearchParams({ limit: '20', status: 'all' });
    const q = query.trim();
    if (q) params.set('q', q);
    const res = await fetch(`/api/cards?${params.toString()}`);
    if (!res.ok) return [];
    const data = await res.json();
    const list: Card[] = data.items || [];
    return list
      .filter(c => c.docId && c.docId !== excludeId)
      .map(c => ({
        id: c.docId,
        label: (c.title || c.subtitle || 'Untitled').slice(0, 120),
      }));
  } catch {
    return [];
  }
}

function createSuggestionRender() {
  return () => {
    let component: ReactRenderer | null = null;
    let popup: Instance | null = null;

    return {
      onStart: (props: {
        items: CardMentionItem[];
        command: (item: CardMentionItem) => void;
        clientRect?: (() => DOMRect | null) | null;
        editor: import('@tiptap/core').Editor;
      }) => {
        component = new ReactRenderer(CardMentionList, {
          props,
          editor: props.editor,
        });

        popup = tippy(document.body, {
          getReferenceClientRect: props.clientRect as () => DOMRect,
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: 'manual',
          placement: 'bottom-start',
        });
      },

      onUpdate(props: {
        items: CardMentionItem[];
        command: (item: CardMentionItem) => void;
        clientRect?: (() => DOMRect | null) | null;
        editor: import('@tiptap/core').Editor;
      }) {
        component?.updateProps(props);
        popup?.setProps({
          getReferenceClientRect: props.clientRect as () => DOMRect,
        });
      },

      onKeyDown(props: { event: KeyboardEvent }) {
        if (props.event.key === 'Escape') {
          popup?.hide();
          return true;
        }
        return (
          (component?.ref as { onKeyDown?: (p: typeof props) => boolean } | undefined)
            ?.onKeyDown?.(props) ?? false
        );
      },

      onExit() {
        popup?.destroy();
        component?.destroy();
      },
    };
  };
}

function getExcludeCardId(editor: import('@tiptap/core').Editor): string | undefined {
  const s = editor.storage as {
    cardMention?: { excludeCardId?: string };
  };
  return s.cardMention?.excludeCardId;
}

/**
 * Inline @-triggered reference to another card. Serializes as a span with data-card-id
 * (navigate on click in TipTapRenderer via Next router).
 */
export const CardMention = Mention.extend({
  name: 'cardMention',

  addStorage() {
    return {
      excludeCardId: undefined as string | undefined,
    };
  },

  addOptions() {
    const parent = this.parent;
    return {
      ...parent?.(),
      renderHTML({ options, node }) {
        const id = node.attrs.id;
        if (!id) {
          return ['span', { class: 'card-inline-link card-inline-link--broken' }, ''];
        }
        const label = node.attrs.label || id;
        const ch = options.suggestion?.char ?? '@';
        return [
          'span',
          mergeAttributes(
            {
              'data-type': 'cardMention',
              'data-card-id': id,
              'data-id': id,
              'data-label': label,
              class: 'card-inline-link',
              role: 'link',
              tabIndex: 0,
            },
            options.HTMLAttributes || {}
          ),
          `${ch}${label}`,
        ];
      },
      renderText({ options, node }) {
        const label = node.attrs.label || node.attrs.id;
        return `${options.suggestion?.char ?? '@'}${label}`;
      },
      suggestion: {
        ...parent?.().suggestion,
        pluginKey: CardMentionPluginKey,
        items: async ({ query, editor }) => {
          return fetchCardMentionItems(query, getExcludeCardId(editor));
        },
        render: createSuggestionRender(),
      },
    };
  },

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: element =>
          element.getAttribute('data-card-id') ||
          element.getAttribute('data-id'),
        renderHTML: attributes => {
          if (!attributes.id) {
            return {};
          }
          return {
            'data-id': attributes.id,
            'data-card-id': attributes.id,
          };
        },
      },
      label: {
        default: null,
        parseHTML: element => element.getAttribute('data-label'),
        renderHTML: attributes => {
          if (!attributes.label) {
            return {};
          }
          return {
            'data-label': attributes.label,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-card-id]',
        getAttrs: element => {
          const el = element as HTMLElement;
          const id = el.getAttribute('data-card-id');
          if (!id) {
            return false;
          }
          const fromAttr = el.getAttribute('data-label');
          const raw = el.textContent || '';
          const stripped = raw.replace(/^@[\s]*/, '');
          const label = fromAttr || stripped || id;
          return { id, label };
        },
      },
      {
        tag: 'span[data-type="cardMention"]',
        getAttrs: element => {
          const el = element as HTMLElement;
          const id =
            el.getAttribute('data-card-id') ||
            el.getAttribute('data-id');
          if (!id) {
            return false;
          }
          const label =
            el.getAttribute('data-label') ||
            el.textContent?.replace(/^@[\s]*/, '') ||
            id;
          return { id, label };
        },
      },
    ];
  },
});
