'use client';

import { useActionState } from 'react';

import { createHousehold } from '@actions/households';

import type { CreateHouseholdState } from '@lib-types/households';

export function HouseholdForm() {
  const initialState: CreateHouseholdState = {};
  const [state, formAction, isPending] = useActionState(
    createHousehold,
    initialState,
  );

  return (
    <form action={formAction} className="flex w-full flex-col gap-4">
      <label className="flex flex-col gap-2 text-foreground">
        <span className="text-sm font-medium uppercase tracking-wide">
          Household name
        </span>
        <input
          type="text"
          name="name"
          placeholder="e.g. Bogotá apartment"
          required
          disabled={isPending}
          className="rounded-md border border-rust px-3 py-2 text-lg text-foreground focus:outline-none focus:ring-2 focus:ring-gamboge disabled:opacity-70"
        />
      </label>
      {state.error ? (
        <p className="text-sm text-rufous">{state.error}</p>
      ) : null}
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-gamboge px-4 py-2 text-lg font-semibold text-background transition hover:bg-gamboge/90 disabled:opacity-70"
      >
        {isPending ? 'Creating household...' : 'Create household'}
      </button>
    </form>
  );
}
