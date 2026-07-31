---
id: build-review-resume-skill
level: task
title: "Build review-resume skill"
short_code: "JOBHUN-T-0011"
created_at: 2026-07-31T00:42:22.295660+00:00
updated_at: 2026-07-31T00:48:12.442518+00:00
parent: JOBHUN-I-0005
blocked_by: []
archived: false

tags:
  - "#task"
  - "#phase/completed"


exit_criteria_met: false
strategy_id: NULL
initiative_id: JOBHUN-I-0005
---

# Build review-resume skill

## Parent Initiative **[CONDITIONAL: Assigned Task]**

[[JOBHUN-I-0005]]

## Objective **[REQUIRED]**

Build `review-resume`: a read-only maintenance skill that re-reads the current
resume variant(s) in the working folder and reports the applicant's inferred skills and
likely target job types, then optionally hands off to `update-job-focus`.

## Acceptance Criteria

## Acceptance Criteria

## Acceptance Criteria **[REQUIRED]**

- [ ] `skills/review-resume/SKILL.md` exists (`name: review-resume`), description
      triggering on "review my resume" / "review resume".
- [ ] Gate: requires a valid working folder (`config.json`); if absent, tell the user to
      run `job-hunter-setup` and stop.
- [ ] Reuses the resume-analysis procedure in
      `skills/job-hunter-setup/references/resume-analysis.md` (cite it; do not duplicate)
      to read the resume file(s) from `resume/` and summarize skills + likely job types.
- [ ] Read-only: it MUST NOT modify any working-folder file.
- [ ] Offers to hand off to `update-job-focus` if the user wants to act on the summary.
- [ ] `npm run check` passes.

## Implementation Notes **[CONDITIONAL: Technical Task]**

### Technical Approach

Read `AGENTS.md`, `references/data-contract.md`,
`skills/job-hunter-setup/references/resume-analysis.md`, and
`skills/job-hunter-setup/SKILL.md` (for gate/style). Instruction file. Keep it thin —
the analysis logic lives in the shared helper.

### Dependencies

Reuses the setup wizard's resume-analysis helper (on `main`). Independent of the other
two maintenance tasks — safe to build in parallel.

### Risk Considerations

Risk: accidental writes → state explicitly this skill is read-only.

### Recommended Agent

sonnet + medium — single focused skill reusing an existing helper; the reasoning is
already defined in the analysis helper.

## Status Updates **[REQUIRED]**

*To be added during implementation*