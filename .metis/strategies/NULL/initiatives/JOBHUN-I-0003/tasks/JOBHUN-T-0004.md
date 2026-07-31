---
id: build-find-jobs-orchestrator-skill
level: task
title: "Build find-jobs orchestrator skill"
short_code: "JOBHUN-T-0004"
created_at: 2026-07-31T00:28:18.372275+00:00
updated_at: 2026-07-31T00:35:27.739156+00:00
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

# Build find-jobs orchestrator skill

## Parent Initiative **[CONDITIONAL: Assigned Task]**

[[JOBHUN-I-0003]]

## Objective **[REQUIRED]**

Build `find-jobs`: the interactive orchestrator that runs one search "run". It gates on
completed setup, asks the per-run automated-vs-human choice, derives the search query
from `job-focus.md` + `config`, selects which sites to search, dispatches the
per-site adapter skills, funnels every listing through `add-job-to-list`, and reports a
summary (found / new / duplicates / blocked).

## Acceptance Criteria

## Acceptance Criteria

## Acceptance Criteria **[REQUIRED]**

- [ ] `skills/find-jobs/SKILL.md` exists, `name: find-jobs`, description triggering on
      "find jobs" / "search for jobs".
- [ ] Gate: requires a valid working folder (`config.json`); if absent, instruct the
      user to run `job-hunter-setup` and stop.
- [ ] Asks automated-vs-human for the run, defaulting to `config.automation_default`
      (`ask` = prompt; `auto`/`human` = use without prompting unless the user overrides).
- [ ] Derives query params (keywords, location, remote preference, result cap) from
      `job-focus.md` and `config.remote_pref`, per `references/adapter-contract.md`.
- [ ] Asks which sites to search, defaulting to `config.sites`; dispatches the matching
      adapter skill per site (`search-linkedin`, `search-indeed`, `search-glassdoor`,
      `search-generic-site`).
- [ ] Passes each returned listing to the `add-job-to-list` worker; never writes
      `jobs.json` directly.
- [ ] Handles a blocked/failed adapter gracefully: reports it, offers the
      `search-generic-site` fallback or manual paste, and continues with other sites —
      a single adapter failure must not abort the run.
- [ ] Reports a final summary with per-site and total counts (found, new, duplicate,
      blocked).
- [ ] `npm run check` passes.

## Implementation Notes **[CONDITIONAL: Technical Task]**

### Technical Approach

Read `AGENTS.md`, `references/adapter-contract.md`, `references/data-contract.md`, and
the `add-job-to-list` and `job-hunter-setup` SKILL.md files for conventions. This is an
instruction file: describe the orchestration flow, the gate, the automation prompt, the
adapter dispatch loop, degradation handling, and the summary. Keep site-specific
scraping OUT — that lives in the adapters.

### Dependencies

Blocked by JOBHUN-T-0003 (adapter contract + add-job-to-list). References the four
adapter skills by name (they may be built in parallel).

### Risk Considerations

Risk: orchestrator embeds site logic → keep it thin, delegate to adapters. Risk: one
site's failure aborts everything → wrap each adapter dispatch defensively.

### Recommended Agent

opus + medium — integration across the subsystem, but the pattern is defined by the
adapter contract.

## Status Updates **[REQUIRED]**

*To be added during implementation*