import { startInviteAcceptFlow as startInviteAcceptFlowAction } from '@actions/invites';

import { startAcceptFlow } from './client';

jest.mock('@actions/invites', () => ({
  startInviteAcceptFlow: jest.fn(),
}));

describe('data/invites/client facade', () => {
  const startInviteAcceptFlowMock = jest.mocked(startInviteAcceptFlowAction);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('delegates invite accept flow updates', async () => {
    startInviteAcceptFlowMock.mockResolvedValue(undefined);

    await startAcceptFlow('token-1');

    expect(startInviteAcceptFlowMock).toHaveBeenCalledWith('token-1');
  });
});
