import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchHouseholdMembers } from './households';

jest.mock('@lib-supabase/server', () => ({
  createSupabaseServerClient: jest.fn(),
}));

function supabaseReturning(data: unknown, error: unknown = null) {
  return {
    rpc: jest.fn().mockResolvedValue({ data, error }),
  } as unknown as SupabaseClient;
}

describe('fetchHouseholdMembers', () => {
  it('passes each member id and fixed colour slot through', async () => {
    const supabase = supabaseReturning([
      {
        role: 'owner',
        display_name: 'Alex',
        email: 'alex@example.com',
        user_id: 'u-1',
        color_slot: 1,
      },
      {
        role: 'member',
        display_name: null,
        email: 'riley@example.com',
        user_id: 'u-2',
        color_slot: 2,
      },
    ]);

    await expect(fetchHouseholdMembers(supabase, 'hh-1')).resolves.toEqual([
      {
        role: 'owner',
        display_name: 'Alex',
        email: 'alex@example.com',
        user_id: 'u-1',
        color_slot: 1,
      },
      {
        role: 'member',
        display_name: null,
        email: 'riley@example.com',
        user_id: 'u-2',
        color_slot: 2,
      },
    ]);
  });

  it('tolerates rows from before the colour slots migration', async () => {
    const supabase = supabaseReturning([
      { role: 'owner', display_name: 'Alex', email: 'alex@example.com' },
    ]);

    const [member] = await fetchHouseholdMembers(supabase, 'hh-1');
    expect(member.user_id).toBeUndefined();
    expect(member.color_slot).toBeNull();
  });

  it('returns an empty list when the lookup fails', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation();
    const supabase = supabaseReturning(null, { message: 'boom' });

    await expect(fetchHouseholdMembers(supabase, 'hh-1')).resolves.toEqual([]);
    consoleError.mockRestore();
  });
});
