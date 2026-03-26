import { fetchHouseholdMembership } from '@helpers/households';
import { createSupabaseServerClient } from '@lib-supabase/server';
import { getScopedContext } from './scope';

jest.mock('@lib-supabase/server', () => ({
  createSupabaseServerClient: jest.fn(),
}));

jest.mock('@helpers/households', () => ({
  fetchHouseholdMembership: jest.fn(),
}));

const createSupabaseServerClientMock = jest.mocked(createSupabaseServerClient);
const fetchHouseholdMembershipMock = jest.mocked(fetchHouseholdMembership);

function setUser(id: string | null) {
  createSupabaseServerClientMock.mockResolvedValue({
    auth: {
      getUser: () =>
        Promise.resolve({
          data: {
            user: id ? { id } : null,
          },
        }),
    },
  } as never);
}

describe('expenses-stats scope context', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns auth_required when no authenticated user exists', async () => {
    setUser(null);

    const result = await getScopedContext({ scope: 'auto' });

    expect(result).toEqual({ context: null, errorCode: 'auth_required' });
  });

  it('returns no_household for explicit household scope without membership', async () => {
    setUser('user-1');
    fetchHouseholdMembershipMock.mockResolvedValue(null);

    const result = await getScopedContext({ scope: 'household' });

    expect(result).toEqual({ context: null, errorCode: 'no_household' });
  });

  it('returns null household for auto scope when membership is missing', async () => {
    setUser('user-1');
    fetchHouseholdMembershipMock.mockResolvedValue(null);

    const result = await getScopedContext({ scope: 'auto' });

    expect(result.context?.householdId).toBeNull();
    expect(result.errorCode).toBeUndefined();
  });

  it('forces personal scope to null household without membership lookup', async () => {
    setUser('user-1');

    const result = await getScopedContext({
      scope: 'personal',
      householdId: 'household-1',
    });

    expect(fetchHouseholdMembershipMock).not.toHaveBeenCalled();
    expect(result.context?.householdId).toBeNull();
    expect(result.errorCode).toBeUndefined();
  });
});
