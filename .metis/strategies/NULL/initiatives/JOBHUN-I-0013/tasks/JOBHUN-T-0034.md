---
id: validate-register-tailor-resume
level: task
title: "Validate + register tailor-resume; npm run check green"
short_code: "JOBHUN-T-0034"
created_at: 2026-08-04T18:53:40.554704+00:00
updated_at: 2026-08-04T19:01:43.151772+00:00
parent: JOBHUN-I-0013
blocked_by: [JOBHUN-T-0033]
archived: false

tags:
  - "#task"
  - "#phase/completed"


exit_criteria_met: false
strategy_id: NULL
initiative_id: JOBHUN-I-0013
---

# Validate + register tailor-resume

## Parent Initiative **[CONDITIONAL: Assigned Task]**

[[JOBHUN-I-0013]]

## Objective **[REQUIRED]**

Ensure the new `tailor-resume` skill and its reference docs pass all repo guardrails and are
registered wherever skills are indexed, and that the whole `npm run check` suite is green.

## Acceptance Criteria

## Acceptance Criteria

## Acceptance Criteria **[REQUIRED]**

- [ ] `scripts/validate-skills.mjs` reports `tailor-resume` valid (correct frontmatter, file
      layout).
- [ ] Any README/AGENTS skill listing that enumerates skills includes `tailor-resume` (if such
      a listing exists; otherwise note none exists).
- [ ] `npm run check` passes with zero errors (plugin, schemas, skills, eslint, markdownlint,
      prettier).
- [ ] An example of the call envelope is documented (in the SKILL.md or a reference) so the
      I-0014 wiring has a concrete contract to call.

## Implementation Notes **[CONDITIONAL: Technical Task]**

### Technical Approach
Mechanical cleanup pass after the skill exists: run the validators, fix any lint/format nits,
add the skill to any enumerations, confirm the envelope example is present.

### Dependencies
Blocked by JOBHUN-T-0033.

### Recommended Agent
**sonnet + medium** — mechanical once the skill exists. Execution: **codex** headless (or
folded into the same claude worktree agent if convenient).

### Verification
- `npm run check` green end to end.

## Status Updates **[REQUIRED]**

*To be added during implementation*