import type { InviteInfo } from '@lib-types/invites';

export type GetInviteInfo = (token: string) => Promise<InviteInfo | null>;
export type StartAcceptFlow = (token: string) => Promise<void>;
