---
id: extend-contract-enums-and-author
level: task
title: "Extend contract enums and author the board registry"
short_code: "JOBHUN-T-0015"
created_at: 2026-07-31T02:35:52.667830+00:00
updated_at: 2026-07-31T02:35:52.667830+00:00
parent: JOBHUN-I-0006
blocked_by: []
archived: false

tags:
  - "#task"
  - "#phase/todo"


exit_criteria_met: false
strategy_id: NULL
initiative_id: JOBHUN-I-0006
---

# Extend contract enums and author the board registry

## Parent Initiative **[CONDITIONAL: Assigned Task]**

[[JOBHUN-I-0006]]

## Objective **[REQUIRED]**

Foundation for expanded coverage: extend the `source`/`sites` enums with all new board
ids, update the contract docs, and author `references/job-boards.md` — the registry that
every downstream skill reads. Owned by the orchestrator (touches guarded schema files).

## Acceptance Criteria **[REQUIRED]**

- [ ] `schemas/jobs.schema.json` `source` enum and `schemas/config.schema.json` `sites`
      enum include all board ids: existing `linkedin`, `indeed`, `glassdoor`, `generic`
      plus `ziprecruiter`, `google-jobs`, `monster`, `careerbuilder`, `wellfound`,
      `dribbble`, `behance`, `aiga`, `coroflot`, `working-not-working`, `authentic-jobs`,
      `we-work-remotely`, `remoteok`.
- [ ] `references/data-contract.md` and `references/adapter-contract.md` source lists
      updated to match, and both document the "dedicated-adapter-else-generic-with-
      template" routing and the design-gating rule.
- [ ] `references/job-boards.md` registry created: per board — id, category
      (general / design / remote), search-URL template with `<keywords>`/`<location>`
      placeholders, login URL (or "none"), and access notes.
- [ ] Existing example fixtures still validate; `npm run check` passes.

## Implementation Notes **[CONDITIONAL: Technical Task]**

Categories: general = linkedin, indeed, glassdoor, ziprecruiter, google-jobs, monster,
careerbuilder, wellfound; design = dribbble, behance, aiga, coroflot,
working-not-working, authentic-jobs, authentic-jobs; remote = we-work-remotely, remoteok.
Access notes to capture: google-jobs (aggregator, links out, unstable ids → hash id),
wellfound (account/profile required), working-not-working (curated/invite membership),
behance (Adobe ID login), aiga (some detail membership-gated), dribbble (login to apply),
we-work-remotely/remoteok (remote-only, browse without login).

### Recommended Agent

opus + high (orchestrator-owned) — load-bearing contract change consumed by two parallel
downstream tasks.

## Status Updates **[REQUIRED]**

*To be added during implementation*
