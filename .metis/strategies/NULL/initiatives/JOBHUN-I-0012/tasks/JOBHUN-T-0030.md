---
id: author-resume-prefs-schema-example
level: task
title: "Author resume-prefs schema + example + validator wiring"
short_code: "JOBHUN-T-0030"
created_at: 2026-08-04T18:42:01.695578+00:00
updated_at: 2026-08-04T18:42:01.695578+00:00
parent: JOBHUN-I-0012
blocked_by: []
archived: false

tags:
  - "#task"
  - "#phase/todo"


exit_criteria_met: false
strategy_id: NULL
initiative_id: JOBHUN-I-0012
---

# Author resume-prefs schema + example + validator wiring

## Parent Initiative **[CONDITIONAL: Assigned Task]**

[[JOBHUN-I-0012]]

## Objective **[REQUIRED]**

Add `schemas/resume-prefs.schema.json` defining the new working-folder learning file
(`skills`, `disclaimed_skills`, `variants[*].ats_fixed`, `edit_prefs` keyed by the closed
edit-type enum), a worked `schemas/examples/resume-prefs.example.json` that validates, and
extend `scripts/validate-schemas.mjs` to cover both. This is the substrate JOBHUN-I-0013
reads and writes.

## Acceptance Criteria **[REQUIRED]**

- [ ] `schemas/resume-prefs.schema.json` (draft-07) matches the shape in the initiative's
      Detailed Design: top-level `additionalProperties:false`; required `skills` (string[])
      and `edit_prefs`; optional `disclaimed_skills` (string[]) and `variants` (map of
      variant-id → `{ ats_fixed: boolean }`, `additionalProperties:false` on the inner object).
- [ ] `edit_prefs` is `additionalProperties:false` with exactly the seven keys `skill_add`,
      `term_swap`, `bullet_rewrite`, `bullet_add`, `entry_rewrite`, `summary_rewrite`,
      `reorder`, each a `tally` (`accepted`, `accepted_with_edits`, `rejected` — integers ≥ 0),
      defined once via `$defs`/`definitions`.
- [ ] `schemas/examples/resume-prefs.example.json` is realistic and validates against the
      schema.
- [ ] `scripts/validate-schemas.mjs` validates the new schema loads and the example passes,
      consistent with how it handles config/profile/jobs schemas.
- [ ] `npm run check` green.

## Implementation Notes **[CONDITIONAL: Technical Task]**

### Technical Approach
Copy the style of `schemas/profile.schema.json` (draft-07, `$schema`, `$id`, `title`,
`additionalProperties:false`). Read `scripts/validate-schemas.mjs` to match its registration
pattern (it iterates schema+example pairs). The edit-type enum lives ONLY here — prose refers
to it, never restates it.

### Dependencies
None. Blocks JOBHUN-T-0031 (data-contract prose follows this schema) and JOBHUN-I-0013.

### Recommended Agent
**opus + high** — schema design other tasks consume; a wrong shape forces rework across
I-0013/I-0014. Execution via **codex** headless agent under supervision; review the schema
diff carefully before merge.

### Verification
- `node scripts/validate-schemas.mjs` (via `npm run check`) passes with the new pair.
- Deliberately break the example locally to confirm the validator catches it (then revert).

## Status Updates **[REQUIRED]**

*To be added during implementation*
