# MoMo

Personal finance tracker with a chat-like interface. Log expenses by typing messages, track spending with visual analytics, and collaborate with your household in real time.

## Tech Stack

- **Next.js 16** (App Router) + **React 19**
- **Supabase** (Postgres, RLS, Google OAuth, Realtime)
- **ECharts** for data visualizations
- **CSS Modules** for component styling

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm

### Setup

1. Clone the repository
2. Copy `.env.example` to `.env.local` and fill in your Supabase credentials
3. Install dependencies and start the dev server:

```bash
pnpm install
pnpm dev
```

The app runs at [http://localhost:3000](http://localhost:3000).

### Commands

```bash
pnpm dev              # Start local Supabase (if needed) + dev server (.env.local active)
pnpm dev:app          # Dev server only using .env (temporarily ignores .env.local)
pnpm build            # Production build
pnpm lint             # Lint checks
pnpm format           # Formatter (write)
pnpm test             # Jest tests

# Local @momo agent runtime
pnpm agent:dev        # Start the Cloudflare Worker/Durable Object locally
pnpm agent -- "@momo how much did I spend this month?"
pnpm agent:eval       # Placeholder Braintrust eval harness

# Database migrations
pnpm db:new -- <name> # Create migration
pnpm db:start         # Start local Supabase containers
pnpm db:reset         # Replay migrations locally
pnpm db:seed          # Reset local DB + seed users/household/preferences
pnpm db:lint          # Lint local SQL
pnpm db:push          # Apply to linked hosted project (guarded)
```

For local agent smoke tests, keep using the repo's existing `.env` flow. Add
`OPENAI_API_KEY`, optionally `MOMO_AGENT_MODEL`, and set
`MOMO_AGENT_TOOL_MODE=mock` when you want Wrangler to answer from the bundled
golden expense fixture instead of the production tool stubs.

## Project Structure

```
src/
  app/            # Next.js pages and API routes
  components/     # Feature-specific components (chat, charts, stats)
  features/       # Complex feature modules with hooks (chat)
  hooks/          # Generic reusable hooks
  lib/
    actions/      # Server actions (all mutations)
    helpers/      # Pure utility functions
    constants/    # App constants (category dictionaries)
    types/        # Shared TypeScript types
    supabase/     # Supabase client setup
  providers/      # React context providers
  ui/             # Reusable UI primitives
```

See [docs/architecture.md](docs/architecture.md) for detailed architecture documentation.

## Documentation

Full documentation lives in the [`docs/`](docs/) directory:

- [Architecture](docs/architecture.md) — module inventory, data flow, conventions
- [Database](docs/database.md) — schema design rationale, RLS strategy, triggers
- [Auth and Households](docs/auth-and-households.md) — auth flow, onboarding, invite system
- [Expense System](docs/expense-system.md) — parsing pipeline, category scoring, currency handling
- [Chat System](docs/chat-system.md) — realtime, sync fallback, deduplication
- [Stats System](docs/stats-system.md) — views, charts, time filtering
- [Roadmap](docs/roadmap.md) — planned features
- [Architecture Decision Records](docs/adr/) — key design decisions and trade-offs
