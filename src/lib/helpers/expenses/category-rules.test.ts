import type { SupabaseClient } from '@supabase/supabase-js';

import { fetchCategoryRules, upsertCategoryRule } from './category-rules';

describe('fetchCategoryRules', () => {
  const query = {
    select: jest.fn(),
    in: jest.fn(),
    eq: jest.fn(),
    is: jest.fn(),
  };

  const supabase = {
    from: jest.fn(() => query),
  };

  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    query.select.mockReturnValue(query);
    query.in.mockReturnValue(query);
    query.is.mockReturnValue(query);
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('returns empty map without querying when normalizedTexts is empty', async () => {
    const result = await fetchCategoryRules({
      supabase: supabase as unknown as SupabaseClient,
      userId: 'user-1',
      householdId: null,
      normalizedTexts: [],
    });

    expect(result).toEqual(new Map());
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('fetches personal rules scoped by user id and null household', async () => {
    query.eq.mockResolvedValue({
      data: [
        { normalized_text: 'uber', category: 'transportation' },
        { normalized_text: 'salario', category: 'income' },
      ],
      error: null,
    });

    const result = await fetchCategoryRules({
      supabase: supabase as unknown as SupabaseClient,
      userId: ' user-1 ',
      householdId: null,
      normalizedTexts: ['uber', 'uber', ' salario '],
    });

    expect(supabase.from).toHaveBeenCalledWith('category_rules');
    expect(query.select).toHaveBeenCalledWith('normalized_text, category');
    expect(query.in).toHaveBeenCalledWith('normalized_text', [
      'uber',
      'salario',
    ]);
    expect(query.is).toHaveBeenCalledWith('household_id', null);
    expect(query.eq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(result.get('uber')).toBe('transportation');
    expect(result.get('salario')).toBe('income');
  });

  it('fetches household rules scoped by household id', async () => {
    query.eq.mockResolvedValue({
      data: [{ normalized_text: 'd1', category: 'groceries' }],
      error: null,
    });

    const result = await fetchCategoryRules({
      supabase: supabase as unknown as SupabaseClient,
      userId: 'user-1',
      householdId: 'hh-1',
      normalizedTexts: ['d1'],
    });

    expect(query.eq).toHaveBeenCalledWith('household_id', 'hh-1');
    expect(query.is).not.toHaveBeenCalled();
    expect(result.get('d1')).toBe('groceries');
  });

  it('does not require user id for household-scoped lookups', async () => {
    query.eq.mockResolvedValue({
      data: [{ normalized_text: 'movie', category: 'entertainment' }],
      error: null,
    });

    const result = await fetchCategoryRules({
      supabase: supabase as unknown as SupabaseClient,
      userId: '   ',
      householdId: 'hh-1',
      normalizedTexts: ['movie'],
    });

    expect(query.eq).toHaveBeenCalledWith('household_id', 'hh-1');
    expect(result.get('movie')).toBe('entertainment');
  });

  it('returns empty map and warns on query errors', async () => {
    query.eq.mockResolvedValue({
      data: null,
      error: new Error('query failed'),
    });

    const result = await fetchCategoryRules({
      supabase: supabase as unknown as SupabaseClient,
      userId: 'user-1',
      householdId: null,
      normalizedTexts: ['uber'],
    });

    expect(result).toEqual(new Map());
    expect(warnSpy).toHaveBeenCalledWith(
      'fetchCategoryRules failed',
      expect.any(Error),
    );
  });
});

describe('upsertCategoryRule', () => {
  const supabase = {
    rpc: jest.fn(),
  };

  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('calls upsert_category_rule RPC with normalized values', async () => {
    supabase.rpc.mockResolvedValue({ error: null });

    await upsertCategoryRule({
      supabase: supabase as unknown as SupabaseClient,
      userId: ' user-1 ',
      householdId: null,
      normalizedText: ' peluqueria ',
      category: ' self_care ',
    });

    expect(supabase.rpc).toHaveBeenCalledWith('upsert_category_rule', {
      p_user_id: 'user-1',
      p_household_id: null,
      p_normalized_text: 'peluqueria',
      p_category: 'self_care',
    });
  });

  it('returns early when required inputs are empty', async () => {
    await upsertCategoryRule({
      supabase: supabase as unknown as SupabaseClient,
      userId: '  ',
      householdId: null,
      normalizedText: 'peluqueria',
      category: 'self_care',
    });

    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('warns and stays non-fatal on RPC errors', async () => {
    supabase.rpc.mockResolvedValue({ error: new Error('rpc failed') });

    await expect(
      upsertCategoryRule({
        supabase: supabase as unknown as SupabaseClient,
        userId: 'user-1',
        householdId: 'hh-1',
        normalizedText: 'peluqueria',
        category: 'self_care',
      }),
    ).resolves.toBeUndefined();

    expect(warnSpy).toHaveBeenCalledWith(
      'upsertCategoryRule failed',
      expect.any(Error),
    );
  });
});
