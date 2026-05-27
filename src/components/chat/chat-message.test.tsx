import type { ChatMessage as ChatMessageRecord } from '@lib-types/chat';
import { render, screen } from '@testing-library/react';
import logoStyles from '@ui/logo/logo.module.css';
import type { ReactNode } from 'react';

// react-markdown is ESM-only; mock it so jest doesn't need to transpile it.
// The mock recognizes `**bold**` syntax so we can assert the regression case
// (persisted MoMo rows must render Markdown, not literal asterisks).
jest.mock('react-markdown', () => ({
  __esModule: true,
  default: ({ children }: { children: string }) => {
    const parts: ReactNode[] = [];
    const pattern = /\*\*(.+?)\*\*/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null = pattern.exec(children);
    let key = 0;
    while (match) {
      if (match.index > lastIndex) {
        parts.push(children.slice(lastIndex, match.index));
      }
      parts.push(<strong key={`b-${key++}`}>{match[1]}</strong>);
      lastIndex = match.index + match[0].length;
      match = pattern.exec(children);
    }
    if (lastIndex < children.length) {
      parts.push(children.slice(lastIndex));
    }
    return <p>{parts}</p>;
  },
}));

jest.mock('remark-gfm', () => ({
  __esModule: true,
  default: () => undefined,
}));

import { ChatMessage } from './chat-message';
import bubbleStyles from './chat-message-bubble.module.css';

function buildMessage(
  overrides: Partial<ChatMessageRecord> = {},
): ChatMessageRecord {
  return {
    id: 'msg-1',
    household_id: null,
    user_id: 'user-1',
    content: 'salary 2000',
    status: 'processed',
    expense_count: 1,
    created_at: '2026-03-20T10:00:00.000Z',
    sender_name: 'User One',
    author_kind: 'user',
    momo_source: null,
    momo_invocation_tagged: false,
    idempotency_key: null,
    ...overrides,
  };
}

describe('ChatMessage status indicator', () => {
  it('renders needs_category action for own messages', () => {
    render(
      <ChatMessage
        message={buildMessage({ status: 'needs_category', expense_count: 0 })}
        currentUserId="user-1"
        isHousehold={false}
      />,
    );

    expect(
      screen.getByRole('button', { name: 'needs category' }),
    ).toBeInTheDocument();
  });

  it('renders expense_created action for household incoming messages with expenses', () => {
    render(
      <ChatMessage
        message={buildMessage({
          user_id: 'user-2',
          household_id: 'house-1',
          sender_name: 'User Two',
          expense_count: 2,
        })}
        currentUserId="user-1"
        isHousehold
      />,
    );

    expect(
      screen.getByRole('button', { name: 'expenses created' }),
    ).toBeInTheDocument();
  });

  it('does not render a status action when there are no expenses and no warning status', () => {
    render(
      <ChatMessage
        message={buildMessage({ expense_count: 0, status: 'processed' })}
        currentUserId="user-1"
        isHousehold={false}
      />,
    );

    expect(
      screen.queryByRole('button', { name: 'needs category' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'expense created' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'expenses created' }),
    ).not.toBeInTheDocument();
  });
});

describe('ChatMessage MoMo rendering', () => {
  function buildMomoMessage(
    overrides: Partial<ChatMessageRecord> = {},
  ): ChatMessageRecord {
    return buildMessage({
      id: 'momo-msg-1',
      user_id: 'user-1',
      content: 'Got it — logged $5 for coffee.',
      status: 'processed',
      expense_count: 0,
      sender_name: null,
      author_kind: 'momo',
      momo_source: 'momo_agent',
      momo_invocation_tagged: false,
      ...overrides,
    });
  }

  it('renders MoMo rows on the incoming side even when user_id matches the current user', () => {
    const { container } = render(
      <ChatMessage
        message={buildMomoMessage()}
        currentUserId="user-1"
        isHousehold={false}
      />,
    );

    const bubble = container.querySelector(
      `.${bubbleStyles['momo-chat-bubble']}`,
    );
    expect(bubble).toBeInTheDocument();
    expect(bubble).not.toHaveClass(bubbleStyles['momo-chat-bubble--own']);

    const messageBlock = container.querySelector(
      `.${bubbleStyles['momo-chat-bubble__message']}`,
    );
    expect(messageBlock).not.toHaveClass(
      bubbleStyles['momo-chat-bubble__message--own'],
    );
  });

  it('does not render expense-status, retry, category-picker, expense-created, or actions slots for MoMo rows', () => {
    // expense_count=3 would normally render an "expenses created" badge on
    // an incoming row; MoMo rows must suppress that regardless.
    const { container } = render(
      <ChatMessage
        message={buildMomoMessage({ expense_count: 3, status: 'processed' })}
        currentUserId="user-1"
        isHousehold={false}
      />,
    );

    expect(
      screen.queryByRole('button', { name: 'send failed' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'needs category' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'expense failed' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'expense created' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'expenses created' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Message actions' }),
    ).not.toBeInTheDocument();

    const statusSlot = container.querySelector(
      `.${bubbleStyles['momo-chat-bubble__status-slot']}`,
    );
    expect(statusSlot).toBeNull();

    const actionsSlot = container.querySelector(
      `.${bubbleStyles['momo-chat-bubble__actions-slot']}`,
    );
    expect(actionsSlot).toBeNull();
  });

  it('does not render a household sender label on MoMo rows', () => {
    const { container } = render(
      <ChatMessage
        message={buildMomoMessage({
          household_id: 'house-1',
          sender_name: 'Not Used',
        })}
        currentUserId="user-1"
        isHousehold
      />,
    );

    expect(screen.queryByText('Not Used')).not.toBeInTheDocument();
    const sender = container.querySelector(
      `.${bubbleStyles['momo-chat-bubble__sender']}`,
    );
    expect(sender).toBeNull();
  });

  it('renders the MoMo logo avatar on MoMo rows in personal scope', () => {
    const { container } = render(
      <ChatMessage
        message={buildMomoMessage()}
        currentUserId="user-1"
        isHousehold={false}
      />,
    );

    const logo = container.querySelector(`.${logoStyles['momo-logo']}`);
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveTextContent('M');
  });

  it('renders the MoMo logo avatar on MoMo rows in household scope', () => {
    const { container } = render(
      <ChatMessage
        message={buildMomoMessage({ household_id: 'house-1' })}
        currentUserId="user-1"
        isHousehold
      />,
    );

    const logo = container.querySelector(`.${logoStyles['momo-logo']}`);
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveTextContent('M');
  });

  it('renders Markdown bold in persisted MoMo content (regression: literal **$204** rendered as text)', () => {
    render(
      <ChatMessage
        message={buildMomoMessage({
          content: "You've spent **$204** this month.",
        })}
        currentUserId="user-1"
        isHousehold={false}
      />,
    );

    const strong = screen.getByText('$204');
    expect(strong.tagName).toBe('STRONG');
    expect(screen.queryByText(/\*\*\$204\*\*/)).not.toBeInTheDocument();
  });

  it('does not render an avatar for non-MoMo incoming messages in personal scope', () => {
    const { container } = render(
      <ChatMessage
        message={buildMessage({
          user_id: 'user-2',
          sender_name: 'User Two',
        })}
        currentUserId="user-1"
        isHousehold={false}
      />,
    );

    const logo = container.querySelector(`.${logoStyles['momo-logo']}`);
    expect(logo).toBeNull();
    const placeholder = container.querySelector(
      `.${bubbleStyles['momo-chat-bubble__avatar-placeholder']}`,
    );
    expect(placeholder).toBeInTheDocument();
  });
});
