---
id: update-setup-site-selection-and
level: task
title: "Update setup site selection and preflight for new boards"
short_code: "JOBHUN-T-0017"
created_at: 2026-07-31T02:36:05.469904+00:00
updated_at: 2026-07-31T02:44:47.467218+00:00
parent: JOBHUN-I-0006
blocked_by: [JOBHUN-T-0015]
archived: false

tags:
  - "#task"
  - "#phase/completed"


exit_criteria_met: false
strategy_id: NULL
initiative_id: JOBHUN-I-0006
---

# Update setup site selection and preflight for new boards

## Parent Initiative **[CONDITIONAL: Assigned Task]**

[[JOBHUN-I-0006]]

## Objective **[REQUIRED]**

Update `skills/job-hunter-setup/SKILL.md` and `references/browser-preflight.md` so setup
offers the expanded board set (registry-driven), applies design-gating, and preflights
logins for the chosen boards using per-board login URLs and access notes.

## Acceptance Criteria

## Acceptance Criteria

## Acceptance Criteria **[REQUIRED]**

- [ ] Setup determines `config.sites` from the registry `references/job-boards.md`: offer
      general boards by default; offer remote boards only when the remote preference is
      `remote`/`both`; offer design boards ONLY after the resume is added and the resume/
      job-focus (from Step 8) indicates design/creative relevance. Record the chosen ids
      in `config.sites` (all valid against the extended enum).
- [ ] The design-gating decision references the resume-analysis result from setup Step 8
      (do not offer design boards before the resume is analyzed).
- [ ] `references/browser-preflight.md` is generalized to preflight ANY board in the
      target list using the registry's login URL and access notes (not just the original
      three). Boards with `login: none` (e.g. remote boards, google-jobs) skip the login
      check; boards with access quirks (invite/curated, third-party login) surface the
      note and let the user proceed-if-they-have-access or skip.
- [ ] Setup's preflight step runs against the (possibly expanded) `config.sites`.
- [ ] `npm run check` passes.

## Implementation Notes **[CONDITIONAL: Technical Task]**

Read `AGENTS.md`, `references/job-boards.md`, `references/data-contract.md`, the current
`skills/job-hunter-setup/SKILL.md`, and `references/browser-preflight.md`. Edit only
`skills/job-hunter-setup/SKILL.md` and `references/browser-preflight.md`. Keep board
specifics in the registry; the skill/preflight iterate over it. Preserve the existing
step ordering and update-mode behavior.

### Recommended Agent

opus + medium — careful edits to the setup wizard and the shared preflight, both
load-bearing.

## Status Updates **[REQUIRED]**

*To be added during implementation*