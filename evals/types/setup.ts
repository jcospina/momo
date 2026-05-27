import type { SupportedCurrency } from '@lib-types/user-preferences';
import type { AgentAuthContext } from '@/agent/context';

// ── Fixture seeding ──────────────────────────────────────────────────────────

/**
 * Declarative table entry for one currency's (owner, member, household) triple.
 *
 * The setup module iterates over these to create users, build profiles, link
 * memberships, and load the matching fixture JSON.
 */
export type EvalFixtureTriple = {
  currency: SupportedCurrency;
  ownerEmail: string;
  ownerDisplayName: string;
  memberEmail: string;
  memberDisplayName: string;
  householdName: string;
  fixturePath: string;
};

/** Seeded UUIDs returned by the user/household seeder for one currency. */
export type EvalSeedIdentity = {
  ownerId: string;
  memberId: string;
  householdId: string;
};

/** Lookup table from currency → seeded UUIDs for that fixture. */
export type EvalSeedIdentities = Map<SupportedCurrency, EvalSeedIdentity>;

/**
 * One row of a golden fixture JSON before placeholder substitution.
 *
 * Fixtures store placeholder strings (`sample-owner`, `sample-household`); the
 * seeder swaps these for real UUIDs at insert time.
 */
export type GoldenRow = {
  user_id: string;
  household_id: string | null;
  amount_cents: number;
  currency: string;
  expense_date: string;
  merchant: string | null;
  category: string | null;
  note: string | null;
};

/** Top-level shape of an `expenses.{cur}.golden.json` fixture file. */
export type GoldenFixture = {
  metadata: { currency: SupportedCurrency; endDate: string };
  rows: GoldenRow[];
};

/** Per-currency outcome of the fixture insert pass. */
export type FixtureSeedPerCurrency = {
  rowCount: number;
  referenceDate: string;
};

/** Aggregate outcome of seeding all currency fixtures. */
export type SeedFixturesSummary = {
  totalRows: number;
  perCurrency: Record<SupportedCurrency, FixtureSeedPerCurrency>;
};

// ── Runtime contexts (returned by run-setup) ─────────────────────────────────

/** Auth contexts indexed by the currency they were minted for. */
export type AuthContextsByCurrency = Map<SupportedCurrency, AgentAuthContext>;

/**
 * Everything an eval case needs at run time for its currency:
 *  - `auth`: the JWT-bearing context the agent's tools authenticate with.
 *  - `referenceDate`: the fixture's anchor date, injected into
 *    `resolveDateRange` so relative presets stay anchored to the dataset
 *    instead of drifting with the wall clock.
 */
export type EvalRuntimeContext = {
  auth: AgentAuthContext;
  referenceDate: string;
};

/** Lookup table from currency → its full runtime context. */
export type EvalRuntimeByCurrency = Map<SupportedCurrency, EvalRuntimeContext>;
