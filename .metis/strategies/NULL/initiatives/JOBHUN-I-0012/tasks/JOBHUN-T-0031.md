---
id: document-resume-prefs-json-in-the
level: task
title: "Document resume-prefs.json in the data contract"
short_code: "JOBHUN-T-0031"
created_at: 2026-08-04T18:42:02.892422+00:00
updated_at: 2026-08-04T18:42:02.892422+00:00
parent: JOBHUN-I-0012
blocked_by: [JOBHUN-T-0030]
archived: false

tags:
  - "#task"
  - "#phase/todo"


exit_criteria_met: false
strategy_id: NULL
initiative_id: JOBHUN-I-0012
---

# Document resume-prefs.json in the data contract

## Parent Initiative **[CONDITIONAL: Assigned Task]**

[[JOBHUN-I-0012]]

## Objective **[REQUIRED]**

Extend `references/data-contract.md` to document the new `resume-prefs.json` file: add it to
the working-folder layout diagram (plus the `resume/tailored/<job-id>.<ext>` output dir),
add a section covering its fields, the edit-type taxonomy, the tally update rules, and the
"not a validity marker" note.

## Acceptance Criteria **[REQUIRED]**

- [ ] The working-folder layout diagram in `references/data-contract.md` includes
      `resume-prefs.json` and the `resume/tailored/` directory.
- [ ] A new `resume-prefs.json` section documents every field, referencing (not restating)
      the schema as the machine contract, with the "schema wins on disagreement" convention.
- [ ] The section documents the tally update rules: how `accepted` / `accepted_with_edits` /
      `rejected` change on each review decision, and how `skills` / `disclaimed_skills` grow
      from user yes/no answers.
- [ ] The section states `resume-prefs.json` is NOT part of the working-folder validity
      marker (that remains `config.json`); its absence just means no learning yet.
- [ ] Markdown lints clean; `npm run check` green.

## Implementation Notes **[CONDITIONAL: Technical Task]**

### Technical Approach
Mirror the structure of the existing `profile.json` / `config.json` sections in
`data-contract.md` (a fields table + prose). Keep the edit-type enum authoritative in the
schema; the prose lists the seven types with one-line meanings but points to the schema.

### Dependencies
Blocked by [[JOBHUN-T-0030]] (documents the schema authored there).

### Recommended Agent
**sonnet + medium** — single-file prose following the schema. Execution via **codex**
headless agent under supervision.

### Verification
- `npm run check` green.
- Read-through confirms the layout diagram, fields, taxonomy pointer, tally rules, and
  validity-marker note are all present.

## Status Updates **[REQUIRED]**

*To be added during implementation*
