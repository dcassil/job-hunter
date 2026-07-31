---
id: build-search-generic-site-adapter
level: task
title: "Build search-generic-site adapter skill"
short_code: "JOBHUN-T-0005"
created_at: 2026-07-31T00:28:24.130613+00:00
updated_at: 2026-07-31T00:35:39.259326+00:00
parent: JOBHUN-I-0003
blocked_by: [JOBHUN-T-0003]
archived: false

tags:
  - "#task"
  - "#phase/completed"


exit_criteria_met: false
strategy_id: NULL
initiative_id: JOBHUN-I-0003
---

# Build search-generic-site adapter skill

## Parent Initiative **[CONDITIONAL: Assigned Task]**

[[JOBHUN-I-0003]]

## Objective **[REQUIRED]**

Build `search-generic-site`: the safe-baseline adapter. It handles any board that
lacks a dedicated adapter, and is the fallback when a dedicated adapter is blocked. It
accepts either a job-board URL to open in the browser or listing text/URLs the user
pastes, extracts what it can into the adapter-contract listing shape, and hands the
listings to `add-job-to-list`.

## Acceptance Criteria

## Acceptance Criteria

## Acceptance Criteria **[REQUIRED]**

- [ ] `skills/search-generic-site/SKILL.md` exists, `name: search-generic-site`, with a
      description marking it a non-interactive worker/adapter invoked by `find-jobs`
      (or as a fallback), not run directly.
- [ ] Fully implements the INPUT/OUTPUT interface in
      `references/adapter-contract.md`: consumes the query params, produces listing
      objects mapped to the jobs-schema fields with unknowns = `null`.
- [ ] Two input modes: (a) a board URL — open it via the claude-in-chrome browser
      tools, run/read the search results; (b) user-pasted listing text or URLs — parse
      what is present.
- [ ] Stamps `source: "generic"` and builds a stable `id` per the data contract
      (`generic-<hash>` from the dedupe identity when no native id exists).
- [ ] Leaves missing fields `null` — never fabricates data.
- [ ] Reports gracefully when it finds nothing or is blocked, per the contract.
- [ ] Hands listings to `add-job-to-list`; never writes `jobs.json` itself.
- [ ] `npm run check` passes.

## Implementation Notes **[CONDITIONAL: Technical Task]**

### Technical Approach

Read `AGENTS.md`, `references/adapter-contract.md`, `references/data-contract.md`,
`skills/add-job-to-list/SKILL.md`. Instruction file. Reference the claude-in-chrome
browser tools (navigate, read_page/get_page_text) for the URL mode; describe robust,
defensive extraction. Keep it site-agnostic.

### Dependencies

Blocked by JOBHUN-T-0003. Independent of the other adapters (safe to build in parallel).

### Risk Considerations

Risk: brittle parsing → defensive extraction, nulls for unknowns. Risk: dialogs from
pages → follow the claude-in-chrome guidance to avoid triggering modal dialogs.

### Recommended Agent

opus + medium — the reference adapter implementation; others mirror its structure.

## Status Updates **[REQUIRED]**

*To be added during implementation*