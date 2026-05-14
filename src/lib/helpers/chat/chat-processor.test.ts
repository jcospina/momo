import type { ChatMessage } from '@lib-types/chat';
import type { ParsedEntry } from '@lib-types/expenses';
import { processChatMessage } from './chat-processor';

const mockParseChatEntries = jest.fn();
const mockPersistParsedExpenses = jest.fn();
const mockUpdateMessageStatus = jest.fn();
const mockGetUserPreferences = jest.fn();
const mockCreateSupabaseServerClient = jest.fn();
const mockFetchCategoryRules = jest.fn();
const mockSupabaseClient = { from: jest.fn() };

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

jest.mock('@helpers/expenses/category-rules', () => ({
  fetchCategoryRules: (...args: unknown[]) => mockFetchCategoryRules(...args),
}));

jest.mock('@lib-supabase/server', () => ({
  createSupabaseServerClient: (...args: unknown[]) =>
    mockCreateSupabaseServerClient(...args),
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
    author_kind: 'user',
    momo_source: null,
    momo_invocation_tagged: false,
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
    ...overrides,
  };
}

describe('processChatMessage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUserPreferences.mockResolvedValue({ currency: 'USD' });
    mockPersistParsedExpenses.mockResolvedValue({ expenseIds: ['exp-1'] });
    mockUpdateMessageStatus.mockResolvedValue({});
    mockCreateSupabaseServerClient.mockResolvedValue(mockSupabaseClient);
    mockFetchCategoryRules.mockResolvedValue(new Map());
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

  it('persists income-category entries as processed', async () => {
    const message = buildMessage({ content: 'salary 2000' });
    const incomeEntry = buildEntry({
      raw: 'salary 2000',
      category: 'income',
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
    );
  });

  it('applies learned rules over dictionary category matches', async () => {
    const message = buildMessage({ content: 'uber 20' });
    const dictionaryEntry = buildEntry({
      raw: 'uber 20',
      normalized: 'uber 20',
      category: 'transportation',
    });
    mockParseChatEntries.mockReturnValue({
      status: 'parsed',
      entries: [dictionaryEntry],
      errors: [],
    });
    mockFetchCategoryRules.mockResolvedValue(new Map([['uber', 'dining']]));

    await processChatMessage(message);

    expect(mockFetchCategoryRules).toHaveBeenCalledWith({
      supabase: mockSupabaseClient,
      userId: message.user_id,
      householdId: message.household_id,
      normalizedTexts: ['uber'],
    });
    expect(mockPersistParsedExpenses).toHaveBeenCalledWith(
      message,
      [buildEntry({ ...dictionaryEntry, category: 'dining' })],
      'processed',
    );
  });

  it('preserves deterministic parser tags when applying learned rules', async () => {
    const message = buildMessage({ content: 'yber 20' });
    const parsedEntry = buildEntry({
      raw: 'yber 20',
      normalized: 'yber 20',
      tags: ['yber'],
      category: 'transportation',
    });
    mockParseChatEntries.mockReturnValue({
      status: 'parsed',
      entries: [parsedEntry],
      errors: [],
    });
    mockFetchCategoryRules.mockResolvedValue(new Map([['yber', 'shopping']]));

    await processChatMessage(message);

    expect(mockPersistParsedExpenses).toHaveBeenCalledWith(
      message,
      [buildEntry({ ...parsedEntry, category: 'shopping', tags: ['yber'] })],
      'processed',
    );
  });

  it('keeps explicit-income entries as income and excludes them from rule lookup', async () => {
    const message = buildMessage({ content: '+2000 salary, taxi 20' });
    const explicitIncomeEntry = buildEntry({
      raw: '+2000 salary',
      normalized: '+2000 salary',
      category: 'income',
    });
    const uncategorizedExpense = buildEntry({
      raw: 'taxi 20',
      normalized: 'taxi 20',
      category: null,
    });
    mockParseChatEntries.mockReturnValue({
      status: 'parsed',
      entries: [explicitIncomeEntry, uncategorizedExpense],
      errors: [],
    });
    mockFetchCategoryRules.mockResolvedValue(
      new Map([
        ['salary', 'groceries'],
        ['taxi', 'transportation'],
      ]),
    );

    await processChatMessage(message);

    expect(mockFetchCategoryRules).toHaveBeenCalledWith({
      supabase: mockSupabaseClient,
      userId: message.user_id,
      householdId: message.household_id,
      normalizedTexts: ['taxi'],
    });
    expect(mockPersistParsedExpenses).toHaveBeenCalledWith(
      message,
      [
        explicitIncomeEntry,
        buildEntry({
          ...uncategorizedExpense,
          category: 'transportation',
        }),
      ],
      'processed',
    );
  });

  it('keeps needs_category status tied to uncategorized expense entries', async () => {
    const message = buildMessage({ content: 'salary 2000, taxi 20' });
    const uncertainIncome = buildEntry({
      raw: 'salary 2000',
      category: 'income',
    });
    const uncategorizedExpense = buildEntry({
      raw: 'taxi 20',
      category: null,
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
    );
  });

  it('preserves parser review flags and skips learned rules for ambiguous amounts', async () => {
    const message = buildMessage({ content: 'crema 2 10k' });
    const ambiguousEntry = buildEntry({
      raw: 'crema 2 10k',
      normalized: 'crema 2 10k',
      amount_minor: 2,
      category: null,
      needs_review: true,
    });
    mockParseChatEntries.mockReturnValue({
      status: 'parsed',
      entries: [ambiguousEntry],
      errors: [],
    });
    mockFetchCategoryRules.mockResolvedValue(new Map([['crema', 'self_care']]));

    await processChatMessage(message);

    expect(mockFetchCategoryRules).not.toHaveBeenCalled();
    expect(mockPersistParsedExpenses).toHaveBeenCalledWith(
      message,
      [ambiguousEntry],
      'needs_category',
    );
  });
});
