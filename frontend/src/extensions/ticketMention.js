import Mention from '@tiptap/extension-mention';
import { ReactRenderer } from '@tiptap/react';
import tippy from 'tippy.js';
import MentionList from '../components/MentionList';

let cachedTickets = [];
let cachedUsers = [];

export function setMentionData(tickets, users) {
  cachedTickets = tickets || [];
  cachedUsers = users || [];
}

function getSuggestionItems(query) {
  const q = query.toLowerCase().trim();
  const results = [];

  // Search tickets - match by ID or title
  cachedTickets.forEach((t) => {
    const idMatch = String(t.id).includes(q);
    const titleMatch = (t.title || '').toLowerCase().includes(q);
    if (!q || idMatch || titleMatch) {
      results.push({
        id: `ticket-${t.id}`,
        ticketId: t.id,
        label: t.title || `Ticket #${t.id}`,
        type: 'ticket',
      });
    }
  });

  // Search users - match by name
  cachedUsers.forEach((u) => {
    const nameMatch = (u.name || '').toLowerCase().includes(q);
    if (!q || nameMatch) {
      results.push({
        id: `user-${u.id}`,
        userId: u.id,
        label: u.name || `User #${u.id}`,
        avatarUrl: u.avatarUrl,
        type: 'user',
      });
    }
  });

  return results.slice(0, 10);
}

const suggestion = {
  items: ({ query }) => getSuggestionItems(query),
  char: '#',

  render: () => {
    let component;
    let popup;

    return {
      onStart: (props) => {
        component = new ReactRenderer(MentionList, {
          props,
          editor: props.editor,
        });

        if (!props.clientRect) return;

        popup = tippy('body', {
          getReferenceClientRect: props.clientRect,
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: 'manual',
          placement: 'bottom-start',
        });
      },

      onUpdate(props) {
        component?.updateProps(props);
        if (props.clientRect) {
          popup?.[0]?.setProps({ getReferenceClientRect: props.clientRect });
        }
      },

      onKeyDown(props) {
        if (props.event.key === 'Escape') {
          popup?.[0]?.hide();
          return true;
        }
        return component?.ref?.onKeyDown(props) || false;
      },

      onExit() {
        popup?.[0]?.destroy();
        component?.destroy();
      },
    };
  },
};

const TicketMention = Mention.extend({
  addAttributes() {
    return {
      id: { default: null },
      label: { default: null },
    };
  },

  renderHTML({ node }) {
    const mentionId = node.attrs.id || '';
    const isTicket = mentionId.startsWith('ticket-');
    const rawId = mentionId.replace(/^(ticket-|user-)/, '');

    if (isTicket) {
      return [
        'a',
        {
          class: 'hashtag-mention hashtag-ticket',
          href: `/tickets/${rawId}`,
          'data-type': 'mention',
          'data-mention-type': 'ticket',
          'data-id': rawId,
        },
        `#${rawId} ${node.attrs.label || ''}`.trim(),
      ];
    }

    return [
      'span',
      {
        class: 'hashtag-mention hashtag-user',
        'data-type': 'mention',
        'data-mention-type': 'user',
        'data-id': rawId,
      },
      `#${node.attrs.label || rawId}`,
    ];
  },

  parseHTML() {
    return [
      {
        tag: 'a[data-type="mention"][data-mention-type="ticket"]',
        getAttrs: (el) => ({
          id: `ticket-${el.getAttribute('data-id')}`,
          label: el.textContent?.replace(/^#\d+\s*/, '') || '',
        }),
      },
      {
        tag: 'span[data-type="mention"][data-mention-type="user"]',
        getAttrs: (el) => ({
          id: `user-${el.getAttribute('data-id')}`,
          label: el.textContent?.replace(/^#/, '') || '',
        }),
      },
    ];
  },
}).configure({
  HTMLAttributes: {
    class: 'hashtag-mention',
  },
  suggestion,
});

export default TicketMention;
