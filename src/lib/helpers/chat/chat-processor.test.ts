import type { ChatMessage } from '@lib-types/chat';
import type { ParsedEntry } from '@lib-types/expenses';
import { processChatMessage } from './chat-processor';

const mockParseChatEntries = jest.fn();
const mockPersistParsedExpenses = jest.fn();
const mockUpdateMessageStatus = jest.fn();
const mockGetUserPreferences = jest.fn();

jest.mock('@helpers/expenses/expense-parser', () => ({
  parseChatEntries: (...args: unknown[]) => mockParseChatEntries(...args),
}));

jest.mock('@helpers/expenses/expense-persistence', () => ({
  persistParsedExpenses: (...args: unknown[]) =>
    mockPersistParsedExpenses(...args),
  updateMessageStatus: (...args: unknown[]) => mockUpdateMessageStatus(...args),
}));

jest.mock('@helpers/user-prefs', () => ({
  getUserPreferences: (...args: unknown[]) => mockGetUserPreferences(...args),
}));

function buildMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: 'msg-1',
    household_id: null,
    user_id: 'user-1',
    content: 'sample',
    status: 'pending',
    expense_count: 0,
    created_at: new Date().toISOString(),
    sender_name: 'User',
    ...overrides,
  };
}

function buildEntry(overrides: Partial<ParsedEntry> = {}): ParsedEntry {
  return {
    raw: 'groceries 20',
    normalized: 'groceries 20',
    amount_minor: 2000,
    multiplier: 1,
    currency: 'USD',
    tags: ['groceries'],
    category: 'groceries',
    entry_type: 'expense',
    has_uncertain_type: false,
    ...overrides,
  };
}

describe('processChatMessage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUserPreferences.mockResolvedValue({ currency: 'USD' });
    mockPersistParsedExpenses.mockResolvedValue({ expenseIds: ['exp-1'] });
    mockUpdateMessageStatus.mockResolvedValue({});
  });

  it('marks chat as no_expense when parser finds no amounts', async () => {
    const message = buildMessage({ content: 'hello there' });
    mockParseChatEntries.mockReturnValue({
      status: 'no_expense',
      entries: [],
      errors: [
        {
          raw: 'hello there',
          normalized: 'hello there',
          errorCode: 'amount_missing',
        },
      ],
    });

    const result = await processChatMessage(message);

    expect(result.status).toBe('no_expense');
    expect(mockUpdateMessageStatus).toHaveBeenCalledWith(
      message.id,
      'no_expense',
    );
    expect(mockPersistParsedExpenses).not.toHaveBeenCalled();
  });

  it('persists uncertain income entries as processed with uncertainty flag', async () => {
    const message = buildMessage({ content: 'salary 2000' });
    const incomeEntry = buildEntry({
      raw: 'salary 2000',
      category: 'income',
      entry_type: 'income',
      has_uncertain_type: true,
    });
    mockParseChatEntries.mockReturnValue({
      status: 'parsed',
      entries: [incomeEntry],
      errors: [],
    });

    const result = await processChatMessage(message);

    expect(result.status).toBe('parsed');
    expect(mockPersistParsedExpenses).toHaveBeenCalledWith(
      message,
      [incomeEntry],
      'processed',
      true,
    );
  });

  it('keeps needs_category status tied to uncategorized expense entries', async () => {
    const message = buildMessage({ content: 'salary 2000, taxi 20' });
    const uncertainIncome = buildEntry({
      raw: 'salary 2000',
      category: 'income',
      entry_type: 'income',
      has_uncertain_type: true,
    });
    const uncategorizedExpense = buildEntry({
      raw: 'taxi 20',
      category: null,
      entry_type: 'expense',
      has_uncertain_type: false,
    });
    mockParseChatEntries.mockReturnValue({
      status: 'parsed',
      entries: [uncertainIncome, uncategorizedExpense],
      errors: [],
    });

    await processChatMessage(message);

    expect(mockPersistParsedExpenses).toHaveBeenCalledWith(
      message,
      [uncertainIncome, uncategorizedExpense],
      'needs_category',
      true,
    );
  });
});
