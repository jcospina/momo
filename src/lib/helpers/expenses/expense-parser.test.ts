import { parseChatEntries } from './expense-parser';

describe('parseChatEntries', () => {
  it('parses decimal amounts', () => {
    const result = parseChatEntries('12.5');
    expect(result.status).toBe('parsed');
    if (result.status === 'parsed') {
      expect(result.entries[0].amount_minor).toBe(1250);
      expect(result.entries[0].category).toBeNull();
    }
  });

  it('parses k and m multipliers', () => {
    const result = parseChatEntries('10k, 2M');
    expect(result.status).toBe('parsed');
    if (result.status === 'parsed') {
      expect(result.entries[0].amount_minor).toBe(1_000_000);
      expect(result.entries[1].amount_minor).toBe(200_000_000);
    }
  });

  it('extracts amounts from mixed text entries', () => {
    const result = parseChatEntries('groceries 100');
    expect(result.status).toBe('parsed');
    if (result.status === 'parsed') {
      expect(result.entries[0].amount_minor).toBe(10_000);
      expect(result.entries[0].category).toBe('groceries');
    }
  });

  it('parses multiple comma-separated entries with extra words', () => {
    const result = parseChatEntries('paid 20 at saloon, 10 in taxis');
    expect(result.status).toBe('parsed');
    if (result.status === 'parsed') {
      expect(result.entries).toHaveLength(2);
      expect(result.entries[0].amount_minor).toBe(2000);
      expect(result.entries[1].amount_minor).toBe(1000);
    }
  });

  it('classifies +amount as income category', () => {
    const result = parseChatEntries('+2000 paycheck');
    expect(result.status).toBe('parsed');
    if (result.status === 'parsed') {
      expect(result.entries[0].category).toBe('income');
    }
  });

  it('uses text inference when dictionary match resolves income', () => {
    const result = parseChatEntries('salary 2000');
    expect(result.status).toBe('parsed');
    if (result.status === 'parsed') {
      expect(result.entries[0].category).toBe('income');
    }
  });

  it('treats salario dictionary matches as income', () => {
    const result = parseChatEntries('salario 1m');
    expect(result.status).toBe('parsed');
    if (result.status === 'parsed') {
      expect(result.entries[0].category).toBe('income');
    }
  });

  it('prioritizes explicit + over text inference', () => {
    const result = parseChatEntries('+1500 groceries');
    expect(result.status).toBe('parsed');
    if (result.status === 'parsed') {
      expect(result.entries[0].category).toBe('income');
    }
  });

  it('forces income category when explicit + is present and no dictionary match exists', () => {
    const result = parseChatEntries('+4m pagaron');
    expect(result.status).toBe('parsed');
    if (result.status === 'parsed') {
      expect(result.entries[0].category).toBe('income');
    }
  });

  it('handles empty or invalid entries', () => {
    const result = parseChatEntries('abc, 0, , 5');
    expect(result.status).toBe('parsed');
    if (result.status === 'parsed') {
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].amount_minor).toBe(500);
      expect(result.errors).toHaveLength(2);
    }
  });

  it('returns no_expense when no amounts are found', () => {
    const result = parseChatEntries('hello there');
    expect(result.status).toBe('no_expense');
    expect(result.entries).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
  });
});
