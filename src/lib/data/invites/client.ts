import { startInviteAcceptFlow as startInviteAcceptFlowAction } from '@actions/invites';

import type { StartAcceptFlow } from './types';

export const startAcceptFlow: StartAcceptFlow = async token =>
  startInviteAcceptFlowAction(token);
