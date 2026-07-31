---
id: make-find-jobs-registry-driven
level: task
title: "Make find-jobs registry-driven with design-gating"
short_code: "JOBHUN-T-0016"
created_at: 2026-07-31T02:35:59.439395+00:00
updated_at: 2026-07-31T02:35:59.439395+00:00
parent: JOBHUN-I-0006
blocked_by: [JOBHUN-T-0015]
archived: false

tags:
  - "#task"
  - "#phase/todo"


exit_criteria_met: false
strategy_id: NULL
initiative_id: JOBHUN-I-0006
---

# Make find-jobs registry-driven with design-gating

## Parent Initiative **[CONDITIONAL: Assigned Task]**

[[JOBHUN-I-0006]]

## Objective **[REQUIRED]**

Update `skills/find-jobs/SKILL.md` so its site selection and dispatch are driven by the
board registry (`references/job-boards.md`), including resume-aware design-gating and
adapter-else-generic routing.

## Acceptance Criteria **[REQUIRED]**

- [ ] `find-jobs` reads `references/job-boards.md` to build the list of boards it offers.
- [ ] Suggestion rules: offer **general** boards by default; offer **remote** boards
      (we-work-remotely, remoteok) only when `config.remote_pref` is `remote` or `both`;
      offer **design** boards ONLY when the resume/`job-focus.md` indicates design/creative
      relevance (e.g. Art Director, designer, creative). If unsure, ask the user rather
      than showing design boards unprompted.
- [ ] Dispatch routing: for each selected board, use a dedicated `search-<board>` adapter
      if one exists (currently linkedin/indeed/glassdoor); otherwise invoke
      `search-generic-site` seeded with that board's search-URL template (and login/access
      notes) from the registry. Stamp the correct `source` id for each board.
- [ ] Access quirks from the registry (invite/curated, third-party login, aggregator) are
      surfaced to the user; a board that cannot be reached is reported/skipped, never
      dropped silently. Aggregators (google-jobs) rely on the sink's dedupe.
- [ ] Still funnels every listing through `add-job-to-list`; still prints a per-board +
      total summary. `npm run check` passes.

## Implementation Notes **[CONDITIONAL: Technical Task]**

Read `AGENTS.md`, `references/job-boards.md`, `references/adapter-contract.md`,
`references/data-contract.md`, and the current `skills/find-jobs/SKILL.md` and
`skills/search-generic-site/SKILL.md`. Keep the orchestrator thin — the registry holds
the per-board data; do not hardcode board specifics in the skill beyond what routing
requires. Only edit `skills/find-jobs/SKILL.md`.

### Recommended Agent

opus + medium — integration edit to an existing orchestrator following the new registry.

## Status Updates **[REQUIRED]**

*To be added during implementation*
