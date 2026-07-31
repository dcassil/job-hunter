---
id: build-update-job-focus-skill
level: task
title: "Build update-job-focus skill"
short_code: "JOBHUN-T-0012"
created_at: 2026-07-31T00:42:27.669001+00:00
updated_at: 2026-07-31T00:42:27.669001+00:00
parent: JOBHUN-I-0005
blocked_by: []
archived: false

tags:
  - "#task"
  - "#phase/todo"


exit_criteria_met: false
strategy_id: NULL
initiative_id: JOBHUN-I-0005
---

# Build update-job-focus skill

## Parent Initiative **[CONDITIONAL: Assigned Task]**

[[JOBHUN-I-0005]]

## Objective **[REQUIRED]**

Build `update-job-focus`: a maintenance skill to view and edit `job-focus.md` (the
target job types / search guidance), optionally using a resume re-analysis to suggest
changes.

## Acceptance Criteria **[REQUIRED]**

- [ ] `skills/update-job-focus/SKILL.md` exists (`name: update-job-focus`), description
      triggering on "update the kind of jobs I'm looking for" / "update job focus".
- [ ] Gate: requires a valid working folder (`config.json`); if absent, tell the user to
      run `job-hunter-setup` and stop.
- [ ] Load → show current `job-focus.md` → let the user add/remove/adjust entries →
      confirm → write back. Confirm before writing.
- [ ] Optionally offers a resume-based suggestion by reusing
      `skills/job-hunter-setup/references/resume-analysis.md` (cite; do not duplicate).
- [ ] Only writes `job-focus.md`; touches no other state file.
- [ ] `npm run check` passes.

## Implementation Notes **[CONDITIONAL: Technical Task]**

### Technical Approach

Read `AGENTS.md`, `references/data-contract.md` (job-focus.md section),
`skills/job-hunter-setup/references/resume-analysis.md`, and
`skills/job-hunter-setup/SKILL.md` (gate/style). Instruction file. `job-focus.md` is
free-form prose — no schema — so this is a straightforward load/edit/confirm/write cycle.

### Dependencies

Reuses the resume-analysis helper (on `main`). Independent of the other two maintenance
tasks — safe to build in parallel.

### Risk Considerations

Risk: clobbering the user's prose → show current content and confirm before overwriting.

### Recommended Agent

sonnet + medium — single-file editor with a clear pattern.

## Status Updates **[REQUIRED]**

*To be added during implementation*
