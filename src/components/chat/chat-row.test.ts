import type { ChatMessage } from '@lib-types/chat';

jest.mock('react-markdown', () => ({ __esModule: true, default: () => null }));
jest.mock('remark-gfm', () => ({ __esModule: true, default: () => undefined }));

import { rowKind } from './chat-row';

function message(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: 'msg-1',
    household_id: null,
    user_id: 'user-1',
    content: 'lunch 12.50',
    status: 'processed',
    expense_count: 1,
    created_at: '2026-05-14T12:00:00.000Z',
    sender_name: 'Alex',
    author_kind: 'user',
    momo_source: null,
    momo_invocation_tagged: false,
    idempotency_key: null,
    ...overrides,
  };
}

describe('rowKind', () => {
  it.each([
    ['MoMo replies', message({ author_kind: 'momo' }), true, true, 'momo'],
    [
      'a send in flight',
      message({ id: 'tmp-1', status: 'pending' }),
      true,
      false,
      'sending',
    ],
    [
      'a send that failed',
      message({ id: 'tmp-1', status: 'failed' }),
      true,
      false,
      'unsent',
    ],
    [
      'a row still being read',
      message({ status: 'pending' }),
      false,
      false,
      'sending',
    ],
    [
      'your unreadable message',
      message({ status: 'failed', expense_count: 0 }),
      true,
      false,
      'oops',
    ],
    [
      "someone else's unreadable message",
      message({ status: 'failed', expense_count: 0 }),
      false,
      false,
      'note',
    ],
    ['a logged expense', message({}), true, true, 'ticket'],
    [
      'a logged expense whose lines are loading',
      message({}),
      true,
      false,
      'loading-ticket',
    ],
    [
      'a missing category',
      message({ status: 'needs_category' }),
      true,
      true,
      'ticket',
    ],
    [
      'a plain note',
      message({ status: 'no_expense', expense_count: 0 }),
      true,
      false,
      'note',
    ],
  ] as const)('%s', (_label, input, isOwn, hasLines, expected) => {
    expect(rowKind(input, isOwn, hasLines)).toBe(expected);
  });
});
