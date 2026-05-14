import type { ChatMessage } from '@lib-types/chat';
import {
  CHAT_MESSAGE_SELECT,
  isChatMessage,
  isChatMessageArray,
  isMomoMessage,
} from './chat-message';

const baseMessage: ChatMessage = {
  id: 'm1',
  household_id: null,
  user_id: 'user-1',
  content: 'hello',
  status: 'processed',
  expense_count: 0,
  created_at: '2026-05-13T00:00:00.000Z',
  sender_name: 'User',
  author_kind: 'user',
  momo_source: null,
  momo_invocation_tagged: false,
  idempotency_key: null,
};

describe('CHAT_MESSAGE_SELECT', () => {
  it('includes the new author and momo metadata columns', () => {
    expect(CHAT_MESSAGE_SELECT).toContain('author_kind');
    expect(CHAT_MESSAGE_SELECT).toContain('momo_source');
    expect(CHAT_MESSAGE_SELECT).toContain('momo_invocation_tagged');
  });

  it('exposes idempotency_key so clients can correlate persisted MoMo replies with in-flight streams', () => {
    expect(CHAT_MESSAGE_SELECT).toContain('idempotency_key');
  });
});

describe('isChatMessage', () => {
  it('accepts a fully-formed user message', () => {
    expect(isChatMessage(baseMessage)).toBe(true);
  });

  it('accepts a momo-authored message', () => {
    expect(
      isChatMessage({
        ...baseMessage,
        author_kind: 'momo',
        momo_source: 'momo_agent',
      }),
    ).toBe(true);
  });

  it('rejects payloads missing author_kind', () => {
    const { author_kind: _omit, ...rest } = baseMessage;
    expect(isChatMessage(rest)).toBe(false);
  });

  it('rejects unknown author_kind values', () => {
    expect(isChatMessage({ ...baseMessage, author_kind: 'system' })).toBe(
      false,
    );
  });

  it('rejects payloads with wrong momo_source type', () => {
    expect(isChatMessage({ ...baseMessage, momo_source: 42 })).toBe(false);
  });

  it('rejects payloads with wrong momo_invocation_tagged type', () => {
    expect(
      isChatMessage({ ...baseMessage, momo_invocation_tagged: 'no' }),
    ).toBe(false);
  });

  it('accepts payloads with a string idempotency_key', () => {
    expect(
      isChatMessage({ ...baseMessage, idempotency_key: 'momo:msg-1' }),
    ).toBe(true);
  });

  it('rejects payloads with wrong idempotency_key type', () => {
    expect(isChatMessage({ ...baseMessage, idempotency_key: 42 })).toBe(false);
  });
});

describe('isChatMessageArray', () => {
  it('accepts an array of valid messages', () => {
    expect(isChatMessageArray([baseMessage, baseMessage])).toBe(true);
  });

  it('rejects when any element is invalid', () => {
    expect(
      isChatMessageArray([baseMessage, { ...baseMessage, author_kind: 'x' }]),
    ).toBe(false);
  });
});

describe('isMomoMessage', () => {
  it('returns true only for momo-authored messages', () => {
    expect(isMomoMessage(baseMessage)).toBe(false);
    expect(isMomoMessage({ ...baseMessage, author_kind: 'momo' })).toBe(true);
  });
});
