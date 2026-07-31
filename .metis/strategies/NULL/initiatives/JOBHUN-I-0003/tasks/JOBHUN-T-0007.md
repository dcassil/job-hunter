---
id: build-search-indeed-adapter-skill
level: task
title: "Build search-indeed adapter skill"
short_code: "JOBHUN-T-0007"
created_at: 2026-07-31T00:28:36.344974+00:00
updated_at: 2026-07-31T00:36:02.771221+00:00
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

# Build search-indeed adapter skill

## Parent Initiative **[CONDITIONAL: Assigned Task]**

[[JOBHUN-I-0003]]

## Objective **[REQUIRED]**

Build `search-indeed`: the Indeed adapter. It drives the user's logged-in Chrome (via
claude-in-chrome) to run an Indeed search built from the query params, reads the result
cards, extracts each listing into the adapter-contract shape, and hands them to
`add-job-to-list`.

## Acceptance Criteria

## Acceptance Criteria

## Acceptance Criteria **[REQUIRED]**

- [ ] `skills/search-indeed/SKILL.md` exists, `name: search-indeed`, description marking
      it a non-interactive adapter invoked by `find-jobs`, not run directly.
- [ ] Implements the INPUT/OUTPUT interface in `references/adapter-contract.md`.
- [ ] Builds an Indeed search URL from the query params (keywords via `q`, location via
      `l`, and a remote filter derived from the remote preference) and opens it in a new
      tab via the claude-in-chrome browser tools.
- [ ] Extracts per result: `title`, `company`, `location`, `remote`, `url` (canonical
      job URL, resolving Indeed's `jk` job key), `posted` when available; unknowns =
      `null`.
- [ ] Stamps `source: "indeed"` and builds `id` = `indeed-<jk>` from the job key (fall
      back to a hash per the data contract if absent).
- [ ] Detects and reports a block / verification wall gracefully per the contract;
      never crashes the run.
- [ ] Respects a result cap; hands listings to `add-job-to-list`; never writes
      `jobs.json` itself.
- [ ] `npm run check` passes.

## Implementation Notes **[CONDITIONAL: Technical Task]**

### Technical Approach

Read `AGENTS.md`, `references/adapter-contract.md`, `references/data-contract.md`,
`skills/add-job-to-list/SKILL.md`, and — if present — `skills/search-generic-site/` for
structural consistency. Instruction file describing the claude-in-chrome tool flow and
defensive extraction. Do not attempt to defeat anti-bot measures — report and fall back.

### Dependencies

Blocked by JOBHUN-T-0003. Parallel-safe with the other adapters.

### Risk Considerations

Risk: Indeed markup changes / CAPTCHA → defensive extraction, graceful degradation.
Risk: triggering dialogs → follow claude-in-chrome dialog guidance.

### Recommended Agent

opus + medium — browser-automation adapter following the established contract.

## Status Updates **[REQUIRED]**

*To be added during implementation*