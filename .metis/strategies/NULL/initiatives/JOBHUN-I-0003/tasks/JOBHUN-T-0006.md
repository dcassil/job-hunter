---
id: build-search-linkedin-adapter-skill
level: task
title: "Build search-linkedin adapter skill"
short_code: "JOBHUN-T-0006"
created_at: 2026-07-31T00:28:29.873344+00:00
updated_at: 2026-07-31T00:35:51.467660+00:00
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

# Build search-linkedin adapter skill

## Parent Initiative **[CONDITIONAL: Assigned Task]**

[[JOBHUN-I-0003]]

## Objective **[REQUIRED]**

Build `search-linkedin`: the LinkedIn Jobs adapter. It drives the user's logged-in
Chrome (via claude-in-chrome) to run a LinkedIn Jobs search built from the query
params, reads the result cards, extracts each listing into the adapter-contract shape,
and hands them to `add-job-to-list`.

## Acceptance Criteria

## Acceptance Criteria

## Acceptance Criteria **[REQUIRED]**

- [ ] `skills/search-linkedin/SKILL.md` exists, `name: search-linkedin`, description
      marking it a non-interactive adapter invoked by `find-jobs`, not run directly.
- [ ] Implements the INPUT/OUTPUT interface in `references/adapter-contract.md`.
- [ ] Builds a LinkedIn Jobs search URL from the query params (keywords, location, and
      a remote filter derived from the remote preference) and opens it in a new tab via
      the claude-in-chrome browser tools.
- [ ] Extracts per result: `title`, `company`, `location`, `remote` (map LinkedIn's
      Remote/Hybrid/On-site to `remote`/`hybrid`/`onsite`, else `null`), `url`
      (canonical job URL), `posted` when available; unknowns = `null`.
- [ ] Stamps `source: "linkedin"` and builds `id` = `linkedin-<native-job-id>` parsed
      from the job URL (fall back to a hash per the data contract if absent).
- [ ] Detects and reports an auth wall / anti-bot block gracefully per the contract
      (so `find-jobs` can offer the generic fallback); never crashes the run.
- [ ] Respects a result cap; hands listings to `add-job-to-list`; never writes
      `jobs.json` itself.
- [ ] `npm run check` passes.

## Implementation Notes **[CONDITIONAL: Technical Task]**

### Technical Approach

Read `AGENTS.md`, `references/adapter-contract.md`, `references/data-contract.md`,
`skills/add-job-to-list/SKILL.md`, and — if present — `skills/search-generic-site/`
for structural consistency. Instruction file: describe the exact claude-in-chrome tool
flow (tabs_context → create/navigate tab → read_page/get_page_text → extract). Assume
the user is logged in; if not logged in / blocked, degrade per the contract. Do not
attempt to defeat anti-bot measures — report and fall back.

### Dependencies

Blocked by JOBHUN-T-0003. Parallel-safe with the other adapters.

### Risk Considerations

Risk: LinkedIn markup changes / blocks → defensive extraction, graceful degradation.
Risk: triggering dialogs → follow claude-in-chrome dialog guidance.

### Recommended Agent

opus + medium — browser-automation adapter following the established contract.

## Status Updates **[REQUIRED]**

*To be added during implementation*