import type { ChatMessage as ChatMessageRecord } from '@lib-types/chat';
import { render, screen } from '@testing-library/react';
import { ChatMessage } from './chat-message';

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
