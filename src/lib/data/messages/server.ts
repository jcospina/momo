import 'server-only';

import {
  deleteChatMessage as deleteChatMessageAction,
  sendChatMessage as sendChatMessageAction,
} from '@actions/chat-messages';
import {
  fetchChatHistory as fetchChatHistoryHelper,
  fetchChatMessages as fetchChatMessagesHelper,
  fetchChatMessagesSince as fetchChatMessagesSinceHelper,
} from '@helpers/chat/chat-messages';
import { persistMomoReply } from '@helpers/chat/momo-replies';
import {
  createSupabaseServerClient,
  createSupabaseServiceRoleClient,
} from '@lib-supabase/server';

import type {
  GetHistory,
  GetList,
  GetSince,
  Remove,
  Send,
  SendMomo,
} from './types';

const DEFAULT_HISTORY_LIMIT = 30;
const DEFAULT_SYNC_LIMIT = 100;

export const getList: GetList = async ({
  householdId = null,
  userId,
  limit = DEFAULT_HISTORY_LIMIT,
  options,
}) => {
  if (!userId) {
    return [];
  }

  const supabase = options?.supabase ?? (await createSupabaseServerClient());

  return fetchChatMessagesHelper({
    supabase,
    householdId,
    userId,
    limit,
  });
};

export const getHistory: GetHistory = async ({
  householdId = null,
  userId,
  cursor = null,
  limit = DEFAULT_HISTORY_LIMIT,
  options,
}) => {
  if (!userId) {
    return [];
  }

  const supabase = options?.supabase ?? (await createSupabaseServerClient());

  return fetchChatHistoryHelper({
    supabase,
    householdId,
    userId,
    limit,
    before: cursor?.created_at && cursor?.id ? cursor : null,
  });
};

export const getSince: GetSince = async ({
  householdId = null,
  userId,
  cursor = null,
  limit = DEFAULT_SYNC_LIMIT,
  options,
}) => {
  if (!userId) {
    return [];
  }

  const supabase = options?.supabase ?? (await createSupabaseServerClient());

  return fetchChatMessagesSinceHelper({
    supabase,
    householdId,
    userId,
    limit,
    cursor: cursor?.created_at && cursor?.id ? cursor : null,
  });
};

export const send: Send = async input => {
  'use server';

  return sendChatMessageAction(input);
};

// Not a server action on purpose: it writes with the service role, so only
// server code (the MoMo stream route) may call it, with agent-generated content.
export const sendMomo: SendMomo = async input => {
  const sessionClient = await createSupabaseServerClient();
  const serviceClient = createSupabaseServiceRoleClient();

  return persistMomoReply({ ...input, sessionClient, serviceClient });
};

export const remove: Remove = async input => {
  'use server';

  return deleteChatMessageAction(input);
};
