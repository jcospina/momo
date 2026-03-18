import { startInviteAcceptFlow as startInviteAcceptFlowAction } from '@actions/invites';
import { fetchInviteInfo as fetchInviteInfoHelper } from '@helpers/invites';
import { createSupabaseServiceRoleClient } from '@lib-supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

import { getInviteInfo, startAcceptFlow } from './server';

jest.mock('@actions/invites', () => ({
  startInviteAcceptFlow: jest.fn(),
}));

jest.mock('@helpers/invites', () => ({
  fetchInviteInfo: jest.fn(),
}));

jest.mock('@lib-supabase/server', () => ({
  createSupabaseServiceRoleClient: jest.fn(),
}));

describe('data/invites/server facade', () => {
  const startInviteAcceptFlowMock = jest.mocked(startInviteAcceptFlowAction);
  const fetchInviteInfoMock = jest.mocked(fetchInviteInfoHelper);
  const createSupabaseServiceRoleClientMock = jest.mocked(
    createSupabaseServiceRoleClient,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('delegates invite info reads using the service-role client', async () => {
    const supabase = {} as SupabaseClient;
    const inviteInfo = { status: 'household_valid' };
    createSupabaseServiceRoleClientMock.mockReturnValue(supabase);
    fetchInviteInfoMock.mockResolvedValue(
      inviteInfo as Awaited<ReturnType<typeof fetchInviteInfoHelper>>,
    );

    const result = await getInviteInfo('token-1');

    expect(createSupabaseServiceRoleClientMock).toHaveBeenCalledTimes(1);
    expect(fetchInviteInfoMock).toHaveBeenCalledWith(supabase, 'token-1');
    expect(result).toEqual(inviteInfo);
  });

  it('delegates invite accept flow to server action', async () => {
    startInviteAcceptFlowMock.mockResolvedValue(undefined);

    await startAcceptFlow('token-2');

    expect(startInviteAcceptFlowMock).toHaveBeenCalledWith('token-2');
  });
});
