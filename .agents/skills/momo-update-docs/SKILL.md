---
name: momo-update-docs
description: Audit and update MoMo architecture docs, ADRs, and technical documentation against the current codebase, SQL migrations, tests, and git history. Use when the user asks to refresh, review, validate, align, or update documentation under docs/, especially architecture.md, database.md, chat-system.md, expense-system.md, stats-system.md, auth-and-households.md, docs/adr/, docs/research/, or docs/plan/.
---

# MoMo Update Docs

Use this skill to make documentation follow the implementation, not the other way around. Current code, SQL migrations, tests, and git history are the source of truth.

## Guardrails

- Do not edit docs during the first pass. First present the audit table and CTA.
- Treat `docs/` as the audit scope unless the user explicitly narrows it. Use root `CONTEXT.md` and `AGENTS.md` as supporting context when present, but do not include them in the docs table unless requested.
- Prefer current files over memory. If docs and code disagree, mark the doc stale and cite the code or migration that proves it.
- Preserve document intent and structure where possible. Update the smallest useful set of sections needed to make the doc true.
- For ADRs, preserve the original decision record. Add superseding context or an update note instead of rewriting historical facts as if they were always true.
- Do not invent versioning conventions. Only bump frontmatter keys that already exist in that document.

## Workflow

### 1. Read Existing Docs

Inventory every Markdown file under `docs/`:

```bash
rg --files docs -g '*.md'
```

Read the docs enough to capture each document's title, purpose, current claims, YAML frontmatter, and likely source-of-truth areas. Prioritize:

- `docs/architecture.md`
- `docs/database.md`
- `docs/chat-system.md`
- `docs/expense-system.md`
- `docs/stats-system.md`
- `docs/auth-and-households.md`
- `docs/adr/*.md`
- relevant `docs/plan/*.md` and `docs/research/*.md`

### 2. Compare Against Source Of Truth

Inspect current implementation evidence before judging docs:

```bash
git status --short
git log --oneline --decorate --max-count=30
git diff --stat
git diff --stat main...HEAD
rg --files src supabase test tests evals
rg --files supabase/migrations
```

Use the commands that apply to the checkout; if `main...HEAD`, `test`, `tests`, or `evals` do not exist, fall back without ceremony.

Compare docs against:

- application and agent code under `src/`
- SQL schema, RLS, RPCs, functions, and seed changes under `supabase/migrations/`
- tests and evals that encode behavior
- recent commits, branch diffs, and uncommitted working-tree changes
- existing architecture rules in `AGENTS.md`

For each doc, decide whether it is:

- `Relevant`: accurate enough to keep as-is, with no material edits needed.
- `needs light edits`: mostly accurate, but wording, links, examples, dates, diagrams, or small implementation details are stale.
- `needs major edits`: core claims, data flow, architecture, schema, behavior, or decision context no longer match the implementation.
- `irrelevant`: obsolete, superseded, or not useful for current MoMo architecture/technical understanding.

### 3. Present The Audit

Before editing, summarize findings in a table with exactly these columns:

| Doc title | Status | Comments |
| --- | --- | --- |

For `Comments`, explain why the status was assigned and what edits are needed. Mention the key evidence paths when useful, for example `src/agent/...` or `supabase/migrations/...`.

After the table, include:

- a short `Evidence checked` list with the most important source paths, migrations, tests, and git ranges inspected
- a `CTA` asking the user to either add more context or confirm that the proposed edits should be made

Use a concrete CTA such as:

```markdown
CTA: Add any missing context now, or say "accept the edits" and I will update the stale docs, bumping existing `version` and `last_updated_at` frontmatter fields where present.
```

### 4. Edit Only After Confirmation

Proceed to edits only when the latest user message clearly confirms the audit, accepts the edits, or explicitly asks to update docs now.

When editing:

- Update each stale document according to the audit.
- Keep source-of-truth claims traceable to current code or migrations.
- Preserve ADR chronology. Add sections such as `Current status`, `Superseded by`, or `Update YYYY-MM-DD` when a decision is stale but historically important.
- Keep terminology aligned across docs.
- Keep Markdown links valid when paths move or new docs are referenced.
- Bump existing YAML frontmatter values:
  - increment `version` when present, preserving the local numeric style if obvious
  - set `last_updated_at` when present to today's ISO date, or preserve timestamp style if the file already uses one
- Do not add frontmatter to files that do not already have it unless the user asks.

### 5. Verify And Report

After edits, run targeted verification:

```bash
rg -n "TODO|TBD|outdated|deprecated|Supabase|migration|version|last_updated_at" docs
git diff -- docs
```

If the repo has Markdown linting or doc validation scripts, run the targeted one when discoverable and low-risk.

Final response:

- list changed docs
- state which docs had frontmatter bumped
- summarize verification run and any skipped checks
- call out any docs intentionally left unchanged
