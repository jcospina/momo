import 'server-only';

import { startInviteAcceptFlow as startInviteAcceptFlowAction } from '@actions/invites';
import { fetchInviteInfo as fetchInviteInfoHelper } from '@helpers/invites';
import { createSupabaseServiceRoleClient } from '@lib-supabase/server';

import type { GetInviteInfo, StartAcceptFlow } from './types';

export const getInviteInfo: GetInviteInfo = async token => {
  const serviceClient = createSupabaseServiceRoleClient();
  return fetchInviteInfoHelper(serviceClient, token);
};

export const startAcceptFlow: StartAcceptFlow = async token => {
  'use server';

  return startInviteAcceptFlowAction(token);
};
