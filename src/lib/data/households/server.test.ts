import type { SupabaseClient } from '@supabase/supabase-js';

import {
  createHousehold as createHouseholdAction,
  createHouseholdInline as createHouseholdInlineAction,
} from '@actions/households';
import {
  fetchHouseholdForUser as fetchHouseholdForUserHelper,
  fetchHouseholdMembers as fetchHouseholdMembersHelper,
  fetchHouseholdMembership as fetchHouseholdMembershipHelper,
  getHouseholdForUser as getHouseholdForUserHelper,
  getHouseholdMembershipForUser as getHouseholdMembershipForUserHelper,
} from '@helpers/households';
import { createSupabaseServerClient } from '@lib-supabase/server';

import {
  create,
  createInline,
  getHouseholdForUser,
  getMembers,
  getMembership,
} from './server';

jest.mock('@actions/households', () => ({
  createHousehold: jest.fn(),
  createHouseholdInline: jest.fn(),
}));

jest.mock('@helpers/households', () => ({
  fetchHouseholdForUser: jest.fn(),
  fetchHouseholdMembers: jest.fn(),
  fetchHouseholdMembership: jest.fn(),
  getHouseholdForUser: jest.fn(),
  getHouseholdMembershipForUser: jest.fn(),
}));

jest.mock('@lib-supabase/server', () => ({
  createSupabaseServerClient: jest.fn(),
}));

describe('data/households/server facade', () => {
  const createHouseholdMock = jest.mocked(createHouseholdAction);
  const createHouseholdInlineMock = jest.mocked(createHouseholdInlineAction);
  const fetchHouseholdForUserMock = jest.mocked(fetchHouseholdForUserHelper);
  const fetchHouseholdMembersMock = jest.mocked(fetchHouseholdMembersHelper);
  const fetchHouseholdMembershipMock = jest.mocked(
    fetchHouseholdMembershipHelper,
  );
  const getHouseholdForUserMock = jest.mocked(getHouseholdForUserHelper);
  const getHouseholdMembershipForUserMock = jest.mocked(
    getHouseholdMembershipForUserHelper,
  );
  const createSupabaseServerClientMock = jest.mocked(
    createSupabaseServerClient,
  );

  const supabase = {} as SupabaseClient;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('delegates membership reads with provided supabase client', async () => {
    const membership = { household_id: 'household-1' };
    fetchHouseholdMembershipMock.mockResolvedValue(
      membership as Awaited<ReturnType<typeof fetchHouseholdMembershipHelper>>,
    );

    const result = await getMembership('user-1', { supabase });

    expect(fetchHouseholdMembershipMock).toHaveBeenCalledWith(
      supabase,
      'user-1',
    );
    expect(getHouseholdMembershipForUserMock).not.toHaveBeenCalled();
    expect(result).toEqual(membership);
  });

  it('delegates membership reads without supabase client to helper', async () => {
    const membership = { household_id: 'household-2' };
    getHouseholdMembershipForUserMock.mockResolvedValue(
      membership as Awaited<
        ReturnType<typeof getHouseholdMembershipForUserHelper>
      >,
    );

    const result = await getMembership('user-2');

    expect(getHouseholdMembershipForUserMock).toHaveBeenCalledWith('user-2');
    expect(fetchHouseholdMembershipMock).not.toHaveBeenCalled();
    expect(result).toEqual(membership);
  });

  it('delegates household reads with provided supabase client', async () => {
    const household = { id: 'household-1' };
    fetchHouseholdForUserMock.mockResolvedValue(
      household as Awaited<ReturnType<typeof fetchHouseholdForUserHelper>>,
    );

    const result = await getHouseholdForUser('user-1', { supabase });

    expect(fetchHouseholdForUserMock).toHaveBeenCalledWith(supabase, 'user-1');
    expect(getHouseholdForUserMock).not.toHaveBeenCalled();
    expect(result).toEqual(household);
  });

  it('delegates household reads without supabase client to helper', async () => {
    const household = { id: 'household-2' };
    getHouseholdForUserMock.mockResolvedValue(
      household as Awaited<ReturnType<typeof getHouseholdForUserHelper>>,
    );

    const result = await getHouseholdForUser('user-2');

    expect(getHouseholdForUserMock).toHaveBeenCalledWith('user-2');
    expect(fetchHouseholdForUserMock).not.toHaveBeenCalled();
    expect(result).toEqual(household);
  });

  it('delegates members reads with provided supabase client', async () => {
    const members = [{ role: 'owner' }];
    fetchHouseholdMembersMock.mockResolvedValue(
      members as Awaited<ReturnType<typeof fetchHouseholdMembersHelper>>,
    );

    const result = await getMembers('household-1', { supabase });

    expect(fetchHouseholdMembersMock).toHaveBeenCalledWith(
      supabase,
      'household-1',
    );
    expect(createSupabaseServerClientMock).not.toHaveBeenCalled();
    expect(result).toEqual(members);
  });

  it('creates a server client for members reads when none is provided', async () => {
    const members = [{ role: 'member' }];
    createSupabaseServerClientMock.mockResolvedValue(supabase);
    fetchHouseholdMembersMock.mockResolvedValue(
      members as Awaited<ReturnType<typeof fetchHouseholdMembersHelper>>,
    );

    const result = await getMembers('household-2');

    expect(createSupabaseServerClientMock).toHaveBeenCalledTimes(1);
    expect(fetchHouseholdMembersMock).toHaveBeenCalledWith(
      supabase,
      'household-2',
    );
    expect(result).toEqual(members);
  });

  it('delegates create action', async () => {
    const formData = new FormData();
    const prevState = {};
    createHouseholdMock.mockResolvedValue({});

    await create(prevState, formData);

    expect(createHouseholdMock).toHaveBeenCalledWith(prevState, formData);
  });

  it('delegates inline create action', async () => {
    const formData = new FormData();
    const prevState = {};
    createHouseholdInlineMock.mockResolvedValue({});

    await createInline(prevState, formData);

    expect(createHouseholdInlineMock).toHaveBeenCalledWith(prevState, formData);
  });
});
