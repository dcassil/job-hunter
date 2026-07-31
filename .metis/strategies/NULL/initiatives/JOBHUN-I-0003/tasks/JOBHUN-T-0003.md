---
id: build-add-job-to-list-worker-and
level: task
title: "Build add-job-to-list worker and adapter contract"
short_code: "JOBHUN-T-0003"
created_at: 2026-07-31T00:26:58.438912+00:00
updated_at: 2026-07-31T00:26:58.438912+00:00
parent: JOBHUN-I-0003
blocked_by: []
archived: false

tags:
  - "#task"
  - "#phase/todo"


exit_criteria_met: false
strategy_id: NULL
initiative_id: JOBHUN-I-0003
---

# Build add-job-to-list worker and adapter contract

## Parent Initiative **[CONDITIONAL: Assigned Task]**

[[JOBHUN-I-0003]]

## Objective **[REQUIRED]**

Build the foundation of the search subsystem: (1) the `add-job-to-list` worker skill —
the single sink that normalizes a listing to the job schema, dedupes it, appends to
`jobs/jobs.json`, and regenerates the `jobs/jobs.md` mirror; and (2)
`references/adapter-contract.md` — the shared interface every search adapter
(`search-linkedin`, `search-indeed`, `search-glassdoor`, `search-generic-site`) and
the `find-jobs` orchestrator must obey. This is load-bearing: all five downstream
search skills are written against this contract.

## Acceptance Criteria **[REQUIRED]**

- [ ] `references/adapter-contract.md` defines the adapter interface: the INPUT an
      adapter receives (search query params derived from `job-focus.md` +
      `config.remote_pref`: keywords, location, remote preference, result cap) and the
      OUTPUT it must produce (a list of listing objects mapped to the job schema
      fields, with unknown fields set to `null`, `status` left for the sink to set).
- [ ] The contract specifies the `source` value each adapter stamps, how each adapter
      builds a stable job `id` (`<source>-<native-id-or-hash>` per the data contract),
      and that adapters MUST NOT write to `jobs.json` themselves — they hand listings
      to `add-job-to-list`.
- [ ] The contract documents graceful degradation: how an adapter reports a block /
      anti-bot wall / no results without crashing the run.
- [ ] `skills/add-job-to-list/SKILL.md` exists with valid frontmatter (`name:
      add-job-to-list`) describing it as a non-interactive worker invoked by search
      adapters, not run directly by the user.
- [ ] `add-job-to-list` procedure: locate the working folder via `config.json`;
      normalize the incoming listing to the jobs schema; compute dedupe identity
      (canonical URL, else normalized title+company+location per the data contract);
      if a match exists, DO NOT overwrite its `status` or application fields (optionally
      fill missing metadata); if new, append with `status: "new"` and `found_at` set to
      today; then regenerate `jobs/jobs.md` from `jobs/jobs.json`.
- [ ] Output shape of `jobs.json` and the `jobs.md` mirror conform to the data contract
      and the jobs schema exactly (array; per-job fields/enums; md is a status-grouped
      or sorted table showing at least title, company, status, and a url link).
- [ ] The worker returns a small result to its caller: counts/flags for
      added-vs-duplicate so `find-jobs` can total them.
- [ ] `npm run check` passes.

## Implementation Notes **[CONDITIONAL: Technical Task]**

### Technical Approach

Read `AGENTS.md`, `references/data-contract.md`, and `schemas/jobs.schema.json` first.
Skills are Markdown instruction files. Write `add-job-to-list` as a precise procedure
the executing agent follows (file read/modify/write of `jobs.json`, JSON array append,
md regeneration). Keep the adapter contract concrete enough that four different agents
writing four adapters independently will produce compatible outputs.

### Dependencies

Data contract + jobs schema (on `main`). Blocks the adapter/orchestrator tasks
(JOBHUN-T-0004..T-0008), which are written against `references/adapter-contract.md`.

### Risk Considerations

Risk: adapters diverge if the contract is vague → make INPUT/OUTPUT field lists
explicit and give a concrete listing-object example. Risk: dedupe overwrites user
progress → the worker must never change an existing job's `status`/application fields.

### Recommended Agent

opus + high — foundational; defines the interface four parallel agents build against.

## Status Updates **[REQUIRED]**

*To be added during implementation*
