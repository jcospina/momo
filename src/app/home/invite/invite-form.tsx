'use client';

import { useActionState } from 'react';

import { sendInvites } from '@actions/invites';
import type { SendInvitesState } from '@lib-types/invites';

const initialState: SendInvitesState = {};

const rows = [1, 2, 3, 4];

export function InviteForm() {
  const [state, formAction, pending] = useActionState(
    sendInvites,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        {rows.map(row => (
          <div
            key={row}
            className="grid grid-cols-1 gap-3 rounded-md border border-rust p-4 md:grid-cols-2"
          >
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-foreground">
                Invitee name
              </label>
              <input
                name={`inviteName${row}`}
                type="text"
                placeholder="Alex Doe"
                className="rounded-md border border-rust px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-gamboge"
                disabled={pending}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-foreground">
                Invitee email
              </label>
              <input
                name={`inviteEmail${row}`}
                type="email"
                placeholder="alex@example.com"
                className="rounded-md border border-rust px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-gamboge"
                disabled={pending}
              />
            </div>
          </div>
        ))}
      </div>
      {state.error ? (
        <p className="text-sm text-rufous">{state.error}</p>
      ) : null}
      {state.success ? (
        <p className="text-sm text-green-700">{state.success}</p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-gamboge px-4 py-2 text-lg font-semibold text-background transition hover:bg-gamboge/90 disabled:opacity-70"
      >
        {pending ? 'Sending...' : 'Send invites'}
      </button>
    </form>
  );
}
